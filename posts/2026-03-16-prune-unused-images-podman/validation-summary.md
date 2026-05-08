# Validation Summary: How to Prune Unused Images with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container images
- Image pruning
- System pruning
- systemd user timers
- cron
- Linux disk usage monitoring

## Sources Consulted
- Podman `podman image prune` documentation: https://docs.podman.io/en/v3.0/markdown/podman-image-prune.1.html
- Podman `podman system prune` documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman `podman images` documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman `podman rmi` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-rmi.1.html
- Podman `podman system df` documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `podman ps` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- systemd timer documentation: https://www.freedesktop.org/software/systemd/man/devel/systemd.timer.html
- crontab documentation: https://man7.org/linux/man-pages/man5/crontab.5.html

## Issues Found
- The post said `podman image prune -a` removes images not associated with a running container. Podman removes unused images that have no containers based on them, including stopped containers, so the wording was changed to "any container" and "referenced by any container."
- The `podman system prune` wording implied volume cleanup was part of the general operation and omitted pods in the command comment. Podman's documentation says volumes are pruned only with `--volumes`, and system prune also removes unused pods, so the wording and command comment were updated.
- The preview script matched images by repository/tag against `podman ps -a --format "{{.Image}}"`, which can misidentify images when the same image has multiple tags or when a container stores an image ID. It now compares image IDs against `{{.ImageID}}` with fixed-string matching.
- The cron setup command used `crontab -l 2>/dev/null; echo ... | crontab -`, which pipes only the new entry into `crontab` and can discard existing entries. It was corrected to group the existing crontab and new entry before piping to `crontab -`.
- The storage directory comment implied a universal path while the command showed the rootless Podman storage location. The comment was clarified as rootless storage.

## Review Notes
Podman was not installed in the local environment, so command behavior was checked against official Podman documentation rather than local `--help` output. The current Podman documentation notes that `podman system df` image reclaimable size can be an estimate when images share layers.
