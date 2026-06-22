# Validation Summary: How to Prevent XSS Attacks in React Applications

## Status
validated

## Post Type
Guide / Tutorial (security best-practices guide with extensive code examples)

## Technologies Covered
- React (JSX auto-escaping, `dangerouslySetInnerHTML`, refs)
- DOMPurify (client- and server-side HTML sanitization via jsdom)
- Next.js (SSR, security headers, CSP)
- Express.js / helmet (security headers, CSP)
- zod (client-side schema validation)
- express-validator (server-side validation)
- react-markdown / remark-gfm, Tiptap (rich text)
- Content Security Policy, nonces
- Jest / React Testing Library (XSS payload testing)

## Sources Consulted
- OWASP XSS Prevention Cheat Sheet — https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- DOMPurify (cure53) docs & npm — https://github.com/cure53/DOMPurify / https://www.npmjs.com/package/dompurify
- npm `@types/dompurify` (deprecation notice) — https://www.npmjs.com/package/@types/dompurify
- OWASP Secure Headers Project (X-XSS-Protection guidance) — https://owasp.org/www-project-secure-headers/
- MDN X-XSS-Protection — https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-XSS-Protection
- MDN Content Security Policy — https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- React docs (dangerouslySetInnerHTML) — https://react.dev/reference/react-dom/components/common

## Issues Found
1. **Deprecated `@types/dompurify` install instruction** (Basic Setup section). The post recommended `npm install --save-dev @types/dompurify`. As of DOMPurify 3.2.0+, DOMPurify bundles its own TypeScript type definitions and the `@types/dompurify` package is officially deprecated. Replaced the line with a note that DOMPurify 3.2+ ships its own types and the separate package is no longer needed.
2. **Outdated `X-XSS-Protection` header value** (Next.js security headers example). The post set `X-XSS-Protection: 1; mode=block`. The legacy XSS Auditor this header controls is deprecated in modern browsers and OWASP now recommends disabling it with `0` (relying on CSP instead), since the filter itself can introduce vulnerabilities. Changed the value to `0` and added a clarifying comment.

## Review Notes
- The React character-escaping table is a reasonable simplification. The accompanying example output correctly shows `<`/`>` escaped while leaving single quotes intact in text content; the table lists `"`/`'` escaping which applies primarily to attribute contexts. Not technically wrong, but readers should understand it conveys the general principle rather than exact per-context behavior.
- `SAFE_URL_PATTERN` uses the `g` flag with `.match()` (not `.test()`), so it avoids the common `lastIndex` statefulness bug. Correct as written.
- Server-side DOMPurify usage (`const purify = DOMPurify(window)` with jsdom) is correct — the default export is a factory when called with a window object.
- `X-Frame-Options` is technically superseded by CSP `frame-ancestors` (which the post also sets), but including both for legacy-browser coverage is still standard and not incorrect.
- The base64 payload `eval(atob('YWxlcnQoJ1hTUycp'))` correctly decodes to `alert('XSS')`; CSS `expression()` reference is accurate as a legacy IE vector.
- Statistic "over 30% of all web application security issues ... in 2024" is a general claim that varies by source; left as-is since it is presented as illustrative context, not a precise cited figure.
