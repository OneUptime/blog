# Validation Summary: How to Troubleshoot No Space Left on Device Errors on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux filesystem usage and inode diagnostics
- GNU coreutils (`df`, `du`, `sort`, `truncate`)
- GNU findutils (`find`)
- DNF package management
- systemd journal and `journalctl`
- systemd-tmpfiles
- systemd-coredump and `coredumpctl`
- `lsof`
- logrotate

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing software with the DNF tool": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- Red Hat Enterprise Linux 9.5 Release Notes, DNF `remove --oldinstallonly` behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/9.5_release_notes/index
- DNF Command Reference, `remove --oldinstallonly`: https://dnf.readthedocs.io/en/stable/command_ref.html
- DNF Configuration Reference, `installonly_limit`: https://dnf.readthedocs.io/en/stable/conf_ref.html
- GNU coreutils documentation for `df`, `du`, `sort`, and `truncate`: https://www.gnu.org/software/coreutils/
- GNU findutils documentation for `find`: https://www.gnu.org/software/findutils/
- systemd `journalctl` manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd `journald.conf` manual: https://www.freedesktop.org/software/systemd/man/249/journald.conf.html
- systemd `systemd-coredump` manual: https://www.freedesktop.org/software/systemd/man/254/systemd-coredump.html
- systemd `coredump.conf` manual: https://www.freedesktop.org/software/systemd/man/249/coredump.conf.html
- systemd `systemd-tmpfiles` manual: https://www.freedesktop.org/software/systemd/man/249/systemd-tmpfiles.html
- logrotate command help output (`logrotate --help`)
- lsof command help output (`lsof -h`)

## Issues Found
- The deleted-open-file section referred to a `SIZE` column in `lsof` output. Standard `lsof` output labels this field as `SIZE/OFF`, so the text now uses `SIZE/OFF`.
- The core dump search command used `find / -name "core.*" -o -name "core" -type f`, which applies `-type f` only to the second name pattern because of `find` operator precedence. The command now groups the name patterns so both are restricted to regular files.
- The core dump cleanup command used `journalctl --vacuum-time=3d`, which vacuums archived journal files and does not directly clean external core dump files under `/var/lib/systemd/coredump/`. It now uses `systemd-tmpfiles --clean /usr/lib/tmpfiles.d/systemd.conf`, matching systemd-coredump's documented tmpfiles-based cleanup path.

## Review Notes
- `journalctl --vacuum-size` and `--vacuum-time` operate on archived journal files, so active journal files may still consume space until rotation.
- The DNF old-kernel cleanup command is valid for DNF-based RHEL systems; administrators should still review the transaction before confirming package removal.
