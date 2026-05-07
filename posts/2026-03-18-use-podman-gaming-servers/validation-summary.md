# Validation Summary: How to Use Podman for Gaming Servers

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman
- Podman Quadlet / systemd user services
- Minecraft Java server (`itzg/minecraft-server`)
- Valheim dedicated server container
- Terraria server container
- Counter-Strike 2 dedicated server container
- Factorio headless server container
- Bash and cron

## Sources Consulted
- Podman `run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `ps` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-ps.1.html
- Podman `update` documentation: https://docs.podman.io/en/v5.4.2/markdown/podman-update.1.html
- Podman volume-mount documentation: https://docs.podman.io/en/v4.3/markdown/options/volume.html
- Podman Quadlet/systemd documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- systemd `loginctl` documentation: https://www.freedesktop.org/software/systemd/man/loginctl.html
- `itzg/docker-minecraft-server` server properties docs: https://github.com/itzg/docker-minecraft-server/blob/master/docs/configuration/server-properties.md
- `itzg/docker-minecraft-server` mods and plugins docs: https://github.com/itzg/docker-minecraft-server/blob/master/docs/mods-and-plugins/index.md
- Forge server-type docs for `itzg/minecraft-server`: https://docker-minecraft-server.readthedocs.io/en/latest/types-and-platforms/server-types/forge/
- `itzg/docker-mc-backup` README: https://github.com/itzg/docker-mc-backup
- `community-valheim-tools/valheim-server-docker` README: https://github.com/community-valheim-tools/valheim-server-docker
- `ryansheehan/terraria` README: https://github.com/ryansheehan/terraria
- `joedwards32/CS2` README: https://github.com/joedwards32/CS2
- `factoriotools/factorio-docker` README: https://github.com/factoriotools/factorio-docker

## Issues Found
- The Terraria example used unsupported `AUTOCREATE`, `DIFFICULTY`, and `MAXPLAYERS` environment variables for `ryshe/terraria`. I replaced it with the upstream-supported flow: create the world once by passing `-world ... -autocreate 2` as container arguments, then start the server with `WORLD_FILENAME`.
- The management script filtered `all-status` by `label=type=gameserver`, but the article's concrete `podman run` examples did not set that label. I added `--label type=gameserver` to the long-running server examples so the script works as shown.
- The management script used `podman ps`, which only lists running containers. I changed the `status` and `all-status` commands to `podman ps -a` so stopped servers still report a status.
- The resource-management example set `--memory-swap=4g` together with `--memory=4g`. Current Podman requires `--memory-swap` to be larger than `--memory`, so I corrected the example to `--memory-swap=8g`.
- The Minecraft backup sequence ran `save-all` before `save-off`, which does not pause world writes before the archive step. I reordered it to `save-off` followed by `save-all` to match the upstream backup coordination approach.
- The rootless systemd section claimed boot startup without mentioning lingering or enabling the generated service. I clarified that `loginctl enable-linger "$USER"` is required for rootless boot startup and added the `systemctl --user daemon-reload` and `systemctl --user enable --now minecraft.service` steps.

## Review Notes
- No remaining technical inaccuracies were found after these fixes.
- The container images in this post are community-maintained images, so their upstream GitHub/Read the Docs documentation is the authoritative source for image-specific environment variables and startup behavior.
- The post's named-volume examples are valid with Podman. If a reader switches some examples to bind mounts instead, upstream docs for images such as CS2 and Factorio call out additional host-permission setup that may be required.
