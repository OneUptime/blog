# Validation Summary: How to Restore iptables Rules from a Backup File

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux iptables
- `iptables-save`
- `iptables-restore`
- Bash shell redirection
- Cron system files under `/etc/cron.d`

## Sources Consulted
- Local `iptables-restore --help` output.
- Local `iptables-restore(8)` manual page from iptables 1.8.10.
- Local `iptables-save(8)` manual page from iptables 1.8.10.
- Local `iptables-apply(8)` manual page from iptables 1.8.10.
- Local `crontab(5)` manual page.
- Netfilter/iptables project homepage: https://www.iptables.org/projects/iptables/
- Netfilter upstream iptables source tree: https://git.netfilter.org/iptables/tree/iptables
- Linux `crontab(5)` manual page: https://man7.org/linux/man-pages/man5/crontab.5.html

## Issues Found
- The `/var/backups/iptables` backup command used `sudo iptables-save > file`, but shell redirection would still run as the invoking user and can fail for a root-owned directory. Changed it to run the redirection inside `sudo sh -c`.
- The "restore only filter table" example used a brittle `grep -A/-B` pipeline and an unnecessary flush. Replaced it with `iptables-restore --table=filter < /tmp/backup.txt`, matching the documented `--table` behavior.
- The verification command only listed the default filter table. Changed it to `iptables-save` so the verification output covers the saved/restored tables.
- The safe-restore script claimed the ping check tested SSH connectivity. Reworded it as an outbound connectivity check and made the warning match the actual ICMP test.
- The cron cleanup used `find ... -delete` without `-type f`, which can target directories. Added `-type f` so it removes old backup files only.
- The final paragraph described restoring the exact firewall state. Clarified that the normal workflow restores the saved ruleset and policies, while packet and byte counters require `iptables-save -c` and `iptables-restore -c`.

## Review Notes
- `iptables-restore --test`, `--noflush`, `--table`, and `--counters` were verified against local iptables 1.8.10 help/man output.
- `iptables-apply` is worth considering in a future article revision for remote firewall changes because it can roll back after a timeout if connectivity is lost.
- The post remains valid for systems intentionally managing iptables rules. On hosts managed by firewalld, ufw, container runtimes, or nftables-native tooling, another service may later rewrite the active ruleset.
