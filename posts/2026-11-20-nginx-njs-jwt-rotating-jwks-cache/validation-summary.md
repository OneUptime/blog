# Validation review

RFC8725/7517/7519, official njs WebCrypto and NGINX cache documentation reviewed. Companion file is a restricted RS256 single-issuer/scalar-audience profile; it verifies every signature and claims independently of network key caching.

Actual NGINX1.30.7/njs0.9.5 tests used generated RSA keys and one-second public cache headers. Valid checks204; invalid signature, algorithm, issuer, audience, expiry, future nbf and unknown key401. Repeated calls fetched once. Rotation accepted both keys after refresh, then rejected retired key after refresh. Expired cache plus origin503 returned503. Article config passed nginx -t with fixture file/cache substitutions. njs build required only macOS linker replacement -Wl,-E to -Wl,-export_dynamic.

No production issuer TLS, cache-lock concurrency, multiple workers, distributed invalidation or application authorization integration was tested. The loopback verification endpoint itself protects no application route. Imported keys are not cached. Effective lifetime depends on origin cache headers.

Eight-node eight-edge Mermaid structurally reviewed, not rendered. Generated1280x720 image visually reviewed for title fit and branding.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
