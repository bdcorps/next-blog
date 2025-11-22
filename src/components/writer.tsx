"use client"

import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCancelBackgroundTask, useDeleteEditorialPage, useEditorialPage, useInternalLinks, usePublishEditorialPage, usePublishWebflowPost, useSite, useTeamMembers, useUpdateEditorialPage } from "@/hooks/api";
import { useToast } from "@/hooks/use-toast";
import { useLeavePageConfirmation } from "@/hooks/useLeavePageConfirmation";
import useLocalStorage from "@/hooks/useLocalStorage";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import EngyneButton from "@/new-components/Button";
import { useEditorSidebarStore, useWriterStore } from "@/store";
import { ContentType } from "@/types";
import { encodeSlug } from "@/utils";
import { BACKGROUND_TASK_STATUS, POST_STATUS, POST_STATUS_DEFINITIONS, ROLES, SIDEBAR_DEFINITIONS, SIDEBAR_TABS } from "@/utils/constants";
import { convertMarkdownToHTML, getSiteDomain } from "@/utils/server";
import { useEditor } from "@tiptap/react";
import { useCompletion } from "ai/react";
import debounce from "debounce";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Baseline, Bold, ChevronDown, CodeXml, ExternalLink, Globe, Heading2, Heading3, ImageIcon, Italic, List, ListOrdered, MoreVertical, Quote, Send, Strikethrough } from "lucide-react";
import Image from "next/image";
import router from "next/router";
import { FC, FunctionComponent, useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import { AlertButton } from "../AlertButton";
import AutoResizeTextarea from "../AutoResizeTextArea";
import Loading from "../Loading";
import TipTap from "../TipTap";
import { TiptapExtensions } from "../TipTap/extensions";
import { TiptapEditorProps } from "../TipTap/props";
import AIWritingModalV2 from "./ai-writing-modal-v2";
// import AIWritingModalV2 from "./AIWritingModalV2";
// import ChatPanel2 from "./ChatPanel2";
// import CustomizationPanel from "./CustomizationPanel";
// import PerformancePanel from "./PerformancePanel";
// import PostVersionsModal from "./PostVersionsModal";
// import { PublishingScreen } from "./PublishingScreen";

interface EditorialBuilderProps {
  pageId: string;
  subdomain: string;
}

const EditorialBuilder: FunctionComponent<EditorialBuilderProps> = ({ pageId, subdomain }) => {
  const { toast } = useToast();
  const { data: page, isLoading: isPageLoading } = useEditorialPage({ pageId });
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [curPage, setCurPage] = useState<any>({ content: [], contentHTML: "", draftHTML: "", seoTitle: "", seoDescription: "", seoImage: "", slug: "" })

  const [isPublishing, setIsPublishing] = useState<boolean>(false)
  const [isSaveCollectionMessageVisible, setIsSaveCollectionMessageVisible] =
    useState<boolean>(false);
  const [isPageChangeDirty, setIsPageChangeDirty] = useState(false)

  const postId: string = router.query.pageId as string;

  const { mutate: deleteEditorialPageMutation, isSuccess: deleteEditorialPageSuccess } = useDeleteEditorialPage();

  const { mutate: updateEditorialPageMutation, isLoading: isUpdateEditorialPageLoading } =
    useUpdateEditorialPage();


  const { mutate: publishWebflowPostMutation, isLoading: isPublishWebflowPostLoading } = usePublishWebflowPost()

  const [generationId, setGenerationId] = useState<string>("")
  const { data: site, isLoading: isSiteLoading } = useSite(subdomain);

  const { userPrefs, updateUserPrefs, upsertContentOutline } = useLocalStorage(subdomain)
  const setEditor = useWriterStore((state: any) => state.setEditor);
  const editor = useWriterStore((state: any) => state.editor);
  const setTitle = useWriterStore((state: any) => state.setTitle);
  const title = useWriterStore((state: any) => state.title);


  const [showPagePublishedModal, setShowPagePublishedModal] = useState(false)

  const savedContentOutline: string = userPrefs.contentOutlines[postId]
  const [contentOutline] = useState<string>(savedContentOutline)

  const {
    mutate: publishEditorialPageMutation,
    isLoading: isPublishEditorialPageLoading
  } = usePublishEditorialPage();

  const {
    mutate: cancelBackgroundTaskMutation,
    isLoading: isCancelBackgroundTaskLoading
  } = useCancelBackgroundTask();

  const [activeSidebarTab, setActiveSidebarTab] = useState<SIDEBAR_TABS>(SIDEBAR_TABS.NONE)

  const { data: teamMembersData, isLoading: isTeamMembersLoading } = useTeamMembers({ subdomain });

  const [showEmptyState, setShowEmptyState] = useState(true)
  const { activeProject } = useUser();

  const [firstBadOutputDone, setFirstBadOutputDone] = useState(false) // tiptap onUpdate gives <p><p> when you do a setcontent. This is bad because then the setcontent itself empties out the content to be saved. We use this flag to ignore the first bad output and register the rest.

  const [showWelcomeMessage, setShowWelcomeMessage] = useState(true)
  useEffect(() => {
    upsertContentOutline({ postId, text: contentOutline })
  }, [contentOutline])

  useLeavePageConfirmation({ notSaved: isPageChangeDirty });

  const getPostStatus = () => {
    if (!!curPage.setForReviewOn) {
      return POST_STATUS.IN_REVIEW
    }
    else if (!!curPage.publishedOn) {
      return POST_STATUS.PUBLISHED
    }
    else {
      return POST_STATUS.DRAFT
    }
  }

  const postStatus = getPostStatus()

  const tiptapEditor = useEditor({
    editorProps: TiptapEditorProps,
    onUpdate: ({ editor, transaction }: any) => {
      const { selection } = editor.state;
      const html = editor.getHTML();

      if (!firstBadOutputDone && html === "<p></p>") {
        setFirstBadOutputDone(true)
        return;
      }

      setCurPage((curPage: any) => ({ ...curPage, draftHTML: html }))

      // https://github.com/ueberdosis/tiptap/discussions/2264
      var textarea = document.getElementById("editor")!;
      if (!selection.empty) {
        // Do not scroll into view when we're doing a mass update (e.g. underlining text)
        // We only want the scrolling to happen during actual user input
        return;
      }

      if (textarea) {
        const viewportCoords = editor.view.coordsAtPos(selection.from);
        const absoluteOffset = textarea.scrollTop + viewportCoords.top;

        textarea.scrollTo({
          top: absoluteOffset - (textarea.clientHeight / 2),
          behavior: 'smooth'
        });
      }
    },
    extensions: TiptapExtensions,
    content: "",
  })

  useEffect(() => {
    if (!editor) {
      setEditor(tiptapEditor)
    }
  }, [tiptapEditor])

  const getUserPublishPermissions = () => {
    const postStatus = getPostStatus()

    // if already published, don't allow to publish
    if (postStatus === POST_STATUS.PUBLISHED) return { canPublish: false, message: "Post is already published" };

    if (activeProject.role === ROLES.ADMIN || activeProject.role === ROLES.EDITOR) {
      return { canPublish: true, message: "" }
    }
    else {
      // the user is a WRITER
      return { canPublish: !!curPage.reviewedOn, message: "This post needs to be reviewed before it can be published." }
    }
  }

  const canReviewPost = () => {
    // if already published, don't allow to review
    if (postStatus !== POST_STATUS.DRAFT) return false;

    return true;
  }

  const canReview = canReviewPost()
  const canPublish = getUserPublishPermissions()

  const {
    completion,
    stop: stopWritingBlogPost,
    isLoading: isBlogPostLoading,
    complete,
    setCompletion
  } = useCompletion({
    api: '/api/editorial/write-post-vercel',
    onFinish: (_: string, completion: string) => {
      // saveCompletionAsTextNode(completion)
    }
  })

  const {
    completion: introCompletion,
    stop: stopIntroCompletion,
    isLoading: isIntroLoading,
    complete: introComplete,
    setCompletion: setIntroCompletion
  } = useCompletion({
    api: '/api/editorial/write-intro-vercel',
    onFinish: (_: string, completion: string) => {
      // saveCompletionAsTextNode(completion)
    }
  })

  useEffect(() => {
    if (!tiptapEditor) return;
    if (!isIntroLoading && !isBlogPostLoading) {
      saveCompletionAsTextNode(introCompletion)
      saveCompletionAsTextNode(completion)
      setIntroCompletion("")
      setCompletion("")
    }
  }, [tiptapEditor, isBlogPostLoading, isIntroLoading, introCompletion, completion])

  useEffect(() => {
    if (isUpdateEditorialPageLoading) {
      setIsSaveCollectionMessageVisible(true);
      setTimeout(() => {
        setIsSaveCollectionMessageVisible(false);
      }, 1000);
    }
  }, [isUpdateEditorialPageLoading]);

  useEffect(() => {
    if (!page) return;
    setCurPage(page)
    setTitle(page.seoTitle)

    // if (page.contentHTML.length > 0) {
    //   setActiveSidebarTab(SIDEBAR_TABS.PERFORMANCE)
    // }

    if (page.length > 0) {
      setShowWelcomeMessage(false)
    } else {
      setShowWelcomeMessage(true)
    }
  }, [page])

  const onSave = async ({ shouldRefetch = false }: { shouldRefetch?: boolean }) => {
    if (!postId || !curPage.slug || !curPage.draftHTML) return;
    const updatedPage = { ...curPage }
    delete updatedPage.tag;
    delete updatedPage.author;
    delete updatedPage.versions;
    delete updatedPage.bgTaskId;
    delete updatedPage.bgTaskStatus;
    // remove tags because it's a relation and we handle it separately

    await updateEditorialPageMutation({
      id: postId,
      data: {
        ...updatedPage
      }
    })
    setIsPageChangeDirty(false);
  }

  useEffect(() => {
    const debouncedSave = debounce(() => {
      onSave({ shouldRefetch: true });
    }, 1000);

    setIsPageChangeDirty(true);
    debouncedSave();

    return () => {
      debouncedSave.clear();
    };

  }, [curPage, curPage.slug, curPage.content, curPage.draftHTML, curPage.seoTitle, curPage.seoDescription, curPage.seoImage]);

  // useEffect(() => {
  //   onSave({ shouldRefetch: false })
  // }, [curPage.publisedOn]);

  // useHotkeys("backspace", () => {
  //   if (curPage.draftHTML === "<p></p>") {
  //     setShowEmptyState(true)
  //   }
  // })

  const onSetForDraft = async () => {
    publishEditorialPageMutation({ id: postId, shouldRefetch: true, data: { status: POST_STATUS.DRAFT } })
  }

  const onSetForReview = async () => {
    publishEditorialPageMutation({ id: postId, shouldRefetch: true, data: { status: POST_STATUS.IN_REVIEW } })
  }

  const onUpdatePage = (data: any) => {
    setCurPage({ ...curPage, ...data });
  }

  useLeavePageConfirmation({ notSaved: isPageChangeDirty });

  const saveCompletionAsTextNode = (data: string) => {
    if (!tiptapEditor) return;
    const html = convertMarkdownToHTML(data)
    tiptapEditor.commands.insertContent(html, {
      parseOptions: {
        // preserveWhitespace: true,
      }
    })
  }

  const handleChangeSidebarTab = (tab: SIDEBAR_TABS) => {
    if (activeSidebarTab === tab) {
      setActiveSidebarTab(SIDEBAR_TABS.NONE)
    } else {
      setActiveSidebarTab(tab)
    }
  }

  // const renderSidebarPanels = () => {
  //   const showSidebarPanel = activeSidebarTab !== SIDEBAR_TABS.NONE
  //   const activeSidebarDefinition = SIDEBAR_DEFINITIONS.find((tab) => tab.id === activeSidebarTab)

  //   return <div className="flex h-full items-start justify-start bg-transparent">
  //     <AnimatePresence>
  //       {showSidebarPanel && <motion.div
  //         initial={{ width: 0 }}
  //         animate={{ width: 340 }}
  //         exit={{ width: 0 }}
  //         transition={{ duration: 0.2, ease: "easeInOut" }}
  //         className="h-full border-l border-gray-100 overflow-hidden">
  //         <div className="flex h-full w-[340px] flex-col gap-4 overflow-y-scroll p-4">
  //           {
  //             activeSidebarTab === SIDEBAR_TABS.PERFORMANCE && <PerformancePanel draftHTML={curPage.draftHTML} funnelStage={curPage.funnelStage} subdomain={site.subdomain} website={site.website} seoTitle={curPage.seoTitle} seoDescription={curPage.seoDescription} site={site} focusKeyword={curPage.focusKeyword} onUpdatePage={onUpdatePage} />
  //           }
  //           {
  //             activeSidebarTab === SIDEBAR_TABS.CUSTOMIZATION && <CustomizationPanel subdomain={subdomain} post={curPage} onUpdatePage={onUpdatePage} />
  //           }
  //           {
  //             activeSidebarTab === SIDEBAR_TABS.CHAT && <ChatPanel2 title={curPage.seoTitle} postId={curPage.id} />
  //           }
  //         </div>
  //       </motion.div>}
  //     </AnimatePresence>

  //     <div className="z-10 flex h-full w-12 flex-col items-center border-l border-gray-200 bg-white divide-y divide-gray-200">
  //       {
  //         SIDEBAR_DEFINITIONS.map((tab) => {
  //           return <SidebarTab key={tab.id} id={tab.id} onChangeSidebarTab={handleChangeSidebarTab} isActive={activeSidebarTab === tab.id} />
  //         })
  //       }
  //     </div>
  //   </div>
  // }

  const handleGenerateBlog = async ({ contentDraft, docIds, additionalInstructions, subdomain, editorialPageIds, personalStory, brandVoice }: { contentDraft: string, docIds: string[], additionalInstructions: string, subdomain: string, editorialPageIds: string[], personalStory: string, brandVoice: string }) => {
    if (!curPage.seoTitle) {
      toast({
        title: "SEO Title not set",
        description: `Please set SEO Title in SEO before generating blog post`,
        variant: "destructive",
      });
    }

    const generationId = uuid()
    setGenerationId(generationId)
    complete("", {
      body: {
        title: curPage.seoTitle, contentDraft, docIds, additionalInstructions, subdomain, type: ContentType.EDITORIAL,
        generationId, editorialPageIds, personalStory, brandVoice
      }
    })

    introComplete("", {
      body: {
        title: curPage.seoTitle, contentDraft, docIds, additionalInstructions, subdomain, type: ContentType.EDITORIAL,
        generationId, editorialPageIds, personalStory, brandVoice
      }
    })
  }

  if (!curPage || !site || !page) {
    return <Loading />
  }

  const saveStatus = isPageChangeDirty ? "Unsaved" : (isSaveCollectionMessageVisible ? "Saving..." : "Saved")

  const isSlugPrefixCorrect = !!site.subfolderPrefix ? curPage.slug.startsWith(site.subfolderPrefix + "/") : true

  return (
    <TooltipProvider>
      <AppLayout showDrawer={false} showHeader={false}>
        {!isPublishing ? <>
          {generationId && <AIWritingModalV2 id={generationId} generatedTextLength={completion.split(" ").length} isCurrentlyWriting={isBlogPostLoading} stopWriting={stopWritingBlogPost} />}
          <div className="flex w-full flex-col gap-4 px-6 pt-2">
            <div className="flex w-full items-center gap-4">
              <div className={cn("flex items-center gap-0", isPageChangeDirty ? "text-gray-300" : "text-gray-600")}>
                <Button
                  disabled={isPageChangeDirty}
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    await onSave({})
                    router.push(`/${subdomain}/write`);
                  }}
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className={cn("font-medium", isPageChangeDirty ? "text-gray-300" : "text-gray-600")}>Posts</span>
              </div>

              <span className="text-sm text-gray-500">
                {saveStatus}
              </span>

              {/* <PostVersionsModal postId={page.id} /> */}
              <div className="flex-1" />
              <div className="flex h-8 w-[500px] items-center gap-2 rounded-full bg-gray-100 px-3 py-0.5">
                <Input
                  className="h-auto border-0 bg-transparent p-0 text-base text-gray-600 outline-none focus-visible:ring-0"
                  value={curPage.slug}
                  onChange={(evt) => {
                    onUpdatePage({ slug: evt.target.value })
                  }}
                  onBlur={() => {
                    let formattedSlug = encodeSlug(curPage.slug);

                    if (!formattedSlug.startsWith("/")) {
                      formattedSlug = "/" + formattedSlug
                    }

                    onUpdatePage({ slug: formattedSlug })
                  }}
                />

                <div className="flex-1" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Preview your post"
                      onClick={() => {
                        const previewURL = postStatus === POST_STATUS.PUBLISHED ? `${getSiteDomain(site)}${curPage.slug}` : `https://${subdomain}.engyne.page/preview/${curPage.id}`
                        window.open(
                          previewURL, "_blank"
                        );
                      }}
                      className="cursor-pointer"
                    >
                      {isSlugPrefixCorrect ? <ExternalLink className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4 text-orange-500" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isSlugPrefixCorrect ? "Preview your post" : `Blog post slug should start with ${site.subfolderPrefix}/`}
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex-1" />
              <div className="flex items-center gap-4">
                <div className="flex w-full items-center gap-2">
                  {site.prismicAPIKey && <Tooltip>
                    <TooltipTrigger asChild>
                      <Image width={24} height={24} src="/prismic.jpeg" alt="Prismic" className="rounded-full" />
                    </TooltipTrigger>
                    <TooltipContent>Prismic connected</TooltipContent>
                  </Tooltip>}
                  {site.wfAPIKey && site.wfSiteId && site.wfCollectionId && <Tooltip>
                    <TooltipTrigger asChild>
                      <Image width={24} height={24} src="/webflow.png" alt="Webflow" />
                    </TooltipTrigger>
                    <TooltipContent>Webflow CMS connected</TooltipContent>
                  </Tooltip>}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={isPublishEditorialPageLoading}>
                        {POST_STATUS_DEFINITIONS[postStatus].label}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="z-50">
                      <DropdownMenuItem onClick={onSetForDraft} disabled={postStatus === POST_STATUS.DRAFT}>Draft</DropdownMenuItem>
                      <DropdownMenuItem onClick={onSetForReview} disabled={!canReview}>In Review</DropdownMenuItem>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div>
                            <DropdownMenuItem
                              onClick={() => {
                                setIsPublishModalOpen(true)
                              }}
                              disabled={!canPublish?.canPublish}
                            >
                              Publish
                            </DropdownMenuItem>
                          </div>
                        </TooltipTrigger>
                        {canPublish?.message && <TooltipContent>{canPublish.message}</TooltipContent>}
                      </Tooltip>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <EngyneButton variant="primary" icon={!!curPage.publishedOn ? <Send className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                    isDisabled={(curPage.draftHTML === curPage.contentHTML && postStatus === POST_STATUS.PUBLISHED)}
                    onClick={() => {
                      setIsPublishing(true)
                    }}>{!!curPage.publishedOn ? "Update" : "Publish"}</EngyneButton>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="z-50">
                      <AlertButton onSuccessAction={() => { deleteEditorialPageMutation({ id: postId, redirectUrl: `/${subdomain}` }) }} label="Delete" size="sm" className="w-full" />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {
            page.bgTaskId && (page.bgTaskStatus === BACKGROUND_TASK_STATUS.CREATED || page.bgTaskStatus === BACKGROUND_TASK_STATUS.IN_PROGRESS) ? <div className="flex h-screen w-full flex-col items-center justify-center gap-4 py-1">
              <div className="flex w-[400px] flex-col items-center justify-center text-center gap-4">
                <Spinner size="sm" />
                <span>Hang tight while we generate this post for you (~3 mins). Feel free to refresh page.</span>
                <Button variant="ghost" disabled={isCancelBackgroundTaskLoading} onClick={() => {
                  cancelBackgroundTaskMutation({ id: page.bgTaskId })
                }}>Cancel</Button>
              </div>
            </div> : <div className="flex h-full w-full gap-0 overflow-hidden">
              {(showWelcomeMessage && showEmptyState && !isBlogPostLoading && (!curPage.draftHTML || curPage.draftHTML === "<p></p>")) && <div className="flex h-full w-full items-start justify-center overflow-y-scroll bg-gray-100 px-4 pt-4">
                {/* {curPage.seoTitle && <PostCreationFlow title={curPage.seoTitle} postId={postId} subdomain={subdomain} onStartFromScratchClicked={() => {
                  setShowWelcomeMessage(false)
                }} outline={curPage.outline} />} */}
              </div>}

              <div className="flex h-full w-full items-center justify-center bg-gray-100 px-4 pt-4">
                <motion.div
                  className="page-animation"
                  style={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", maxWidth: "1024px" }}
                  initial={{ y: 100, rotateZ: -1.6 }}
                  animate={{ y: 0, rotateZ: 0 }}
                  transition={{ type: "spring", stiffness: 140, damping: 17 }}
                >
                  <div className="relative h-full w-full rounded-t-lg bg-white px-2">
                    <div className="relative h-full max-w-7xl bg-white px-3 pt-3">
                      {tiptapEditor && <div className="absolute left-0 top-0 z-10 w-full p-3"><MenuBar tiptapEditor={tiptapEditor} site={site} /></div>}
                      <div className="flex h-full w-full flex-col gap-6 overflow-y-scroll pt-6" id="editor">
                        <div className="flex w-full flex-col gap-0">
                          <AutoResizeTextarea
                            className="w-full border-0 text-3xl font-bold"
                            value={curPage.seoTitle}
                            onChange={(evt: any) => {
                              onUpdatePage({ seoTitle: evt.target.value })
                            }}
                            placeholder="Enter a title..."
                          />

                          <AutoResizeTextarea
                            className="w-full border-0 text-xl text-gray-600"
                            value={curPage.seoDescription}
                            onChange={(evt: any) => {
                              onUpdatePage({ seoDescription: evt.target.value })
                            }}
                            placeholder="What will your readers learn?"
                          />
                        </div>
                        <div className="h-px w-full bg-gray-200" />
                        <div className="w-full">
                          <TipTap id={1} value={curPage.draftHTML} tiptapEditor={tiptapEditor} />
                          <p className="whitespace-pre-wrap text-lg text-gray-600">{introCompletion}</p>
                          <p className="whitespace-pre-wrap text-lg text-gray-600">{completion}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
              {/* {renderSidebarPanels()} */}
            </div>
          }
        </> :
          <p>Publishing screen</p>
          // <PublishingScreen subdomain={subdomain} setIsPublishing={setIsPublishing} curPage={curPage} onPublish={async (additionalWFFields: any) => {
          //   await publishEditorialPageMutation({ id: postId, shouldRefetch: true, data: { status: POST_STATUS.PUBLISHED, additionalWFFields } })
          //   setIsPublishing(false)
          // }} />
        }
      </AppLayout>
    </TooltipProvider>
  );
};

const SidebarTab: FC<any> = ({ id, onChangeSidebarTab, isActive }: { id: SIDEBAR_TABS, onChangeSidebarTab: (id: SIDEBAR_TABS) => void, isActive: boolean }) => {
  const { getNotification } = useEditorSidebarStore()
  const shouldShowNotification = getNotification(id) || (getNotification(id) === undefined && id === SIDEBAR_TABS.PERFORMANCE) // always show notification light for performance tab at the start

  const tab = SIDEBAR_DEFINITIONS.find((tab) => tab.id === id)

  if (!tab) return null

  return (
    <div className="relative w-full">
      {shouldShowNotification && <NotificationBeacon />}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-12 w-full rounded-none", isActive && "bg-white")}
            aria-label={tab.label}
            onClick={() => { onChangeSidebarTab(id) }}
          >
            <tab.icon className={cn("h-5 w-5", isActive && "text-brand-500")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tab.label}</TooltipContent>
      </Tooltip>
    </div>
  )
}

const NotificationBeacon: FC<any> = () => {
  return (
    <div className="absolute right-0 top-0 z-10 h-4 w-4">
      <div className="absolute right-1 top-1 h-4 w-4 rounded-full bg-red-100" id="notification" />
      <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-400" />
    </div>
  )
}

const MenuBar = ({ tiptapEditor, site }: any) => {
  const selectedRange = useWriterStore((state: any) => state.selectedRange);
  const selectedText = useWriterStore((state: any) => state.selectedText);

  const canGenerateInternalLinks = selectedText && selectedText.split(" ").length > 5;
  const {
    mutate: getInternalLinksMutation,
    isLoading: isInternalLinksLoading,
    data: internalLinksData
  } = useInternalLinks();

  useEffect(() => {
    if (internalLinksData?.data && tiptapEditor) {
      try {
        if (selectedRange) {
          tiptapEditor
            .chain()
            .focus()
            .deleteRange(selectedRange)
            .run();
        }
        tiptapEditor.commands.insertContent(internalLinksData?.data, {
          parseOptions: {
            preserveWhitespace: true,
          }
        })
      } catch (e) {
      }
    }
  }, [internalLinksData])

  return (
    <div className="flex w-full items-start justify-start gap-1 bg-white pb-1 text-gray-600" id="menu-bar">
      <div className="flex items-start gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-gray-500"
              aria-label='Paragraph'
              onClick={() => tiptapEditor.chain().focus().setParagraph().run()}
              disabled={
                !tiptapEditor.can()
                  .chain()
                  .focus()
                  .setParagraph()
                  .run()
              }
            >
              <Baseline className={cn("h-[18px] w-[18px]", tiptapEditor.isActive("paragraph") && "text-brand-500")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Paragraph</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-gray-500"
              aria-label='Heading 2'
              onClick={() => tiptapEditor.chain().focus().toggleHeading({ level: 2 }).run()}
              disabled={
                !tiptapEditor.can()
                  .chain()
                  .focus()
                  .toggleHeading({ level: 2 })
                  .run()
              }
            >
              <Heading2 className={cn("h-[18px] w-[18px]", tiptapEditor.isActive('heading', { level: 2 }) && "text-brand-500")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Heading 2</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-gray-500"
              aria-label='Heading 3'
              onClick={() => tiptapEditor.chain().focus().toggleHeading({ level: 3 }).run()}
              disabled={
                !tiptapEditor.can()
                  .chain()
                  .focus()
                  .toggleHeading({ level: 3 })
                  .run()
              }
            >
              <Heading3 className={cn("h-[18px] w-[18px]", tiptapEditor.isActive('heading', { level: 3 }) && "text-brand-500")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Heading 3</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-start gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-gray-500"
              aria-label='Bold text'
              onClick={() => tiptapEditor.chain().focus().toggleBold().run()}
              disabled={
                !tiptapEditor.can()
                  .chain()
                  .focus()
                  .toggleBold()
                  .run()
              }
            >
              <Bold className={cn("h-[18px] w-[18px]", tiptapEditor.isActive('bold') && "text-brand-500")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bold</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-gray-500"
              aria-label='Italic text'
              onClick={() => tiptapEditor.chain().focus().toggleItalic().run()}
              disabled={
                !tiptapEditor.can()
                  .chain()
                  .focus()
                  .toggleItalic()
                  .run()
              }
            >
              <Italic className={cn("h-[18px] w-[18px]", tiptapEditor.isActive('italic') && "text-brand-500")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Italic</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-gray-500"
              aria-label='Strikethrough text'
              onClick={() => tiptapEditor.chain().focus().toggleStrike().run()}
              disabled={
                !tiptapEditor.can()
                  .chain()
                  .focus()
                  .toggleStrike()
                  .run()
              }
            >
              <Strikethrough className={cn("h-[18px] w-[18px]", tiptapEditor.isActive('strike') ? "text-brand-500" : "text-green-800")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Strikethrough</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-start gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-gray-500"
              aria-label='Numbered list'
              onClick={() => tiptapEditor.chain().focus().toggleOrderedList().run()}
              disabled={
                !tiptapEditor.can()
                  .chain()
                  .focus().toggleOrderedList().run()
              }
            >
              <ListOrdered className={cn("h-[18px] w-[18px]", tiptapEditor.isActive('orderedList') && "text-brand-500")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Numbered list</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-gray-500"
              aria-label='Bullet list'
              onClick={() => tiptapEditor.chain().focus().toggleBulletList().run()}
              disabled={
                !tiptapEditor.can()
                  .chain()
                  .focus().toggleBulletList().run()
              }
            >
              <List className={cn("h-[18px] w-[18px]", tiptapEditor.isActive('bulletList') && "text-brand-500")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bullet list</TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-start gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-gray-500"
              aria-label='Quote'
              onClick={() => {
                return tiptapEditor.chain().focus().toggleBlockquote().run()
              }}
              disabled={
                !tiptapEditor.can()
                  .chain()
                  .focus().toggleBlockquote().run()
              }
            >
              <Quote className={cn("h-[18px] w-[18px]", tiptapEditor.isActive('blockquote') && "text-brand-500")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Quote</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-gray-500"
              aria-label='Code block'
              onClick={() => tiptapEditor.chain().focus().toggleCodeBlock().run()}
              disabled={
                !tiptapEditor.can()
                  .chain()
                  .focus().toggleCodeBlock().run()
              }
            >
              <CodeXml className={cn("h-[18px] w-[18px]", tiptapEditor.isActive('codeBlock') && "text-brand-500")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Code block</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-md text-gray-500"
              aria-label='Image'
              onClick={() => tiptapEditor.chain().focus().setImage({ src: "" }).run()}
            >
              <ImageIcon className={cn("h-[18px] w-[18px]", tiptapEditor.isActive('image') && "text-brand-500")} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Image</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              disabled={!canGenerateInternalLinks || isInternalLinksLoading}
              onClick={async () => {
                await getInternalLinksMutation({ subdomain: site.subdomain, text: selectedText })
              }}
            >
              {isInternalLinksLoading ? "Loading..." : "Add Internal Links"}
            </Button>
          </TooltipTrigger>
          {!canGenerateInternalLinks && <TooltipContent>Select at least 5 words to generate internal links</TooltipContent>}
        </Tooltip>
      </div>

      <div className="flex-1" />

      {!site.contentStyle && <div className="flex w-full items-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-sm text-gray-600"
              aria-label="warning"
              onClick={() => {
                window.open(`/${site.subdomain}/settings?tab=general#:~:text=What%27s-,your%20brand%20voice,-%3F`, "_self")
              }}
            >
              <AlertTriangle className="h-[18px] w-[18px] text-orange-500" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Brand voice not set</TooltipContent>
        </Tooltip>
      </div>}
    </div>
  )
}

export default EditorialBuilder;
