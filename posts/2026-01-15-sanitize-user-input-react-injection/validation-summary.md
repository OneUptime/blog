# Validation Summary: How to Sanitize User Input in React to Prevent Injection Attacks

## Status
validated

## Post Type
Tutorial / Security guide

## Technologies Covered
- React
- JSX escaping and `dangerouslySetInnerHTML`
- DOMPurify
- Zod
- Browser URL APIs
- Content Security Policy
- React Helmet
- Vitest and Testing Library
- OWASP XSS and SQL injection prevention concepts

## Sources Consulted
- React documentation: common DOM component props and `dangerouslySetInnerHTML` - https://react.dev/reference/react-dom/components/common
- DOMPurify README and configuration / hooks documentation - https://github.com/cure53/DOMPurify
- Zod API documentation - https://zod.dev/api
- Zod error customization documentation - https://zod.dev/error-customization
- Zod v4 changelog / migration notes - https://zod.dev/v4/changelog
- MDN Content Security Policy guide - https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
- MDN `Content-Security-Policy` header reference - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy
- MDN `URLSearchParams` documentation - https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
- MDN `X-Frame-Options` header reference - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Frame-Options
- MDN `X-XSS-Protection` header reference - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-XSS-Protection
- OWASP Cross-Site Scripting Prevention Cheat Sheet - https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- OWASP SQL Injection Prevention Cheat Sheet - https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
- OWASP Content Security Policy Cheat Sheet - https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html

## Issues Found
- Updated Zod format validators from deprecated `z.string().email()` and `z.string().url()` to current top-level `z.email()` and `z.url()` APIs.
- Updated Zod error handling from `result.error.errors` to `result.error.issues`, which is the documented error issue list in current Zod.
- Removed `decodeURIComponent()` from the `URLSearchParams` example because `URLSearchParams.get()` already returns decoded parameter values; decoding again can throw or alter valid values.
- Fixed `ResponseSanitizer.sanitizeUser` so it references static methods through `ResponseSanitizer` instead of `this`; this keeps the method working when passed as a callback.
- Removed `X-Content-Type-Options`, `X-Frame-Options`, and `X-XSS-Protection` from the React Helmet meta-tag example. These are HTTP response headers, and `X-XSS-Protection` is deprecated and not recommended.
- Updated the Testing Library example to pass `data-testid="sanitized-content"` to `SanitizedHTML`, matching the later `screen.getByTestId()` assertion.
- Updated `SanitizedHTML` to forward extra props so the documented test and similar caller-supplied attributes work.

## Review Notes
The post is technically relevant and broadly accurate after the corrections above. Several snippets are illustrative and omit surrounding imports or application-specific components such as `EditorComponent`, `Spinner`, and `ContactForm`; that is acceptable for a tutorial but could be clarified in a future editorial pass.
