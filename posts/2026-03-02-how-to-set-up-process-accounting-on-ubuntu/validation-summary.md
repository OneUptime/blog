# Validation Summary: How to Set Up Process Accounting on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GNU acct (process accounting utilities: `accton`, `sa`, `lastcomm`, `dump-acct`)
- Linux kernel BSD process accounting (`/proc/sys/kernel/acct`)
- systemd (`acct.service`)
- `auditd` / `auditctl` / `ausearch` (Linux Audit System)
- `logrotate`
- `sysctl` / `/etc/sysctl.d/`
- Ubuntu / Debian package management (`apt-get`)

## Sources Consulted
- Ubuntu manpage: lastcomm(1) — https://manpages.ubuntu.com/manpages/jammy/en/man1/lastcomm.1.html
- Ubuntu manpage: sa(8) — https://manpages.ubuntu.com/manpages/jammy/en/man8/sa.8.html
- Ubuntu manpage: accton(8) — https://manpages.ubuntu.com/manpages/jammy/en/man8/accton.8.html
- Ubuntu manpage: dump-acct(8) — https://manpages.ubuntu.com/manpages/jammy/en/man8/dump-acct.8.html
- Ubuntu acct package file list — https://packages.ubuntu.com/jammy/amd64/acct/filelist
- GNU Accounting Utilities manual — https://www.gnu.org/software/acct/manual/accounting.html
- Linux kernel docs: kernel.acct sysctl — Documentation/admin-guide/sysctl/kernel.rst
- auditctl(8) and ausearch(8) manpages

## Issues Found

1. **Invalid `lastcomm` flag `C`** — The post listed `C - Command ran in a virtual machine` as a flag character. GNU acct's `lastcomm` only emits `S`, `F`, `D`, and `X`. The historical `C` flag in some BSD variants means "PDP-11 compatibility mode (VAX only)", not "virtual machine". Removed the `C` entry and clarified that `X` is specifically for SIGTERM.

2. **Wrong `sa -c` description** — The post described `sa -c` as "sort summary by CPU usage". Per the manpage, `-c` / `--percentages` prints percentages of total time per command. Updated the comment.

3. **`sa -v` used without required argument** — `-v` / `--threshold` requires a numeric argument (e.g. `sa -v 5`). The post invoked it as bare `sudo sa -v`, which is invalid. Replaced with `sa -l` (separate user and system CPU times).

4. **Invalid `sa -U username` option** — GNU acct's `sa` has no `-U` or `--user` filter option. Replaced with the correct equivalent: `lastcomm --user username`.

5. **Invalid `lastcomm -F` flag** — `-F` is not a valid `lastcomm` option. The post described it as "show detailed output including flags", but flag characters are already part of the default output. Replaced with `--print-controls` (the documented long option) and corrected the comment.

6. **`acctcom` command does not exist in GNU acct on Ubuntu** — The post used `sudo acctcom /var/log/account/pacct | head -20`. `acctcom` is a System V Unix command; Ubuntu's `acct` package provides `dump-acct` for this purpose. Replaced with `dump-acct`.

7. **Incorrect claim that `dump-acct` requires `tcsh`** — The post installed `tcsh` with the comment "Required for dump-acct on some versions". This is false: `dump-acct` is a standalone binary shipped by the `acct` package itself. Replaced with an actual `dump-acct` invocation and a clarifying comment.

## Review Notes
- The `accton off` syntax is valid (documented as `accton [OPTION] on|off|filename`).
- The `/proc/sys/kernel/acct` "high_water low_water frequency" interpretation matches the Linux kernel documentation, and `4 2 30` is the documented default.
- The `auditctl` rule syntax (`-a exit,always -F arch=b64 -S execve -F uid=0 -k root-commands`) is correct.
- The `lastcomm --forwards | tail -100` snippet is labeled "Filter by time (last 2 hours)" — it actually just returns the last 100 entries, not strictly a 2-hour window. This is misleading but not a technical error per se, so it was left as-is.
- The "mean core size" terminology in the `sa` output description is historical Unix terminology for memory usage and is correct in context.
- `audispd-plugins` is still a valid Ubuntu package name on current releases.
