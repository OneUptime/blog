# Validation Summary: How to Configure ZFS Automatic Scrubbing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- OpenZFS / ZFS
- zpool CLI
- systemd timers and services
- cron
- Bash monitoring script

## Sources Consulted
- OpenZFS zpool-scrub(8): https://openzfs.github.io/openzfs-docs/man/v2.3/8/zpool-scrub.8.html
- OpenZFS zpool-status(8): https://openzfs.github.io/openzfs-docs/man/master/8/zpool-status.8.html
- OpenZFS zpool-clear(8): https://openzfs.github.io/openzfs-docs/man/v2.2/8/zpool-clear.8.html
- OpenZFS zfsprops(7) checksum property documentation: https://openzfs.github.io/openzfs-docs/man/v2.3/7/zfsprops.7.html
- Ubuntu Noble zpool(8) manpage: https://manpages.ubuntu.com/manpages/noble/man8/zpool.8.html
- Ubuntu zfsutils-linux package metadata and installed file contents for 2.2.2-0ubuntu9.4, inspected via `apt show`, `apt-get download`, and `dpkg-deb -c/-x`

## Issues Found
- The post said ZFS writes a cryptographic checksum with every block. OpenZFS checksums every block, but the default is commonly Fletcher4, while cryptographic checksum algorithms such as SHA-256 are optional. Updated the explanation to avoid overstating the default.
- The post said unrepaired scrub errors are only possible when no redundancy is available. Redundant pools can still have unrepaired errors if multiple copies are damaged or unavailable. Updated that sentence.
- The post said Ubuntu configures monthly scrubs via systemd timers when a pool is created. Current Ubuntu `zfsutils-linux` packages provide weekly/monthly per-pool timers, but also ship a default `/etc/cron.d/zfsutils-linux` monthly scrub job. Updated the automatic-scrub section to mention both and to avoid claiming timers are always auto-enabled.
- The post showed outdated/incorrect systemd unit contents. Current Ubuntu Noble packages use `zfs-scrub-monthly@.timer` with `RandomizedDelaySec=1h` and `Unit=zfs-scrub@%i.service`, and the service is `zfs-scrub@.service`, not `zfs-scrub-monthly@.service`. Updated the sample timer status and unit snippets.
- The post claimed scheduled scrubs run with `Nice=19` and `IOSchedulingClass=idle`. Those directives are not present in the current Ubuntu packaged `zfs-scrub@.service`. Replaced that note with the accurate `ConditionACPower=true` behavior and removed the broader "low priority" statement from the performance section.

## Review Notes
The CLI examples for `zpool scrub`, `zpool scrub -s`, `zpool status -v`, and `zpool clear` match current OpenZFS/Ubuntu manpages. The monitoring script is intentionally simple; for production, a future revision could capture and email the full error details instead of relying on cron output or a one-line mail body.
