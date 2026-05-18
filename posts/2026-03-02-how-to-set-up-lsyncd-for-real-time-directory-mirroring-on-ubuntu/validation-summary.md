# Validation Summary: How to Set Up Lsyncd for Real-Time Directory Mirroring on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- lsyncd (Live Syncing Daemon)
- rsync
- Linux inotify
- Lua (used for lsyncd configuration)
- SSH / ssh-keygen / ssh-copy-id
- systemd (service unit configuration)
- Ubuntu apt package management
- sysctl (kernel parameter tuning for inotify watches)

## Sources Consulted
- Official lsyncd manual / documentation: https://lsyncd.github.io/lsyncd/manual/
- lsyncd config layer 4 (rsync / rsyncssh) reference: https://lsyncd.github.io/lsyncd/manual/config/layer4/
- lsyncd config settings reference: https://lsyncd.github.io/lsyncd/manual/config/settings/
- rsync man page (for `--archive`, `--compress`, `--delete`, `--bwlimit`, `--inplace`, `-e` semantics)
- Linux inotify(7) man page (for `/proc/sys/fs/inotify/max_user_watches`)
- systemd.unit / systemd.service documentation
- Ubuntu packages (`lsyncd`, `rsync`) in the universe repository

## Issues Found
- **Default `delay` value**: The post originally said lsyncd accumulates events for a default of 20 seconds. The actual default for the `delay` parameter in lsyncd is 15 seconds per the official lsyncd manual. Updated the text to say "default 15 seconds".
- **Misleading `--nodaemon` comment**: The Testing the Configuration section originally described `lsyncd --nodaemon ...` as testing "the config file syntax without starting", which is misleading — `--nodaemon` actually starts lsyncd in the foreground (config syntax is validated as part of startup, but the daemon does run). Updated the comments to make it clear both invocations run lsyncd in the foreground, and consolidated the second example to also include `--nodaemon` alongside `--log all` so it actually runs in the foreground as the comment implies.

## Review Notes
- For the rsyncssh example, the post uses `_extra = { ..., "-e", "ssh -i /home/www/.ssh/lsyncd_key ..." }` to pass an SSH command. The canonical lsyncd approach for `default.rsyncssh` is to use a top-level `ssh = { port = ..., identityFile = "..." }` block in the sync, which lets lsyncd construct the `-e ssh ...` invocation itself. Passing `-e` via `rsync._extra` can work but is non-idiomatic and may conflict with options lsyncd adds automatically in some configurations. Left as-is since it is not strictly incorrect, but worth refactoring to use the `ssh` table in the future.
- `bwlimit = 50000` is in KiB/s (rsync's default unit when no suffix is given), which is ~48.83 MiB/s. The post rounds this to "50 MB/s", which is a reasonable approximation.
- The default `maxProcesses` (1) and `maxDelays` (1000) values are not stated in the post; the example values shown (4, 6, 100, 500) are reasonable for the scenarios discussed.
- `default.statusInterval` defaults to 10 seconds; the examples explicitly override this to 20/30, which is fine.
- The systemd unit file is correct; the Ubuntu `lsyncd` package does ship a systemd unit in recent releases, so the note that "lsyncd doesn't always install a systemd service on Ubuntu" remains a useful safeguard for users on older or minimal installs.
- The `kill -USR1 $(pgrep lsyncd)` command for forcing a status update is correct per lsyncd's signal handling.
- Increasing `fs.inotify.max_user_watches` to 524288 is the standard recommended value and is widely documented (e.g., it matches what tools like VS Code recommend).
