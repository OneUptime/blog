# Validation review

Reviewed official NGINX proxy/upstream documentation and command-line testing, OpenSSL hostname/SNI verification flags and curl resolve behavior. Used existing local NGINX1.30.7 build linked to OpenSSL3.6.2.

A temporary loopback HTTPS fixture with a test CA returned200 for correct TLS name/SNI/trust and echoed the expected Host. Wrong verification name, missing SNI against this SNI-requiring fixture, and unrelated CA each returned502. Error logs and observed SNI matched the expected failure layers. All processes were stopped after tests.

The article config passed nginx -t with only its CA path replaced by the fixture CA. Shell syntax passed. Three-participant seven-message Mermaid structurally reviewed, not rendered.

No production backend, multi-member pool, deployment reload or rotation was tested. OpenSSL/curl snippets were not run against the documentation-only address. Fixture certificates and keys remain only in ignored temporary test storage.

Generated1280x720 social image visually inspected; full title fits.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
