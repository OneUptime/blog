# Validation Summary: How to Fix 'Server-Side Request Forgery (SSRF)'

## Status
validated

## Post Type
Security guide / tutorial

## Technologies Covered
- Server-Side Request Forgery (SSRF)
- Node.js URL, DNS, HTTP, HTTPS, and Fetch APIs
- JavaScript `ipaddr.js`
- Express-style request handlers
- Kubernetes NetworkPolicy
- AWS EC2 Instance Metadata Service v2 (IMDSv2)
- Google Cloud and Azure metadata services

## Sources Consulted
- OWASP Server Side Request Forgery Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Top 10:2021 A10 Server-Side Request Forgery: https://owasp.org/Top10/2021/A10_2021-Server-Side_Request_Forgery_%28SSRF%29/
- Node.js HTTP documentation: https://nodejs.org/api/http.html
- Node.js DNS documentation: https://nodejs.org/api/dns.html
- Node.js URL documentation: https://nodejs.org/api/url.html
- Node.js global Fetch and AbortController documentation: https://nodejs.org/api/globals.html
- AWS CLI `modify-instance-metadata-options` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-metadata-options.html
- Amazon EC2 instance metadata retrieval documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Google Cloud metadata querying documentation: https://docs.cloud.google.com/compute/docs/metadata/querying-metadata
- Azure Instance Metadata Service documentation: https://learn.microsoft.com/en-us/azure/virtual-machines/instance-metadata-service

## Issues Found
- The `SSRFProtection` example used `dns.resolve()`, returned plain strings, and did not handle bracketed IPv6 literals from `new URL()`. Changed it to normalize IP literals, use `dns.lookup(..., { all: true, verbatim: true })`, and return `{ address, family }` entries so IPv4 and IPv6 results are validated and usable by the fetcher.
- The safe fetcher attempted DNS pinning with a `lookup` callback that always returned IPv4 family `4` and did not preserve HTTPS SNI or the original `Host` header when connecting to a pinned IP. Updated it to connect directly to the validated IP address, pass the address family, set the original host header, and set `servername` for HTTPS.
- The safe fetcher accepted `options.body` in later examples but never wrote it to the request. Added `req.write(options.body)` before `req.end()`.
- The `SafeFetcher` class was required by later snippets but not exported. Added `module.exports = SafeFetcher`.
- The webhook validator used `crypto` and `safeFetcher` without defining them. Added the required imports and a `this.safeFetcher` instance.
- The image downloader used `SSRFProtection` without importing it and then used native `fetch()` with a non-standard `timeout` option and `response.buffer()`, which is not part of Node's built-in Fetch API. Changed the example to use the safe fetcher for both `HEAD` and `GET`, read Node HTTP headers correctly, and return the response `Buffer`.
- The Azure metadata payload omitted the required `api-version` query parameter and did not mention the required `Metadata: true` header. Updated the payload and comment.
- The GCP metadata payload did not mention the required `Metadata-Flavor: Google` header. Updated the comment.
- The IMDSv2 explanation overclaimed that IMDSv2 "prevents SSRF attacks" and omitted the required token TTL header for the token request. Changed the wording to "helps prevent common SSRF attacks" and added the `X-aws-ec2-metadata-token-ttl-seconds` requirement.

## Review Notes
The Kubernetes NetworkPolicy and AWS CLI command syntax match current official documentation. The JavaScript examples were syntax-checked after edits, but they are illustrative snippets and would still need real application wiring, dependency installation such as `ipaddr.js`, and environment-specific network controls in production.
