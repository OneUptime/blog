# Validation Summary: How to Use lsof to Find Open Files and Network Connections on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- lsof (list open files) - version 4.95.0 on Ubuntu
- Ubuntu (apt package management)
- TCP/UDP networking and socket states
- Linux /proc filesystem
- Shell utilities: awk, grep, watch, pgrep, truncate

## Sources Consulted
- lsof man page and `lsof -h` output (version 4.95.0)
- lsof upstream repository: https://github.com/lsof-org/lsof
- Verified default lsof output format on Ubuntu (includes COMMAND, PID, TID, TASKCMD, USER, FD, TYPE, DEVICE, SIZE/OFF, NODE, NAME columns)
- Ubuntu package archive for `lsof` package availability

## Issues Found
No technical issues found.

All commands, flags, and explanations were verified:
- Installation via `apt install lsof` is correct.
- The default output header shown (with TID/TASKCMD columns) matches the actual output of lsof 4.95.0 on modern Ubuntu.
- FD descriptors (`cwd`, `txt`, `mem`, `0u/1u/2u`) and TYPE values (`REG`, `DIR`, `CHR`, `IPv4`, `IPv6`) are described accurately.
- All flags used (`-p`, `-c`, `-i`, `-u`, `-a`, `+D`, `-s p:s`) are valid and used correctly.
- The state-filter syntax `-s TCP:LISTEN` and `-s TCP:ESTABLISHED` is correct per the man page.
- Host filtering with `-i @host` and port filtering with `-i :PORT` are valid.
- The `-u ^root` exclusion syntax is correct.
- Default OR-semantics for multiple selectors and the `-a` flag for AND-semantics are accurately described.
- The note about deleted files held open and the truncate techniques (`> file` and `truncate -s 0`) are correct.
- awk field positions used (`$1` COMMAND, `$2` PID, `$7` SIZE/OFF, `$9` NAME, `$NF` last column) match actual lsof data-line field offsets, because TID/TASKCMD columns are typically empty and collapsed by awk's default whitespace splitting.

## Review Notes
- `lsof -p $(pgrep myapp)` and `cat /proc/$(pgrep myapp)/limits` patterns only work cleanly when `pgrep` returns a single PID. If multiple processes match, the command will misbehave (extra PIDs become unintended arguments to lsof or paths to cat). The author shows the `pgrep ... | head -1` pattern later, which is the safer form. Not strictly incorrect for the single-process case, so left as-is.
- The shell redirection `> /var/log/largelogfile.log` requires write permission; prefixing with `sudo` does not work because the redirection is performed by the calling shell, not the sudo'd command. Users would need `sudo sh -c '> /var/log/largelogfile.log'` or use `sudo truncate -s 0 ...` (which the post also shows). This is a common pitfall but the technique itself is valid.
- The example output references `libssl.so.1.1` (OpenSSL 1.1.x). On Ubuntu 24.04 LTS, OpenSSL 3.0 is the default and the library is `libssl.so.3`. Still valid for Ubuntu 22.04 and earlier — kept as illustrative example.
- `grep "*:"` relies on grep BRE treating a leading `*` as literal (which GNU grep does). Using `grep -F "*:"` would be more portable, but the current form works on Ubuntu.
- `grep -v "localhost\|127.0.0.1\|192.168"` uses BRE `\|` alternation, which is a GNU grep extension. Works on Ubuntu's GNU grep.
