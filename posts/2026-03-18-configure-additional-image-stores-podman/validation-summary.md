# Validation Summary: How to Configure Additional Image Stores in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- containers/storage
- containers-storage.conf
- Overlay storage driver
- Rootless container image storage
- Shell commands

## Sources Consulted
- Podman manual: `podman(1)` storage configuration files and `CONTAINERS_STORAGE_CONF`: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman manual: `podman-info(1)` `--format` and `.Store` output: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman manual: `podman-images(1)` read-only images and `additionalimagestores`: https://docs.podman.io/en/latest/markdown/podman-images.1.html
- Podman manual: `podman-run(1)` pulling behavior when an image is not already loaded: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman manual: `podman-system-reset(1)` behavior and destructive scope: https://docs.podman.io/en/latest/markdown/podman-system-reset.1.html
- containers/storage manual: `containers-storage.conf(5)` storage tables, `additionalimagestores`, `force_mask`, `mount_program`, `graphroot`, and `runroot`: https://github.com/containers/storage/blob/main/docs/containers-storage.conf.5.md
- Upstream sample `storage.conf`: https://github.com/containers/storage/blob/main/storage.conf

## Issues Found
- The post described additional image stores as "read-only overlay stores." I changed this to "read-only container image stores" because `additionalimagestores` is a containers/storage image-store setting, not inherently an overlay-store concept.
- The shared-store setup used `chmod -R 755` on the container storage tree. This can alter extracted image-layer file permissions. I replaced it with the documented overlay `force_mask = "shared"` setting and added the required `mount_program = "/usr/bin/fuse-overlayfs"` setting for the shared store configuration.
- The examples used `mountopt = "nodev,metacopy=on"` throughout. I changed these to the documented portable `nodev` mount option, especially because the shared-store examples now use `fuse-overlayfs` via `mount_program`.
- The update script did not preserve the same shared-store readability settings used during initial population. I added the same overlay settings to the generated storage configuration in the update script.
- The user configuration included `ignore_chown_errors = "true"` even though that option is for single-UID rootless environments and can squash image UIDs. I removed it from the general-purpose examples.
- The guide told users to run `podman system reset --force` to pick up the new `additionalimagestores` configuration. The official Podman manual documents this command as destructive and only required before changing specific fields such as `driver`, `static_dir`, `tmp_dir`, or `volume_path`. I replaced that step with a warning to start a new Podman command and avoid reset unless intentionally removing local storage.
- The verification comments claimed `podman image inspect` proved the image came from the additional store and that `du` proved no local copy was created. Those commands do not prove those exact claims, so I adjusted the comments to state what they actually verify.
- The troubleshooting section suggested `podman system reset --force` as a normal retry step. I changed it to a commented command with a warning that it removes local Podman storage.

## Review Notes
The post is technically relevant and valid after the corrections. `force_mask = "shared"` is documented for root-owned storage shared to rootless users as an additional store, but the upstream manual notes that it is experimental and makes files readable/executable by any user on the system; administrators should account for that exposure when choosing images for a shared store. The local environment did not have `podman` installed, so CLI behavior was checked against official Podman manuals rather than local `--help` output.
