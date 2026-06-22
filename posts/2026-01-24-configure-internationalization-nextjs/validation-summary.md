# Validation Summary: How to Configure Internationalization in Next.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js Pages Router i18n routing
- Next.js App Router internationalization
- Next.js Proxy
- next-intl
- React
- JavaScript Intl APIs
- JSON translation files

## Sources Consulted
- Next.js Pages Router internationalization guide: https://nextjs.org/docs/pages/guides/internationalization
- Next.js App Router internationalization guide: https://nextjs.org/docs/app/guides/internationalization
- Next.js Proxy file convention: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Next.js NextResponse API reference: https://nextjs.org/docs/app/api-reference/functions/next-response
- next-intl locale-based routing setup: https://next-intl.dev/docs/routing/setup
- next-intl request configuration: https://next-intl.dev/docs/usage/configuration
- next-intl Proxy / middleware documentation: https://next-intl.dev/docs/routing/middleware
- MDN Intl.DateTimeFormat reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat
- MDN Intl.RelativeTimeFormat reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/RelativeTimeFormat

## Issues Found
- The App Router routing examples used `middleware.js` and `export function middleware`, which is deprecated in current Next.js documentation. Updated the text and examples to use `proxy.js` and `export function proxy`.
- The App Router directory tree placed `middleware.js` and `i18n/` under `app/`, while the later imports expected root-level `i18n/`. Updated the tree to show root-level `proxy.js` and `i18n/`, and included the dictionary JSON files referenced by the loader.
- Two JSON translation examples contained `//` comments inside `json` code fences, which is invalid JSON. Removed the comments from the JSON blocks.
- The custom translation hook imported `useMemo` without using it. Removed the unused import so the example is cleaner and avoids lint failures in stricter projects.
- The `next-intl` request config example used the outdated `locale` callback argument and did not return `locale`. Updated it to use `requestLocale` and return both `locale` and `messages`.
- The `formatDate` helper merged `dateStyle` with `year`, `month`, and `day`, which can throw with `Intl.DateTimeFormat`. Updated the helper to avoid combining style shortcuts with component options.
- The SEO metadata example used `getDictionary` without importing it. Added the missing import.
- The overview diagram implied one fixed URL shape for all approaches. Reworded that node to the more accurate `Localized URLs`.

## Review Notes
The post is now technically valid against current Next.js and next-intl documentation. The manual Accept-Language parser is intentionally simple; production apps may prefer a locale negotiation library such as the approach shown in the official Next.js App Router guide or the built-in negotiation provided by next-intl.
