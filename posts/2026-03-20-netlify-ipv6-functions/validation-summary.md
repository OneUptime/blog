# Validation Summary: How to Configure Netlify Functions IPv6

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Netlify Functions (v1 / Lambda-compatible handler)
- Node.js 18+ runtime (`fetch`, `AbortSignal.timeout`)
- IPv6 addressing (RFC 3986 bracket notation, IPv4-mapped IPv6 normalization)
- `netlify.toml` configuration
- Netlify CLI (`netlify env:set`)
- `dig` and `curl` for IPv6 DNS / endpoint testing

## Sources Consulted
- Netlify Functions overview — https://docs.netlify.com/functions/overview/
- Netlify Functions runtimes — https://docs.netlify.com/functions/runtimes/
- Netlify Functions Lambda compatibility — https://docs.netlify.com/functions/lambda-compatibility/
- Netlify request headers (incl. `x-nf-client-connection-ip`) — https://docs.netlify.com/platform/request-headers/
- Netlify environment variables — https://docs.netlify.com/environment-variables/overview/
- Netlify file-based configuration (`netlify.toml`) — https://docs.netlify.com/configure-builds/file-based-configuration/
- RFC 3986 §3.2.2 (URI host with literal IPv6 in brackets) — https://www.rfc-editor.org/rfc/rfc3986
- RFC 4291 §2.5.5.2 (IPv4-mapped IPv6 address format) — https://www.rfc-editor.org/rfc/rfc4291
- Companion post in the same repo: `posts/2026-03-20-netlify-functions-ipv6/README.md` (correctly uses Netlify's JS API and headers)
- curl `--resolve` documentation — https://curl.se/docs/manpage.html

## Issues Found

1. **Wrong runtime: Python used throughout for "Netlify Functions"**
   - Netlify Functions only support JavaScript/TypeScript (Node.js) and Go. Python is not a supported runtime, so the original `def handler(event, context)` examples and `import requests` / `urllib.request` calls would never run on Netlify.
   - Fix: rewrote every Python block as JavaScript using the v1 (Lambda-compatible) handler signature `exports.handler = async (event, context) => { ... }` and Node 18+ `fetch` with `AbortSignal.timeout`.

2. **Wrong client-IP source: AWS Lambda's `event.requestContext.identity.sourceIp`**
   - Netlify Functions don't populate `requestContext.identity.sourceIp`. The documented sources for the client IP on Netlify are the headers `x-nf-client-connection-ip` (most reliable) and `x-forwarded-for`.
   - Fix: changed the IP extraction to read `event.headers["x-nf-client-connection-ip"]` first, then fall back to the first entry of `x-forwarded-for`.

3. **IPv4-mapped IPv6 detection logic was Python-specific**
   - The original used `ipaddress.IPv6Address.ipv4_mapped`, which has no Node.js equivalent in the standard library.
   - Fix: replaced with a regex match on `^::ffff:(\d+\.\d+\.\d+\.\d+)$` (RFC 4291 §2.5.5.2) and unwrap to the IPv4 string when matched.

4. **Environment variable section used Python `os.environ.get`**
   - Fix: replaced with a Netlify-appropriate pattern: a `[build.environment]` block in `netlify.toml` plus `process.env.BACKEND_URL` in the function code, and noted that secrets should be set via the Netlify UI or `netlify env:set` rather than committed to `netlify.toml`.

5. **`curl --resolve` IPv6 address missing brackets**
   - The original had `--resolve "host:443:2001:db8::1"`. curl's `--resolve` parser expects IPv6 literals in square brackets (`[2001:db8::1]`) to disambiguate from the colon-separated `host:port:addr` field separators.
   - Fix: added brackets around the IPv6 address in the `--resolve` example and replaced the run-on whitespace with a proper line continuation (`\`).

6. **Generic "VPC subnet" guidance not applicable to Netlify**
   - Netlify is a managed CDN/edge platform with no user-managed VPC for standard Functions. The original "For VPC-integrated functions, ensure VPC subnet has IPv6" line was misleading.
   - Fix: replaced with a note that Netlify's CDN/edge is dual-stack by default and pointed at the actual function URL pattern `https://your-site.netlify.app/.netlify/functions/<name>`.

7. **Introduction described a generic "platform" rather than Netlify**
   - Fix: rewrote the intro to state that Netlify is dual-stack and that Netlify Functions support Node.js and Go (so the examples use Node.js).

## Review Notes

- The post uses the Netlify Functions **v1** (Lambda-compatible) handler signature. Netlify also offers a **v2** API (`export default async (req: Request, ctx: Context) => Response`) which is now the recommended style for new functions. Either works, but a future revision could mention v2 or migrate the examples.
- The IPv6-detection check `clientIp.includes(":")` is a string heuristic; it is fine for separating IPv4 and IPv6 in this context (after IPv4-mapped normalization) but is not a strict validator. For stricter validation, `node:net`'s `isIP()` returns `4`, `6`, or `0`.
- `dig AAAA your-site.netlify.app` is shown twice in Step 1 (once for the site, once "for a function endpoint"). The two lines are identical because functions live under the same hostname as the site; this is intentional after the rewrite but could be simplified in a future pass.
- Examples use the documentation-only IPv6 prefix `2001:db8::/32` (RFC 3849), which is the right choice for tutorials.
