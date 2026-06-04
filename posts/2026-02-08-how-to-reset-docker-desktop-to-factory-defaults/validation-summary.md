# Validation Summary: How to Reset Docker Desktop to Factory Defaults

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker Desktop
- Docker CLI
- Docker Compose
- Docker volumes and images
- Docker Desktop Kubernetes
- macOS
- Windows with WSL 2
- Linux

## Sources Consulted
- Docker Docs: Troubleshoot Docker Desktop - https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/
- Docker Docs: Change your Docker Desktop settings - https://docs.docker.com/desktop/settings-and-maintenance/settings/
- Docker Docs: Back up and restore Docker Desktop data - https://docs.docker.com/desktop/settings-and-maintenance/backup-and-restore/
- Docker Docs: Uninstall Docker Desktop - https://docs.docker.com/desktop/uninstall/
- Docker Docs: WSL 2 on Docker Desktop for Windows - https://docs.docker.com/docker-for-windows/wsl/
- Docker Docs: Docker image save - https://docs.docker.com/reference/cli/docker/image/save/
- Docker Docs: Docker volumes backup and restore - https://docs.docker.com/engine/storage/volumes/
- Docker Docs: Docker Compose config - https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Docs: Docker system prune - https://docs.docker.com/reference/cli/docker/system/prune/
- Docker Docs: Docker volume prune - https://docs.docker.com/reference/cli/docker/volume/prune/
- Local Docker CLI help output for prune, image save, and image listing commands.

## Issues Found
- Docker Desktop settings backup and restore used `settings.json`. Docker's current settings documentation identifies the file as `settings-store.json`, so the macOS and Windows commands were updated to use `settings-store.json` and a matching backup filename.
- The Docker Desktop GUI reset path described navigating through Settings. Docker's troubleshooting documentation points users to the Docker menu's Troubleshoot item or the Dashboard Troubleshoot icon, so the GUI steps were corrected.
- The macOS command-line reset removed `~/Library/Containers/com.docker.docker` before separately removing its VM directory, making the VM removal command redundant. The VM disk removal line was moved before the broader data directory removal.
- The Windows WSL reset commands assumed `docker-desktop-data` always exists. Docker Desktop 4.30 and later no longer creates it on fresh installs, while upgraded installs may still have it, so a caveat was added.
- The Linux reset command removed `~/.local/share/docker`, which was not part of the official Docker Desktop Linux uninstall/reset data paths consulted. That line was removed.
- The partial reset comments overstated what `docker system prune` removes. They now say it removes stopped containers, unused images, unused networks, and build cache, and that `--volumes` includes unused anonymous volumes.
- The volume cleanup command used `docker volume prune -f` while describing removal of unused volumes generally. Current Docker CLI reference says named volumes require `--all`, so the command was changed to `docker volume prune -a -f`.

## Review Notes
The post is technically relevant and contains many destructive commands. The corrected commands now align more closely with current Docker Desktop and Docker CLI documentation, but readers should still treat manual reset commands as fallback procedures and prefer Docker Desktop's built-in Troubleshoot reset flow when available.
