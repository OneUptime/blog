# Validation Summary: How to Create Reproducible Talos Builds with Image Factory

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Talos Linux (v1.7.0)
- Talos Image Factory (factory.talos.dev)
- Talos image schematics (content-addressable, SHA256)
- talosctl CLI (gen config, apply-config, bootstrap, health)
- Kubernetes (v1.30.0)
- Bash / CI shell pipelines (GitHub Actions style, `$GITHUB_ENV`)
- yq (mikefarah/yq v4)
- jq
- curl
- FluxCD (kustomize.toolkit.fluxcd.io/v1 Kustomization)
- GitOps workflow

## Sources Consulted
- Talos Image Factory documentation: https://docs.siderolabs.com/talos/v1.7/learn-more/image-factory/
- Image Factory API reference: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Talos Linux v1.7 release notes (Kubernetes compatibility — Talos 1.7 supports Kubernetes up to 1.30)
- FluxCD Kustomize Controller API (kustomize.toolkit.fluxcd.io/v1)
- talosctl CLI reference (gen config, apply-config, bootstrap, health flags)

## Issues Found
- **Truncated schematic ID in early code examples.** The post used a 24-character hex string (`376567988ad8b2698212367b`) as the schematic ID in the "Pin Your Talos Version" YAML examples. Real Talos Image Factory schematic IDs are 64-character SHA256 hashes (the post itself uses the correct full 64-char `376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba` later in the `build-requirements.yaml` example). Fixed both occurrences (the "Good" and "Bad" examples) to use the full 64-character canonical "vanilla" schematic ID for consistency and to avoid showing users an installer URL that would not actually resolve in the Image Factory registry.

## Review Notes
- The Image Factory `POST /schematics` endpoint correctly returns a JSON object with `id` and `schematic` fields, so the `curl ... | jq -r '.id'` pattern is accurate.
- Talos v1.7.0 + Kubernetes v1.30.0 is a compatible pairing.
- `talosctl gen config <cluster> <endpoint>` with `--kubernetes-version`, `--install-image`, and `--output-dir` flags is correct.
- `talosctl apply-config --insecure --nodes --file`, `talosctl bootstrap --nodes`, and `talosctl health --nodes --wait-timeout` flags are all valid.
- The FluxCD `kustomize.toolkit.fluxcd.io/v1` API version (Kustomization resource) is correct for FluxCD 2.x.
- `yq -i ".path = \"value\"" file` syntax matches mikefarah/yq v4.
- Note for future maintenance: Talos v1.7.0 is now a past minor release (Talos has progressed beyond 1.8). The pinned versions still make for a valid pedagogical example, but readers may want to substitute a current version when applying this guide.
- The post's claim that "Image Factory images are deterministic — the same inputs always produce the same output" is consistent with the documented content-addressable schematic design.
