# Validation summary

Official NGINX upstream/resolver/logging/command documentation and curl options reviewed. NGINX1.30.7 was exercised against a local DNS responder and two HTTP backends. Changing the answer from IPv4 loopback A to IPv6 loopback B changed the response marker with the same worker PID and no reload. All processes were stopped afterward.

The fixture used one-second validity; the article recommends an illustrative ten-second value. A64k zone failed on the local platform;256k passed and is used in the article. The complete article NGINX fragments passed nginx -t with only the log path substituted. Shell snippets passed bash syntax checking. Mermaid has four participants and six messages, structurally reviewed but not rendered. The social image was visually inspected and is legible.

Not tested: production DNS, resolver failures, NXDOMAIN, HTTPS, multi-worker behavior, pooled or long-lived connections, and the placeholder curl health endpoint.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
