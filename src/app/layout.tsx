import CustomHeader from "@/components/custom-header";
import '@/styles/globals.css';
import { Metadata } from "next";
import { Inter } from 'next/font/google';
import { Layout } from "nextra-theme-blog";
import 'nextra-theme-blog/style.css';
import { Head } from 'nextra/components';

export const metadata: Metadata = {
  title: 'Nextra Blog'
}

const bodyFont = Inter({
  subsets: ['latin', 'vietnamese'],
})

export default async function RootLayout({ children }) {
  return (
    <html
      // Not required, but good for SEO
      lang="en"
      // Required to be set
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning

      className={bodyFont.className}
    >
      <Head backgroundColor={{ dark: '#15120d', light: '#faf5e9' }} />
      <body className="min-h-screen">
        <Layout>
          <CustomHeader />
          {children}
        </Layout>
      </body>
    </html>
  )
}
