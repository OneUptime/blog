# Validation summary

## Checks performed

Reviewed OneUptime architecture and custom-domain documentation, plus their source at commit `0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e`. Reviewed Kubernetes DNS and curl documentation. Both shell snippets passed bash -n. curl 8.7.1 supports all shown flags. A local HTTPS fixture confirmed that --resolve preserves certificate hostname checks: the expected name returned HTTP 200; a different name failed with exit 60. The fixture substituted loopback, an ephemeral port, and a temporary self-signed certificate. Diagram node references and subgraph delimiters checked structurally. Social image visually inspected at 1280x720 with complete readable title.

## Limitations

No real OneUptime deployment, DNS outage, Kubernetes failure, identity provider, publishing flow, or recovery process was exercised. Fixture results prove command behavior only. No Mermaid browser rendering.

## Sources reviewed

- https://oneuptime.com/docs/en/self-hosted/architecture
- https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- https://oneuptime.com/docs/en/status-pages/branding-and-domains#ssl-certificates
- https://curl.se/docs/manpage.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
