# Validation Summary: How to Create a Custom System Extension for Talos

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.5+ extension model)
- Talos system extensions (OCI image format)
- Talos Image Factory and `imager` tool
- `talosctl` CLI
- Docker / OCI multi-stage builds
- Go (Go 1.22, `net/http`)
- Kernel module build flow (Siderolabs `pkgs` / `tools` images)
- GitHub Actions CI matrix builds

## Sources Consulted
- Talos system extensions guide: https://docs.siderolabs.com/talos/v1.10/build-and-extend-talos/custom-images-and-development/system-extensions
- Siderolabs extensions repository: https://github.com/siderolabs/extensions
- Example extension (hello-world-service):
  - https://github.com/siderolabs/extensions/tree/main/examples/hello-world-service
  - `pkg.yaml`: https://raw.githubusercontent.com/siderolabs/extensions/main/examples/hello-world-service/pkg.yaml
  - `hello-world.yaml`: https://raw.githubusercontent.com/siderolabs/extensions/main/examples/hello-world-service/hello-world.yaml
  - `manifest.yaml.tmpl`: https://raw.githubusercontent.com/siderolabs/extensions/main/examples/hello-world-service/manifest.yaml.tmpl
- Real-world service definitions consulted for valid fields:
  - Tailscale: https://raw.githubusercontent.com/siderolabs/extensions/main/network/tailscale/tailscale.yaml
  - QEMU guest agent: https://raw.githubusercontent.com/siderolabs/extensions/main/guest-agents/qemu-guest-agent/qemu-guest-agent.yaml
  - Cloudflared: https://raw.githubusercontent.com/siderolabs/extensions/main/network/cloudflared/cloudflared.yaml
- Talos Image Factory: https://factory.talos.dev
- Image Factory project: https://github.com/siderolabs/image-factory

## Issues Found

1. **OCI image layout missing `rootfs/` prefix.** A Talos extension image places all filesystem content under a top-level `rootfs/` directory, with only `manifest.yaml` at the image root. The original Dockerfile copied files directly to `/usr/local/bin/...`, `/usr/local/etc/containers/...`, and `/lib/modules/...`. Fixed both Dockerfiles (service and kernel module) and the "Keep Extensions Small" example to use `/rootfs/...`. Also updated the "Understanding the Extension Format" intro to explicitly describe the `rootfs/` directory.

2. **Kernel module install path wrong.** The post listed `/lib/modules/<kernel-version>/extras/my-module.ko` as the destination for kernel module extensions. The approved path is under `/usr/lib/modules/`. Fixed in the Types of Extensions section and in the kernel module Dockerfile.

3. **Firmware install path wrong.** The post listed `/lib/firmware/my-hardware/firmware.bin`. The approved path is under `/usr/lib/firmware/`. Fixed in the Types of Extensions section.

4. **Service definition contained non-existent / invalid fields.** The original `health-agent.yaml` used:
   - `environment:` as a map (`HEALTH_PORT: "8081"`) — Talos extension services take `environment` as a list of `KEY=VALUE` strings (verified against tailscale and cloudflared service definitions).
   - `security: { readOnlyRootFilesystem: true, runAsUser: 0 }` — those fields are Kubernetes pod-security fields, not Talos extension service fields. The supported Talos fields are `writeableRootfs` and `writeableSysfs`. Removed the `security` block entirely since the default (read-only rootfs, root user) matches what the post was asking for.
   - `depends: [{ service: machined, condition: running }]` — Talos extension service `depends` entries do not accept a `condition` key. Replaced with a valid network dependency (`network: [addresses]`) so the service waits until the node has an IP, which matches the post's intent for an HTTP listener.
   - `mounts: []` — unnecessary; removed.

5. **Deprecated `.machine.install.extensions` field.** Since Talos v1.5, system extensions are no longer installed via `machine.install.extensions` in the machine configuration — they must be baked into the installer (or boot) image. Two places were affected:
   - The "Local Testing" section showed `talosctl patch machineconfig` adding an extension under `/machine/install/extensions`. Replaced with the modern `imager`-based workflow plus a pointer to the Image Factory.
   - The "Include in Machine Configuration" example showed `machine.install.extensions`. Rewrote to set `machine.install.image` to a Factory-built custom installer.

## Review Notes

- The post still uses Talos v1.7 references throughout. As of mid-2026, v1.7 is several minor versions behind current. The extension authoring workflow described is still substantially correct against newer releases, but a future refresh should bump the Talos version pins (`ghcr.io/siderolabs/installer`, `pkgs`, `tools`, `imager`, GitHub Actions matrix) and re-check field names against the latest docs.
- The "Using the Official Extensions Framework" section is intentionally light on detail — it describes the high-level workflow (clone repo, drop files in, run `make`) without showing a full `pkg.yaml`. That is fine for the post's scope, but readers who follow that path will need to consult the example in `siderolabs/extensions/examples/hello-world-service` for the real `pkg.yaml` schema (it uses the `bldr` tool, not a Dockerfile).
- The Go example uses Go 1.22, which is fine for the example but older than current stable. Not a correctness issue.
- The post does not mention that the Image Factory requires extensions to be available at a publicly resolvable OCI registry to be referenced in a schematic; users with private extensions will need the `imager` route. The updated Local Testing section now mentions both paths.
