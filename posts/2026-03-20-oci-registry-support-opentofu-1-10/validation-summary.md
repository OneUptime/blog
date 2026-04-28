# Validation Summary: How to Use OCI Registry Support Introduced in OpenTofu 1.10

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu 1.10 (OCI registry module sources)
- OCI (Open Container Initiative) registries — GHCR, AWS ECR
- ORAS CLI (OCI artifact tool)
- Docker CLI (for credential login)
- GitHub Actions (CI/CD example)
- HCL (OpenTofu module source configuration)

## Sources Consulted
- [OCI Registry Integrations | OpenTofu](https://opentofu.org/docs/cli/oci_registries/)
- [Module Packages in OCI Registries | OpenTofu](https://opentofu.org/docs/cli/oci_registries/module-package/)
- [OpenTofu 1.10.0: A Well-Seasoned Release | OpenTofu](https://opentofu.org/blog/opentofu-1-10-0/)
- [OCI Registry Credentials | OpenTofu](https://opentofu.org/docs/cli/oci_registries/credentials/)
- [OpenTofu Module Sources](https://opentofu.org/docs/language/modules/sources/)

## Issues Found
Several technical errors were corrected against the official OpenTofu 1.10 OCI module package documentation:

1. **Module source address syntax for tags** — The post used Docker-style colon tags (`oci://...vpc:v1.2.0`). OpenTofu's `oci://` source addresses require tags as a query string parameter (`?tag=v1.2.0`). Fixed in all four occurrences (the two introductory examples, the version pinning example, and the Git-vs-OCI comparison block).
2. **Module source address syntax for digests** — The post used Docker-style `@sha256:...` syntax. OpenTofu uses a `?digest=sha256:...` query string argument instead. Fixed in the digest pinning example.
3. **Artifact type media type** — The post used `application/vnd.opentofu.module.v1+tar+gzip`, which is not a real OpenTofu media type. The official `--artifact-type` value is `application/vnd.opentofu.modulepkg`. Fixed in both `oras push` examples.
4. **Archive format** — The post packaged modules as `.tar.gz` (gzip tarball). OpenTofu's spec requires the layer to be a ZIP archive with `mediaType: archive/zip`. Replaced the `tar -czf` step with a `zip -r` invocation and updated the file extension throughout.
5. **`oras push` file argument** — The post passed the archive as a bare filename. ORAS requires the `<file>:<media-type>` form for OpenTofu to recognize the layer's media type, so the argument is now `vpc-module.zip:archive/zip`.

## Review Notes
- The claim that OpenTofu reads credentials from `~/.docker/config.json` automatically is consistent with the official docs, which state OpenTofu uses the same credential locations as Docker, Podman, Buildah, and ORAS. A standalone OCI credential block in the CLI config (`oci_credentials`) is also supported but was not required for this introductory post.
- The Docker-style `:tag` and `@digest` notations the original post used are valid for the `oras push` *target reference* (which is fine on the publishing side) but are NOT valid for the OpenTofu `source` address — that distinction is the source of most of the corrections above.
- The post does not cover OCI provider mirrors (configured via the `oci_default_credentials` and `provider_installation` blocks), which is a reasonable scoping decision for a how-to focused on modules.
- Registry immutability behavior on GHCR and ECR is policy-dependent; the closing recommendation to combine digest pinning with registry immutability policies remains accurate.
