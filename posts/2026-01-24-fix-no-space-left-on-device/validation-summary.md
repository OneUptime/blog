# Validation Summary: How to Fix 'No Space Left on Device' Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Linux filesystems and ENOSPC troubleshooting
- GNU coreutils (`df`, `du`, `sort`, `truncate`)
- GNU findutils (`find`)
- `lsof`
- APT, YUM, DNF, RPM, and dpkg package management
- Docker cleanup commands
- systemd journal and timers
- logrotate
- ext-family filesystem reserved blocks with `tune2fs`
- Postfix queue cleanup

## Sources Consulted
- GNU coreutils `df` documentation: https://www.gnu.org/software/coreutils/df
- GNU coreutils `du` documentation: https://www.gnu.org/software/coreutils/du
- GNU coreutils `sort` documentation: https://www.gnu.org/software/coreutils/sort
- GNU findutils documentation: https://www.gnu.org/software/findutils/
- lsof man page and project documentation: https://github.com/lsof-org/lsof/blob/master/Lsof.8
- systemd `journalctl` and `journald.conf` local man/help output: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html and https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html
- Docker CLI documentation for `docker system prune`: https://docs.docker.com/reference/cli/docker/system/prune/
- Docker CLI documentation for `docker volume prune`: https://docs.docker.com/reference/cli/docker/volume/prune/
- DNF command reference: https://dnf.readthedocs.io/en/latest/command_ref.html
- Red Hat documentation on YUM/DNF compatibility in RHEL 8: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/considerations_in_adopting_rhel_8/software-management_considerations-in-adopting-rhel-8
- `tune2fs` local help output from e2fsprogs
- Local command help for `apt-get`, `docker`, `logrotate`, `systemctl`, `journalctl`, `df`, `du`, `find`, `sort`, `truncate`, and `lsof`

## Issues Found
- The old-kernel cleanup section only showed `package-cleanup --oldkernels --count=2` for RHEL/CentOS. That is appropriate for older yum-based systems with yum-utils, but modern RHEL/CentOS 8+ uses YUM backed by DNF. Added the DNF equivalent `dnf --setopt=installonly_limit=2 remove --oldinstallonly` and labeled `package-cleanup` as the older yum-utils path.
- The Docker volume comments implied all volumes would be removed by `docker volume prune` and `docker system prune -a --volumes`. Current Docker documentation says these commands remove unused anonymous volumes by default, while `docker volume prune -a` is needed to remove all unused volumes. Updated the wording to say "anonymous volumes."
- The reserved-block check said it checked the current reserved percentage, but the command greps `Reserved block count`. Updated the comment to "reserved block count" to match `tune2fs -l` output.

## Review Notes
- Several cleanup commands are intentionally destructive (`docker system prune -a`, `postsuper -d ALL`, `rm -rf /tmp/*`, and log deletion commands). They are technically valid, but future revisions could add stronger operational warnings without changing the technical content.
- The inode-counting `find` command is correct but expensive on large filesystems. The post already frames it as a diagnostic command; future revisions could mention using narrower paths first.
