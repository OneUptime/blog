# Validation Summary: How to Inspect Remote Images with Skopeo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Skopeo
- Podman
- Container registries
- Docker/OCI container images and manifests
- jq
- Linux and macOS package managers

## Sources Consulted
- Skopeo upstream README: https://github.com/containers/skopeo
- Skopeo upstream installation documentation: https://github.com/containers/skopeo/blob/main/install.md
- skopeo-inspect(1) man page, Debian skopeo 1.21.0 pre-release packaging: https://manpages.debian.org/testing/skopeo/skopeo-inspect.1.en.html
- skopeo-inspect(1) man page mirror: https://www.mankier.com/1/skopeo-inspect
- Podman login documentation: https://docs.podman.io/en/v5.6.0/markdown/podman-login.1.html
- containers-auth.json(5) man page: https://www.mankier.com/5/containers-auth.json

## Issues Found
No technical issues found.

## Review Notes
The reviewed Skopeo flags and examples are current and documented, including `inspect`, `--raw`, `--config`, `--creds`, `--authfile`, `--cert-dir`, and `--tls-verify=false`. The documented inspect output includes fields used in the `jq` examples, such as `Digest`, `Created`, `Labels`, `Architecture`, `Os`, `Layers`, `LayersData`, and `Env`. Podman and Skopeo both use the containers authentication file mechanism, so the private registry authentication guidance is technically correct.
