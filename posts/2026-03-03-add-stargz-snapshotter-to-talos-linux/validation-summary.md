# Validation Summary: How to Add Stargz Snapshotter to Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (system extensions, machine config, Image Factory)
- Stargz Snapshotter / eStargz (Seekable tar.gz) container image format
- containerd (CRI, proxy plugins, snapshotters)
- Kubernetes (Deployments, kubectl)
- nerdctl (image convert)
- ctr-remote (images optimize)
- cosign (image signing)
- FUSE (filesystem in userspace)

## Sources Consulted
- siderolabs/extensions repo — stargz-snapshotter extension source
  - https://github.com/siderolabs/extensions/tree/main/container-runtime/stargz-snapshotter
  - `10-stargz-snapshotter.part` (containerd CRI drop-in: socket path and snapshotter name)
  - `pkg.yaml` (extension install path `/etc/cri/conf.d/`)
  - `manifest.yaml.tmpl` (service name, compatibility ">= v1.6.0")
- Talos Image Factory API docs: https://github.com/siderolabs/image-factory/blob/main/docs/api.md (POST /schematics format)
- GHCR tags for `ghcr.io/siderolabs/stargz-snapshotter` (verified extension image exists)
- go-containerregistry crane CLI docs: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane.md (verified subcommands)
- containerd/stargz-snapshotter project (eStargz format, ctr-remote optimize flags, nerdctl convert flags)

## Issues Found
1. **Wrong CRI config drop-in path.** Post used `/var/cri/conf.d/stargz.toml`; the official Talos extension installs its CRI drop-in to `/etc/cri/conf.d/` (verified in the extension's `pkg.yaml`). Changed `path` to `/etc/cri/conf.d/stargz.toml`.
2. **Wrong stargz gRPC socket path.** Post used `/run/containerd-stargz-grpc/containerd-stargz-grpc.sock`; the official extension's `10-stargz-snapshotter.part` and the snapshotter's `--address` flag use `/var/run/containerd-stargz-grpc/...`. Changed the `address` field to `/var/run/containerd-stargz-grpc/containerd-stargz-grpc.sock`. (On most systems `/run` symlinks to `/var/run`, but the canonical/official value is `/var/run`.)
3. **`crane optimize` subcommand does not exist.** The `Using crane` subsection invoked `crane optimize` to convert an image to eStargz; the `crane` CLI from go-containerregistry has no such subcommand (verified against the official crane subcommand list: append, auth, blob, catalog, config, copy, delete, digest, export, flatten, index, ls, manifest, mutate, pull, push, rebase, registry, tag, validate, version). Removed the entire `Using crane` subsection — the `Using nerdctl` and `Using stargz-store directly` (`ctr-remote`) subsections remain and cover the correct conversion paths.

## Review Notes
- The `machine.install.extensions` style shown in the first install snippet still appears in the v1.7 config reference, but the Image Factory + `talosctl upgrade --image factory.talos.dev/installer/<id>:<version>` workflow is the recommended path; the post shows both, which is fine.
- The `talosctl logs ext-stargz-snapshotter` service-name convention matches Talos's `ext-<extension-name>` prefix for extension services.
- The `ctr-remote images optimize --period --entrypoint='[...]'` flags and JSON-array entrypoint format are correct.
- The `nerdctl image convert --estargz --oci` invocation is correct.
- "Content Verification" section is a bit imprecise — `cosign sign` is generic image signing and is separate from eStargz's built-in TOC/file-level content verification — but the commands themselves are valid, so left as-is.
- Version pins (`stargz-snapshotter:v0.15.1`, `installer:v1.7.0`) are valid for the era this post targets; readers running newer Talos should substitute the matching installer/extension versions.
