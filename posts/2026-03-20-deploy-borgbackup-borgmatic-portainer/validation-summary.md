# Validation Summary: How to Deploy BorgBackup with Borgmatic via Portainer

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- BorgBackup (Borg)
- Borgmatic (configuration-driven Borg wrapper)
- Portainer (Docker stack management)
- Docker / Docker Compose
- Healthchecks.io (monitoring integration)
- ntfy (push-notification integration)

## Sources Consulted
- borgmatic-collective/docker-borgmatic README — environment variables (`BACKUP_CRON`, `RUN_ON_STARTUP`, `TZ`, `BORG_PASSPHRASE`) and config-mount path: https://github.com/borgmatic-collective/docker-borgmatic
- Borgmatic configuration reference: https://torsion.org/borgmatic/docs/reference/configuration/
- Borgmatic "Set up backups" how-to (repo-create / init transition): https://torsion.org/borgmatic/docs/how-to/set-up-backups/
- Borgmatic "Inspect your backups" how-to (list vs repo-list): https://torsion.org/borgmatic/docs/how-to/inspect-your-backups/
- Borgmatic "Extract a backup" how-to (mount/extract flags): https://torsion.org/borgmatic/docs/how-to/extract-a-backup/
- Borgmatic "Add preparation and cleanup steps" how-to (modern `commands:` hook syntax): https://torsion.org/borgmatic/docs/how-to/add-preparation-and-cleanup-steps-to-backups/
- Borgmatic "Monitor your backups" how-to (healthchecks/ntfy schemas): https://torsion.org/borgmatic/docs/how-to/monitor-your-backups/

## Issues Found

1. **Wrong cron environment variable.** The post used `BORGMATIC_CRON=0 2 * * *`, but the official `ghcr.io/borgmatic-collective/borgmatic` image uses `BACKUP_CRON`. Changed the variable name accordingly.

2. **Deprecated `init` action.** The post used `borgmatic init --encryption repokey-blake2`. Since borgmatic 1.9.0, the action is named `repo-create`; `init` still works as a back-compat alias but emits a deprecation warning. Updated to `borgmatic repo-create --encryption repokey-blake2` and added a short comment indicating that `borgmatic init` is the equivalent for pre-1.9.0 versions.

3. **Incorrect `healthchecks` hook schema.** The post used `healthchecks: https://hc-ping.com/your-check-uuid` (bare URL). The borgmatic schema requires an object with a `ping_url` field. Changed to `healthchecks:\n  ping_url: https://hc-ping.com/your-check-uuid`.

4. **Deprecated `on_error` hook.** The post used the deprecated top-level `on_error:` list. Modern borgmatic replaces this with the structured `commands:` hook (`after: error`). Replaced the snippet with the equivalent `commands:` form.

## Review Notes

- The `archive_name_format: "{hostname}-{now}"` is valid Borg placeholder syntax. The borgmatic default is `"{hostname}-{now:%Y-%m-%dT%H:%M:%S.%f}"` for Borg 1.x; using a less specific `{now}` produces a coarser timestamp but is still accepted.
- `borgmatic list` is still valid for listing archives; `borgmatic repo-list` (1.9.0+) is the newer, preferred form for Borg 2.x users but the post's choice works in current versions.
- The `compose` `version: "3.8"` field is now ignored by Docker Compose v2 but does not cause errors. Left as-is.
- The `ntfy` snippet (just `topic` and `server`) is minimal but valid; only `topic` is strictly required.
- The mounted config path `/etc/borgmatic.d/config.yaml` is correct — the borgmatic-collective image looks for configuration files in `/etc/borgmatic.d/`.
- Mount/extract flags (`--mount-point`, `--archive`, `--path`) match the current borgmatic CLI.
