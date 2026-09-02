# Validation Summary: How to Back Up and Restore Apache Geode Persistent Regions with `gfsh backup disk-store`

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Apache Geode
- `gfsh`
- Persistent regions and disk stores
- Full and incremental online backups
- Offline disk-store validation
- PDX metadata persistence
- Persistent asynchronous event queues and gateway sender queues
- Disaster recovery and restore procedures

## Sources Consulted

- [Creating backups for system recovery and operational management](https://geode.apache.org/docs/guide/latest/managing/disk_storage/backup_restore_disk_store.html)
- [`backup disk-store` command](https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/backup.html)
- [Disk-store management commands and online/offline rules](https://geode.apache.org/docs/guide/latest/managing/disk_storage/managing_disk_stores_cmds.html)
- [Validating a disk store](https://geode.apache.org/docs/guide/latest/managing/disk_storage/validating_disk_store.html)
- [How disk stores work](https://geode.apache.org/docs/guide/latest/managing/disk_storage/how_disk_stores_work.html)
- [Designing and configuring disk stores](https://geode.apache.org/docs/guide/latest/managing/disk_storage/using_disk_stores.html)
- [Persisting an event queue](https://geode.apache.org/docs/guide/latest/developing/events/configuring_highly_available_gateway_queues.html)
- [Starting and shutting down with disk stores](https://geode.apache.org/docs/guide/latest/managing/disk_storage/starting_system_with_disk_stores.html)
- [Handling missing disk stores](https://geode.apache.org/docs/guide/latest/managing/disk_storage/handling_missing_disk_stores.html)
- [Building a new region with existing content](https://geode.apache.org/docs/guide/latest/basic_config/data_regions/new_region_existing_data.html)

## Issues Found

- The post named the marker left by a failed member backup as `INCOMPLETE_BACKUP_FILE`. Apache Geode's documentation specifies the exact filename as `INCOMPLETE_BACKUP`. Corrected all three occurrences so the proposed validation check and operational guidance search for the marker Geode actually creates.

## Review Notes

- The `backup disk-store` and `validate offline-disk-store` command names and options are current and match the official command documentation.
- The guidance correctly distinguishes online cluster-wide backup from offline validation, requires all disk directories for a store, and accounts for incremental restore-script dependencies.
- The backup contents, restore-script behavior, PDX metadata warning, queue-consistency warning, startup ordering, and irreversible effect of revoking a missing disk store agree with the official documentation.
- All seven external links in the post's Official References section resolved successfully during review.
