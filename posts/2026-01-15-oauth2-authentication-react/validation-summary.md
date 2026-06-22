# Validation Summary: How to Implement OAuth 2.0 Authentication in React

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- React (TypeScript) with React Router (`react-router-dom`)
- OAuth 2.0 Authorization Code flow with PKCE (RFC 7636)
- Web Crypto API (`crypto.getRandomValues`, `crypto.subtle.digest`)
- Google, GitHub, and Microsoft (Azure AD / Microsoft identity platform) OAuth providers
- `axios` interceptors for token attachment and refresh
- Jest + MSW (Mock Service Worker) for testing

## Sources Consulted
- OAuth 2.0 — RFC 6749: https://datatracker.ietf.org/doc/html/rfc6749
- PKCE — RFC 7636: https://datatracker.ietf.org/doc/html/rfc7636
- OAuth 2.0 for Browser-Based Apps (draft): https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps
- Google Identity OAuth 2.0 docs: https://developers.google.com/identity/protocols/oauth2
- GitHub — Authorizing OAuth apps / PKCE changelog (2025-07-14): https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/
- Microsoft identity platform auth code + PKCE docs: https://learn.microsoft.com/en-us/azure/active-directory/develop/
- MDN — `crypto.subtle.digest`, `crypto.getRandomValues`, `btoa`, `TextEncoder`
- React Router v6 (`useSearchParams`, `useNavigate`, `Navigate`) docs

## Issues Found
1. **Broken callback flow — provider read after PKCE state was already cleared (fixed).** In `AuthContext.tsx`, `handleCallback` called `exchangeCodeForTokens(code, callbackState)` first and only *afterward* read the provider from `sessionStorage` (`oauth_pkce_state`). But `exchangeCodeForTokens` calls `sessionStorage.removeItem(PKCE_STORAGE_KEY)` on success, so by the time the provider was read it was always gone, resolving to `'unknown'`. The next call, `fetchUserInfo(tokens.accessToken, 'unknown')`, invokes `getOAuthConfig('unknown')`, which throws `Unknown OAuth provider: unknown` — breaking every successful login. **Fix:** moved the provider read to *before* `exchangeCodeForTokens`, so the provider is captured while the PKCE state still exists. No other logic changed.

## Review Notes
The core PKCE implementation is correct: a 32-byte random verifier base64url-encodes to 43 characters (within the RFC 7636 43–128 range), the SHA-256 → base64url challenge with `code_challenge_method: 'S256'` is right, and the state/CSRF validation is sound. The following are accurate-but-worth-noting caveats that were left as-is because addressing them would require restructuring the post or depend on unpinned versions:

- **GitHub from a pure browser SPA won't fully work as shown.** GitHub added PKCE support for OAuth/GitHub Apps in July 2025 (S256 only), but its token endpoint (`https://github.com/login/oauth/access_token`) still does **not** support CORS, so the browser `fetch` in `exchangeCodeForTokens` will be blocked — a backend/proxy is required. Additionally, that endpoint returns `application/x-www-form-urlencoded` by default; calling `response.json()` requires sending an `Accept: application/json` request header. Google's and Microsoft's SPA-registered token endpoints do support CORS, so the client-side flow works for them.
- **Refresh tokens require extra parameters per provider.** Google needs `access_type=offline` (and usually `prompt=consent`) on the authorization request to return a refresh token; Microsoft needs the `offline_access` scope. As written, the auto-refresh logic would have no refresh token for these providers.
- **Microsoft Graph `/me` requires the `User.Read` scope.** The Microsoft config uses only `openid email profile`; calling `https://graph.microsoft.com/v1.0/me` typically needs `User.Read` as well.
- **`create-react-app` is deprecated.** The React team deprecated CRA in early 2025 and recommends a framework (e.g., Vite, Next.js) for new SPAs. The command still scaffolds a project but emits warnings; the rest of the code is framework-agnostic.
- **MSW version.** The integration test uses MSW v1 syntax (`rest`, `res(ctx.json(...))`). MSW v2 renamed these to `http` and `HttpResponse.json(...)`. The shown code is valid only against `msw@1`.
- **Storing tokens in `localStorage`** is acknowledged in the post's own security table as XSS-vulnerable; the OAuth-for-browser-apps BCP recommends in-memory storage or a backend-for-frontend pattern. The post fairly presents the trade-offs.
