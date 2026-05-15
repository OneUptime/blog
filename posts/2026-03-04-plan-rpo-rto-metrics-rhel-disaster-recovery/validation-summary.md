# Validation Summary: How to Plan RPO and RTO Metrics for RHEL Disaster Recovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Disaster recovery planning
- RPO and RTO metrics
- cron
- rsync
- GNU tar
- DRBD
- Relax-and-Recover (ReaR)
- PostgreSQL streaming replication
- MySQL replication

## Sources Consulted
- NIST SP 800-34 Rev. 1, Contingency Planning Guide for Federal Information Systems: https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-34r1.pdf
- Red Hat Enterprise Linux 9 documentation, Recovering and restoring a system with ReaR: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- Relax-and-Recover User Guide, Introduction: https://relax-and-recover.org/rear-user-guide/basics/introduction.html
- LINBIT DRBD User's Guide, replication protocol descriptions: https://linbit.com/drbd-user-guide/drbd-guide-9_0-en/
- rsync official project and man page links: https://rsync.samba.org/
- Local `rsync --help` output for `-a` and `-z` option syntax.
- Local GNU `tar --help` output for `xzf` and `-C` extraction syntax.
- Local `crontab(5)` manual page for cron field format and system crontab user field behavior.

## Issues Found
- The post described DRBD as a near-zero RPO replication option without specifying synchronous replication. DRBD supports multiple replication protocols, and the near-zero/no-single-node-data-loss behavior depends on synchronous replication. Updated the comment to "Synchronous DRBD for block-level replication (near-zero RPO)".

## Review Notes
- The cron examples are syntactically valid for system crontab-style files under `/etc/cron.d`, which include a username field before the command.
- The `rsync -az` example uses valid options: archive mode plus compression.
- The `tar xzf ... -C ...` recovery-test command uses valid GNU tar extraction syntax for a gzip-compressed tar archive.
- The measurement scripts are suitable as examples for timing backup and restore operations, but a production version should also check command exit statuses and validate restored service behavior, not only archive extraction time.
