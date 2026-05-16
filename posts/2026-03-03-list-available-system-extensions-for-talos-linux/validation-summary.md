# Validation Summary: How to List Available System Extensions for Talos Linux

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Talos Linux (system extensions, machine configuration)
- Talos Image Factory (factory.talos.dev)
- talosctl CLI
- `crane` (go-containerregistry) for inspecting OCI images
- GitHub Container Registry (ghcr.io)
- siderolabs official extension catalog

## Sources Consulted
- Talos Image Factory API reference: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Live Image Factory API: https://factory.talos.dev/version/v1.7.0/extensions/official (used to enumerate the actual list of official extensions and their real tags)
- siderolabs/extensions repository: https://github.com/siderolabs/extensions
- Talos docs (boot assets / image factory): https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/boot-assets/
- siderolabs/talos issue #9224 (deprecation of `.machine.install.extensions`)
- Talos "What's New" notes for v1.10 (confirms `machine.install.extensions` no longer has effect)

## Issues Found

1. **Non-existent `chrony` extension.** The post listed `ghcr.io/siderolabs/chrony` under a "Time Synchronization" section. Chrony is not a published Talos system extension (Talos has built-in time sync via its `timed` service). Removed the section and dropped the "Time sync alternatives (Chrony)" bullet from the use-cases list.

2. **Non-existent `lm-sensors` extension.** The post listed `ghcr.io/siderolabs/lm-sensors`. This extension is not in the official catalog (verified via the Image Factory API). Removed.

3. **Non-existent generic `firmware` extension.** The post listed `ghcr.io/siderolabs/firmware`. There is no generic `firmware` extension; Talos publishes device-specific firmware extensions instead. Replaced with the real ones: `amdgpu-firmware`, `chelsio-firmware`, `intel-ice-firmware`, `qlogic-firmware`, `realtek-firmware`.

4. **Wrong VMware extension name.** The post used `ghcr.io/siderolabs/open-vm-tools`. The actual official extension is `ghcr.io/siderolabs/vmtoolsd-guest-agent` (it ships `talos-vmtoolsd`, not upstream `open-vm-tools`). Fixed, and added the related `xen-guest-agent` for completeness in the same Guest Agents section.

5. **Wrong Image Factory API endpoint for listing extensions.** The post used `curl -s https://factory.talos.dev/schematics | jq .` as a way to "get available extensions for a specific Talos version". `/schematics` only accepts `POST` (to create a schematic) — it does not return an extension list. Replaced with the correct endpoint `GET /version/<version>/extensions/official`.

6. **Broken API docs URL.** The post pointed to `https://factory.talos.dev/docs`, which returns 404. Replaced with the actual API reference location on GitHub (`siderolabs/image-factory/blob/main/docs/api.md`).

7. **Wrong claim about extension tag conventions.** The post stated tags "typically match Talos versions e.g., v1.7.0, v1.7.1, v1.8.0". Only kernel-module extensions carry a `-v<talos-version>` suffix; userspace tools and firmware extensions use their own upstream or date-based versions (e.g., `tailscale:1.62.1`, `intel-ucode:20240312`, `iscsi-tools:v0.1.4`). Rewrote the explanation and pointed readers at the Image Factory API as the source of truth for compatible tags.

8. **Invalid tag in machine config example.** The example pinned `ghcr.io/siderolabs/iscsi-tools:v1.7.0`, but `iscsi-tools` is published with its own versioning (`v0.1.4`, etc.) — that tag does not exist. Also, `machine.install.extensions` itself is deprecated and has no effect in Talos v1.10+. Replaced the snippet with the recommended Image Factory approach (`machine.install.image` pointing at a factory installer with extensions baked in).

9. **Stale tag in `crane manifest`/`crane export` examples.** The "Inspecting Extension Details" snippets referenced `iscsi-tools:v1.7.0`, which doesn't exist. Updated to `v0.1.4` to match a real published tag.

10. **`officialExtensions` payload format** was already correct as an array of strings (verified against the API reference). No change needed there.

## Review Notes

- Other technical claims hold up: `talosctl get extensions` (and `-o yaml`) is the correct command for listing installed extensions on a node; `crane ls ghcr.io/siderolabs/<ext>` does work against the GHCR-hosted extension repositories; the `siderolabs/extensions` repository layout is accurate.
- Versions used in examples are pinned to Talos v1.7 throughout (kept consistent with the original post). Readers on newer Talos releases should substitute the matching version when calling the Image Factory API. The "Pin extension versions" best practice in the post combined with the new note about the Image Factory being the source of truth for compatible tags should keep readers on safe ground.
- The "Creating a Custom Extension List" YAML is illustrative documentation (not a real Talos schema), so the lack of tags there is intentional and was left alone.
