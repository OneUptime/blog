# Validation Summary: How to Use awk for Column-Based Text Processing on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- awk (mawk / gawk)
- GNU coreutils (df, ps, find, seq)
- Bash
- Ubuntu Linux
- /etc/passwd, /proc/meminfo, /var/log/nginx/access.log (system files / log formats)

## Sources Consulted
- GNU Awk User's Guide: https://www.gnu.org/software/gawk/manual/gawk.html
- mawk(1) manual: https://invisible-island.net/mawk/manpage/mawk.html
- POSIX awk specification: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/awk.html
- Debian/Ubuntu mawk package metadata (`/usr/bin/awk` defaults to mawk via update-alternatives)
- df(1), ps(1), find(1), seq(1) man pages on Ubuntu 24.04
- Linux kernel docs on /proc/meminfo: https://www.kernel.org/doc/html/latest/filesystems/proc.html
- Apache Combined Log Format reference
- Direct execution of every code example on an Ubuntu system to confirm behavior

## Issues Found

1. **Incorrect claim about default awk on Ubuntu.** The post stated "On Ubuntu, the installed version is `gawk` (GNU awk)". This is wrong — Ubuntu (and Debian) ship `mawk` as the default `/usr/bin/awk` via update-alternatives, and `gawk` must be installed separately. Fixed the introduction to accurately describe mawk as the default, mention that gawk is available via `apt install gawk`, and note that the post's examples work with both implementations.

2. **Misleading "Values" header in the sum example.** The example printed `echo "Values: 10 20 30 40 50"` then piped `seq 5` (which produces 1–5) into awk, summing to 15 — completely inconsistent with the displayed "Values". Replaced the broken `echo` + `seq 5` with `printf "10\n20\n30\n40\n50\n"` so the values shown match the values summed (now correctly outputs `Sum: 150`).

3. **Broken `df -h` sum.** The example `df -h | awk 'NR > 1 { sum += $3 } END { print "Total used: " sum "G" }'` mixes units: awk converts "1.5G", "256M", and "20K" all to their leading numeric values and sums them, producing nonsense (e.g., 647.4 from an actual 319G used). Fixed by switching to plain `df` (1K-blocks, consistent units) and dividing by 1024/1024 for GB, with a comment explaining why `-h` is unsuitable here.

4. **`/proc/meminfo` double-colon output.** `$1` in `/proc/meminfo` already includes a trailing colon (e.g., `MemTotal:`), so `printf "%s: ...", $1, ...` produced `MemTotal:: 31798.0 MB`. Fixed by stripping the trailing colon with `sub(/:$/, "", label)` before printing.

## Review Notes

- All awk syntax (pattern/action pairs, BEGIN/END blocks, field variables `$0`/`$NF`/`NR`/`NF`/`FNR`, range patterns `/A/,/B/`, regex match `~` / `!~`, associative arrays, string functions) is accurate.
- All string function outputs in the comments were verified: `length($1)` of "hello world" = 5, `substr($0,7)` = "world", `substr($0,1,5)` = "hello", `index($0,"world")` = 7, `sub`/`gsub` behave as documented.
- `ps aux` field positions ($2 = PID, $3 = %CPU, $11 = COMMAND) and `df -T` field positions ($2 = Type, $4 = Used in 1K-blocks) are correct on Ubuntu.
- The nginx access-log examples assume the Combined Log Format ($1 = remote IP, $9 = status, $10 = bytes), which is the default for both nginx and Apache.
- The "Calculating File Statistics" section intentionally shows a broken-then-fixed pattern (commented `# Better approach: use ls output` inside the first block). It's a bit unusual but is clearly framed as "Better way" in the second block, so left as-is.
- The history attribution (Aho, Weinberger, Kernighan) is correct.
- mawk supports nearly all the constructs used here; the only gawk-specific extensions to be aware of are things not used in this post (e.g., `gensub`, `length(array)`, `PROCINFO`, true multi-dimensional arrays).
