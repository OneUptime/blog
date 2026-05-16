# Validation Summary: How to Set Up a Pull-Through Cache (Registry Mirror) in Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, registries)
- Docker Registry v2 (distribution/distribution) in pull-through cache / proxy mode
- Kubernetes (Deployment, Service, PersistentVolumeClaim manifests)
- Docker CLI
- talosctl CLI
- OpenSSL (self-signed certificate generation)
- Upstream registries: Docker Hub (registry-1.docker.io), GHCR (ghcr.io), Quay (quay.io)

## Sources Consulted
- Official Distribution (Docker Registry) recipes — pull-through cache / mirror: https://distribution.github.io/distribution/recipes/mirror/
- Distribution configuration reference (env var overrides such as `REGISTRY_PROXY_REMOTEURL`, `REGISTRY_PROXY_USERNAME`, `REGISTRY_PROXY_PASSWORD`, `REGISTRY_STORAGE_FILESYSTEM_ROOTDIRECTORY`, `REGISTRY_STORAGE_DELETE_ENABLED`, `REGISTRY_HTTP_TLS_CERTIFICATE`, `REGISTRY_HTTP_TLS_KEY`): https://distribution.github.io/distribution/about/configuration/
- Talos Linux machine config — registries: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/#Config.machine.registries
- Talos Linux guide on pull-through registry cache: https://www.talos.dev/latest/talos-guides/configuration/pull-through-cache/
- talosctl patch reference: https://www.talos.dev/latest/reference/cli/#talosctl-patch
- Docker Hub pull rate limit documentation: https://docs.docker.com/docker-hub/usage/

## Issues Found
No technical issues found.

All verified items:
- `registry:2` image and pull-through cache env vars (`REGISTRY_PROXY_REMOTEURL`, `REGISTRY_PROXY_USERNAME`, `REGISTRY_PROXY_PASSWORD`) match the official distribution docs.
- The Docker Hub upstream URL `https://registry-1.docker.io` is the correct upstream for Docker Hub mirroring.
- TLS env vars `REGISTRY_HTTP_TLS_CERTIFICATE` / `REGISTRY_HTTP_TLS_KEY` and the in-container path convention are correct.
- The Talos config structure (`machine.registries.mirrors.<host>.endpoints` and `machine.registries.config.<host>.tls.ca`) is correct for v1alpha1.
- Using `docker.io` as the mirror key is correct — Talos handles rewriting to `registry-1.docker.io`.
- The endpoint-list fallback behavior (try first, fall through on failure) is accurate.
- The `talosctl patch machineconfig --nodes <ip> --patch @file.yaml` syntax (including `@`-prefixed file reference) is correct.
- The Kubernetes Deployment / Service / PVC YAML is syntactically valid and uses current `apiVersion`s.
- The `openssl req -newkey rsa:4096 -nodes -sha256 -keyout ... -x509 -days 365 -out ... -subj ...` invocation is valid.
- The `curl .../v2/_catalog` endpoint is the correct Distribution API for listing repositories.

## Review Notes
- Docker Hub's pull rate limits have been revised multiple times. The 100/6hr (anonymous) and 200/6hr (authenticated free) limits cited here are the long-standing, widely-referenced numbers and are still the canonical motivation for this kind of setup; the exact thresholds may shift over time, so readers should consult the current Docker Hub usage docs for up-to-date numbers.
- The post does not mention `overridePath: true`, which is sometimes required in Talos when mirroring registries that expose paths differently (e.g., projects on Harbor). For the simple Docker Hub / GHCR / Quay cases shown here, the default (false) is correct.
- The chain-of-trust example for TLS uses `ca:` (PEM CA). When using a publicly-trusted certificate, the `tls` block can be omitted entirely; the example with the inlined CA is appropriate for the self-signed scenario described earlier in the post.
- For production use, readers may want to consider authentication on the cache itself (not just upstream) and resource limits on the Deployment, but those are out of scope for this introductory guide.
