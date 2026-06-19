# Validation Summary: How to Fix 'Font Loading' Issues in Next.js

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Next.js
- `next/font/google`
- `next/font/local`
- Google Fonts
- Local web fonts
- CSS `font-display`
- Tailwind CSS
- Core Web Vitals / CLS
- TypeScript / TSX

## Sources Consulted
- Next.js Font API Reference: https://nextjs.org/docs/app/api-reference/components/font
- Next.js Font Optimization guide: https://nextjs.org/docs/app/getting-started/fonts
- Next.js built-in `next/font` migration/error documentation: https://nextjs.org/docs/messages/built-in-next-font
- MDN `font-display` descriptor reference: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@font-face/font-display
- Chrome Developers `font-display` explanation: https://developer.chrome.com/blog/font-display

## Issues Found
- The local font path guidance said to use a path from the project root. Next.js resolves `next/font/local` `src` paths relative to the file where `localFont` is called, so the wording was corrected.
- The layout-shift diagram claimed preloading produces "No Layout Shift." Next.js font optimization and size-adjusted fallbacks reduce layout shift, but preloading alone does not guarantee none, so the wording was changed to "Reduced Layout Shift."
- The variable font example used an array of individual weights for `Inter`. Next.js documents range strings such as `weight: '100 900'` or the default `'variable'` behavior for variable fonts, so the example was corrected.
- The subsetting section implied `next/font/google` can specify exact characters. The documented option is `subsets`, so the comment was corrected to refer only to needed subsets.
- The summary table was updated to match the corrected variable font guidance.

## Review Notes
The remaining examples match current Next.js guidance for using `next/font`, applying `className` or CSS variables, configuring Tailwind CSS v3 font families, and using documented `display`, `preload`, `fallback`, and `adjustFontFallback` options. The Tailwind config example is v3-style; current Next.js docs also show a Tailwind v4 `@theme inline` approach, but the existing v3 snippet is still technically valid for projects using Tailwind CSS v3.
