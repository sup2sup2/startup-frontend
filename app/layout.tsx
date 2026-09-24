import type { Metadata } from "next";
import "./globals.css";
import Script from "next/script"; // 🌟 다시 Next.js 전용 Script를 불러옵니다!

const kakaoMapKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;

export const metadata: Metadata = {
  title: "침수 방지 하수구 신고 앱",
  description: "막힌 하수구를 사진으로 신고하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        {/* 🌟 https://를 붙이고 맨 끝에 &autoload=false 를 추가했습니다! */}
        {kakaoMapKey && (
          <Script
            src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(kakaoMapKey)}&libraries=services,clusterer&autoload=false`}
            strategy="beforeInteractive"
          />
        )}
      </head>
      
      <body className="min-h-full flex flex-col">
        {children}
        {/* 🌟 개발 환경에서만 모바일 디버깅용 Eruda 표시 */}
        {process.env.NODE_ENV === "development" && (
          <>
            <Script src="https://cdn.jsdelivr.net/npm/eruda" strategy="afterInteractive" />
            <Script id="eruda-init" strategy="afterInteractive">
              {`window.eruda?.init();`}
            </Script>
          </>
        )}
      </body>
    </html>
    );
}
