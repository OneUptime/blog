# Validation summary

Official NGINX auth_request/map/proxy-cache documentation and tagged1.30.7 file-cache implementation reviewed. Local NGINX fixture separated Alice and Bob by synthetic credential, reused matching Alice decisions, independently denied another URI, and bypassed cache for two missing-credential requests. Revocation was intentionally observed to lag until the two-second approval expired. All fixture processes stopped.

Article configuration passed nginx -t with local cache directory substitution. Eight-node/eight-edge Mermaid structurally reviewed, not rendered. Social image generated and visually inspected at1280x720.

Not tested: browser sessions, live OAuth, changed methods/cookies, real credential expiry, auth-service outages or additional policy dimensions. Sensitive raw key storage is explicitly explained; only synthetic credentials used locally.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
