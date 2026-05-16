# Validation Summary: How to Install Talos Linux in Air-Gapped Environments

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (v1.9.0)
- Kubernetes (v1.32.0)
- `talosctl` CLI
- `crane` (go-containerregistry)
- `skopeo`
- Docker / Docker Registry v2
- PXE / USB boot media
- Container registry mirroring

## Sources Consulted
- Talos v1.9 CLI reference: https://www.talos.dev/v1.9/reference/cli/ (and https://docs.siderolabs.com/talos/v1.9/reference/cli/)
- Talos v1.9.0 release notes: https://github.com/siderolabs/talos/releases/tag/v1.9.0
- Talos v1.9 air-gapped installation docs: https://www.talos.dev/v1.9/advanced/air-gapped/
- Talos v1.9 pull-through cache config: https://www.talos.dev/v1.9/talos-guides/configuration/pull-through-cache/
- Talos v1.9 config reference: https://www.talos.dev/v1.9/reference/configuration/v1alpha1/config/
- Talos source code `cmd/talosctl/cmd/talos/image.go` (branch release-1.9) for verifying flag support on `talosctl image default`
- `crane` reference: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_pull.md
- `skopeo copy` man page: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md

## Issues Found

1. **Non-existent `--kubernetes-version` flag on `talosctl image default`** — In Step "Handling Updates in Air-Gapped Environments", the post invoked `talosctl image default --kubernetes-version 1.32.0`. Per the v1.9 CLI source and reference, this command accepts no command-specific flags other than `--help`; the K8s version is baked into the Talos release being used. Replaced this with running the new talosctl binary (`./talosctl-${NEW_VERSION}-linux-amd64 image default`) to obtain the default images for the new release.

2. **Mismatched Kubernetes version in example output** — The example output of `talosctl image default` showed `kube-apiserver:v1.31.0` and related components, but Talos v1.9.0 ships with Kubernetes v1.32.0 as its default. Updated the illustrative output to v1.32.0-matching versions: `kube-*:v1.32.0`, `coredns/coredns:v1.11.3`, `etcd:v3.5.16`, `flannel:v0.26.1`. The `pause:3.9` and `installer:v1.9.0` lines were already correct.

3. **kubectl download version inconsistency** — The `wget` line for `kubectl` referenced `v1.31.0`. Updated to `v1.32.0` to be internally consistent with the Talos v1.9.0 default K8s version used throughout the post.

## Review Notes

- `talosctl image default` (singular `image`) is the correct command name in v1.9. The earlier `talosctl images` (plural) was deprecated in favor of the `image` subcommand group — the post correctly uses the new form.
- The metal ISO URL `https://github.com/siderolabs/talos/releases/download/v1.9.0/metal-amd64.iso` is a valid release asset.
- The registry mirror configuration YAML (`machine.registries.mirrors`, `machine.registries.config.*.tls.insecureSkipVerify`, `machine.install.image`) matches the v1alpha1 schema.
- The image-rewrite shell logic (`sed 's|[^/]*/||'`) strips only the first path component (the original registry host). For Talos's default image set this avoids collisions, but readers should be aware that if they add custom images from multiple registries with overlapping paths (e.g., `docker.io/library/foo` vs. `ghcr.io/library/foo`) they would collide under this scheme.
- `crane pull` uses the legacy Docker tarball format by default, which is compatible with both `crane push` and `skopeo copy docker-archive:`. For multi-arch handling, users may need `--platform=all`, but the post is geared toward single-platform deployments which is the typical air-gap case.
- `talosctl health` works as shown once endpoints and nodes are configured; the post's command ordering is correct.
- Future-version caveat: if/when Talos v1.10+ adds a `--kubernetes-version` flag to `talosctl image default` (open issue #12257), the post's "Handling Updates" section could be simplified back to a single-binary workflow.
