# Validation Summary: How to Debug Shared Library Loading Issues with LD_DEBUG on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux dynamic linker / glibc `ld.so`
- `LD_DEBUG` and `LD_DEBUG_OUTPUT`
- systemd service overrides
- journalctl
- RPM package queries

## Sources Consulted
- Linux `ld.so(8)` manual page: https://www.man7.org/linux/man-pages/man8/ld.so.8.html
- systemd.exec `Environment=` documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemctl documentation for `edit`, `restart`, and `status`: https://www.freedesktop.org/software/systemd/man/systemctl.html
- journalctl documentation for `-u`, `-n`, and `--no-pager`: https://www.freedesktop.org/software/systemd/man/journalctl.html
- RPM query format documentation with `rpm -qa` examples: https://rpm.org/docs/4.19.x/manual/queryformat.html

## Issues Found
- The `LD_DEBUG_OUTPUT` example was labeled as filtering output for a specific library. `LD_DEBUG_OUTPUT` redirects dynamic linker debug output to a file path with the process ID appended, so the comment was corrected.
- The available `LD_DEBUG` category list omitted `statistics`, `unused`, and `help`. These categories were added, and the caveat that `all` excludes `statistics` and `unused` was included.
- The service section used generic `systemctl enable` and `start` commands, which do not configure `LD_DEBUG` for a service process. The section was corrected to use `systemctl edit` with `Environment=LD_DEBUG=libs` and `Environment=LD_DEBUG_OUTPUT=/tmp/ld-debug`, followed by a service restart.
- The verification section only checked systemd status and journal logs. Since `LD_DEBUG_OUTPUT` writes PID-suffixed files, a check for `/tmp/ld-debug.*` was added.

## Review Notes
The post is now technically accurate for the covered commands. In future revisions, it could mention that `LD_DEBUG` and `LD_DEBUG_OUTPUT` are ignored in glibc secure-execution mode unless the documented debug exception is present.
