# Validation Summary: How to Download Talos Linux Images from Image Factory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Talos Image Factory (factory.talos.dev)
- Talos `imager` Docker container
- `talosctl` CLI
- Talos system extensions (siderolabs/intel-ucode, i915-ucode, amd-ucode, iscsi-tools, util-linux-tools, realtek-firmware, bnx2-bnx2x, nonfree-kmod-nvidia, nvidia-container-toolkit)
- Schematic YAML format

## Sources Consulted
- Talos Image Factory documentation: https://docs.siderolabs.com/talos/v1.9/learn-more/image-factory/
- Image Factory repository: https://github.com/siderolabs/image-factory
- Image Factory API reference (endpoint list: `POST /schematics`, `GET /image/:schematic/:version/:path`, etc.)
- Boot assets guide: https://docs.siderolabs.com/talos/v1.9/platform-specific-installations/boot-assets/
- Talos GitHub releases for v1.9.0 and v1.13.2 (verified actual asset filenames via `gh release view`)
- System extensions docs (`talosctl get extensions` and the `ExtensionStatus` resource)
- Direct HEAD requests against `factory.talos.dev/image/<id>/<version>/<filename>` to verify each filename in the image-format table returns 200

## Issues Found

1. **Incorrect GitHub release asset filenames.** The post referenced `talos-amd64.iso` and `talos-arm64.iso` for the `releases/latest/download/` URLs. The actual asset names on the Talos GitHub release (confirmed for both v1.9.0 and the current v1.13.2) are `metal-amd64.iso` and `metal-arm64.iso`. The `talos-*` filenames do not exist and the URLs would 404. Fixed both URLs.

2. **Wrong `imager` profile for building an ISO.** The local `imager` example used the `metal` profile, but the surrounding comment said "Build a custom ISO locally." The `metal` profile in `imager` produces a generic bare-metal disk image (`.raw`), not an ISO. Per the official boot-assets documentation, the profile to build an ISO is `iso`. Changed `metal` to `iso` so the command matches what the prose claims it does.

3. **Missing output volume mount in the `imager` docker run.** The example claimed "The resulting image is placed in the current directory," but the docker run did not bind-mount a host path to `/out` inside the container, so the artifact would have stayed inside the (now-deleted) container filesystem. Added `-v $PWD/_out:/out` to match the canonical command in the Talos docs, and updated the trailing sentence to refer to the `_out` directory.

## Review Notes

- The example schematic ID `376567988ad370138ad8b2698212367b8edcb69b5fd68c80be1f2ec7d603b4ba` is the canonical example used in the official Image Factory docs. It is not actually the hash of the schematic shown immediately above the example, but the post hedges with "something like," so this is acceptable.
- The image-format table is accurate — every filename listed (`metal-amd64.iso`, `nocloud-amd64.raw.xz`, `vmware-amd64.ova`, `aws-amd64.raw.xz`, `gcp-amd64.raw.tar.gz`, `azure-amd64.vhd.xz`, `oracle-amd64.raw.xz`, `digital-ocean-amd64.raw.xz`) was confirmed to be served by `factory.talos.dev` with a 200 response.
- Version `v1.9.0` is used throughout as an illustrative version. As of the validation date, the current Talos release is `v1.13.2`. The post is not dated to a specific version, so this is fine, but readers in the future may want to substitute a current version tag.
- The `imager` example uses extension tags like `ghcr.io/siderolabs/intel-ucode:latest`. The Talos docs typically pin extensions to a Talos-version-aligned tag plus digest (e.g. `:20231114@sha256:...`). Using `:latest` may work but is not the documented best practice; left unchanged because it is not technically incorrect and the post is intentionally illustrative.
