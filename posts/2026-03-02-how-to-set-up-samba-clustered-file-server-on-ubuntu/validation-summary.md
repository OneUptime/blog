# Validation Summary: How to Set Up Samba Clustered File Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Ubuntu (server)
- Samba (SMB/CIFS file server)
- CTDB (Clustered Trivial Database)
- Winbind
- NFS (as an example shared-storage layer)
- SMB2 / SMB3 (client failover behavior)

## Sources Consulted
- CTDB man pages: https://ctdb.samba.org/manpages/ctdb.conf.5.html, https://ctdb.samba.org/manpages/ctdb.1.html, https://ctdb.samba.org/manpages/ctdb.7.html
- Samba wiki — Basic CTDB configuration: https://wiki.samba.org/index.php/Basic_CTDB_configuration
- Samba wiki — Configuring clustered Samba: https://wiki.samba.org/index.php/Configuring_clustered_Samba
- Samba wiki — Samba 4.16 Features added/changed: https://wiki.samba.org/index.php/Samba_4.16_Features_added/changed
- Samba 4.9.0 release notes (ctdbd.conf → ctdb.conf transition): https://www.samba.org/samba/history/samba-4.9.0.html
- SUSE SLE HA 15 SP6 Samba clustering guide: https://documentation.suse.com/sle-ha/15-SP6/html/SLE-HA-all/cha-ha-samba.html

## Issues Found
1. **Outdated CTDB configuration file path and format.** The post instructed editing `/etc/ctdb/ctdbd.conf` using the legacy shell-variable format (`CTDB_RECOVERY_LOCK=...`, `CTDB_NODE_ADDRESS=...`, `CTDB_DBDIR=...`). This format was deprecated in CTDB 4.9 (Samba 4.9, Sept 2018) and is not used by the CTDB packages in Ubuntu 22.04 or 24.04. Replaced with the modern INI format at `/etc/ctdb/ctdb.conf`, with `[logging]`, `[cluster]`, and `[database]` sections. Also renamed `recovery lock` to `cluster lock` (renamed in CTDB 4.16) and added a note about backward compatibility.
2. **`ctdb recmaster` is deprecated.** Renamed to `ctdb leader` in CTDB 4.16 (March 2022). Updated the command and the inline comment.
3. **`ctdb eventscript monitor legacy` is not valid.** The current syntax is `ctdb event status COMPONENT EVENT`, e.g. `ctdb event status legacy monitor`. Updated the monitoring example and adjusted the comment to reflect what it actually does (shows the most recent monitor-event status, not a live event stream).

## Review Notes
- `ctdb event script enable legacy 49.winbind` / `... 50.samba` use the correct modern syntax (`ctdb event script enable COMPONENT SCRIPT`).
- `disable netbios = yes`, `clustering = yes`, and `ctdbd socket = /var/run/ctdb/ctdbd.socket` are all valid current Samba `smb.conf` parameters. The explicit `ctdbd socket` line is typically unnecessary on Ubuntu since Samba auto-detects the default socket, but leaving it is harmless and documents intent.
- The NFS export example (`192.168.1.11(rw,sync,no_root_squash)`) only allows Node 2 to mount; in a real two-node setup you may also want Node 1 to mount its own export through localhost or use a loopback path. The post notes this is an example and recommends a SAN/cluster-FS/GlusterFS for production, which is the right caveat.
- For a production cluster, putting Samba's `private dir` and `lock dir` in `/var/lib/ctdb/*` (per-node directories) is correct because CTDB replicates the TDB contents between nodes; this is the standard recommendation and matches the Samba wiki.
- The note that SMB3 supports transparent client failover via persistent handles is accurate, but full transparency also requires Samba to be built/configured with persistent-handles support and the share to be marked accordingly — for casual readers the current wording is acceptable.
