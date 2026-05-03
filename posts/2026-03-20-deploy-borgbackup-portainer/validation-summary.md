# Validation Summary: How to Deploy BorgBackup with Borgmatic via Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- BorgBackup (Borg)
- Borgmatic (1.8.x)
- Docker / Docker Compose
- Portainer
- SSH (for remote repository transport)

## Sources Consulted
- Borgmatic official docs: https://torsion.org/borgmatic/
- Borgmatic command-line reference: https://torsion.org/borgmatic/docs/reference/command-line/
- Borgmatic NEWS / changelog: https://github.com/borgmatic-collective/borgmatic/blob/main/NEWS
- borgmatic-collective Docker image README: https://github.com/borgmatic-collective/docker-borgmatic
- BorgBackup official docs (URL formats): https://borgbackup.readthedocs.io/en/stable/usage/general.html
- Borgmatic "set up backups" guide: https://torsion.org/borgmatic/docs/how-to/set-up-backups/

## Issues Found

1. **Outdated sectioned config format.** The original post used the deprecated sectioned `config.yaml` format with top-level `location:`, `storage:`, `retention:`, and `consistency:` keys. The sectioned format was deprecated in borgmatic 1.8.0 (Aug 2023) and emits warnings; in borgmatic 1.9+/2.x it has been further restricted. Converted the example to the current flat format (all options at top level).

2. **Incorrect cron environment variables for the borgmatic-collective image.** The post used `BORGMATIC_CRON_MINUTE`, `BORGMATIC_CRON_HOUR`, `BORGMATIC_CRON_DAY`, `BORGMATIC_CRON_MONTH`, and `BORGMATIC_CRON_WEEKDAY`. The official `borgmatic-collective/docker-borgmatic` image does not recognize these variables. The supported variable is a single `BACKUP_CRON` containing a full cron expression (default `0 1 * * *`). Replaced the five variables with `BACKUP_CRON=0 2 * * *` (preserving the original 02:00 daily schedule).

3. **Deprecated `borgmatic init` action.** The `borgmatic init` action was deprecated in favor of `borgmatic repo-create` and was removed entirely in borgmatic 1.9.0. While it still works in 1.8.x with a warning, the modern, forward-compatible command is `borgmatic repo-create`. Updated Step 3 to use `repo-create`.

4. **Overstated config permission requirement.** The comment said "borgmatic requires 0600". borgmatic does not strictly enforce 0600 in 1.8.x — it warns when config permissions are insecure. Softened the comment to "borgmatic warns on insecure permissions" while keeping the `chmod 600` command, which is still the right hardening step.

## Review Notes
- The image tag `ghcr.io/borgmatic-collective/borgmatic:1.8.14` is a real upstream borgmatic version. The borgmatic-collective Docker image also publishes 2.x tags; readers who want the latest features (and the fully removed sectioned-config support) should consider pinning to a 2.x tag, but 1.8.14 remains a valid choice for the post.
- The Borg SSH repository URL `ssh://user@backup-server:22/~/backups/myserver` is valid Borg syntax (path is relative to the SSH user's home directory).
- `borgmatic list --archive latest`, `borgmatic create --verbosity 1`, `borgmatic check`, and `borgmatic extract --archive latest --path ... --destination ...` are all valid current borgmatic CLI usage.
- `/etc/borgmatic.d` is the correct config mount path for the borgmatic-collective image.
- Mounting `/var/lib/docker/volumes` read-only as the backup source works but will pick up *all* Docker volumes on the host; readers may prefer to be more selective. This is a design choice, not a technical error, so it was left as written.
- Future maintenance: when this guide is next refreshed, consider migrating the example to a borgmatic 2.x image tag and dropping the deprecated `init` reference entirely.
