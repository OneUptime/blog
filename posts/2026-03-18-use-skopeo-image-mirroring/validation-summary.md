# Validation Summary: How to Use Skopeo for Image Mirroring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Skopeo
- Podman
- OCI/Docker-compatible container registries
- systemd
- Bash
- `jq`

## Sources Consulted
- Skopeo repository documentation: https://github.com/containers/skopeo
- `skopeo copy` manual: https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md
- `skopeo sync` manual: https://github.com/containers/skopeo/blob/main/docs/skopeo-sync.1.md
- Podman `pull` manual: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman `run` manual: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- `containers-registries.conf` manual: https://github.com/containers/image/blob/main/docs/containers-registries.conf.5.md
- systemd timer documentation: https://www.freedesktop.org/software/systemd/man/devel/systemd.timer.html
- systemd time syntax documentation: https://www.freedesktop.org/software/systemd/man/systemd.time.html

## Issues Found
- The local registry startup example used the short image name `registry:2`. I changed it to `docker.io/library/registry:2` because Podman documents unqualified names as short-name references that depend on local short-name resolution.
- The mirror verification example used `podman pull nginx:1.25`. I changed it to `podman pull docker.io/library/nginx:1.25` so the mirror behavior is deterministic and does not depend on short-name aliases or `unqualified-search-registries`.
- The systemd service unit only used `After=network-online.target`. I added `Wants=network-online.target` because `After=` orders startup but does not pull that target in by itself.

## Review Notes
- The Skopeo `copy` and `sync` command syntax, including `--all`, `--dest-tls-verify=false`, `--src yaml`, and the YAML repository format, matches the current upstream documentation.
- The Podman mirror configuration is correct for pull-time mirroring and fallback behavior, but it applies when reading images, not when pushing or doing unrelated registry lookups, per `containers-registries.conf(5)`.
- The `OnCalendar=*-*-* 0/4:00:00` expression is valid systemd calendar syntax for a four-hour schedule, though equivalent shorter forms also work.
