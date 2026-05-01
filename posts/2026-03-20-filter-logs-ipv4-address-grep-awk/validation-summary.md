# Validation Summary: How to Filter Logs by IPv4 Address Using grep and awk

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Linux command-line tools
- `grep`
- `awk`
- `find`
- `zgrep`
- Python 3
- Python `ipaddress` module
- IPv4 log analysis

## Sources Consulted
- GNU grep manual: https://www.gnu.org/software/grep/manual/grep.html
- GNU awk manual, string functions: https://www.gnu.org/software/gawk/manual/html_node/String-Functions.html
- GNU Findutils manual: https://www.gnu.org/software/findutils/manual/html_mono/find.html
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Local tool documentation and behavior checks: `grep --version`, `awk --version`, `python3 --version`, and `zgrep --help`

## Issues Found
- The first "exact IP" `grep` used unescaped dots (`^203.0.113.42 `), which makes `.` match any character in a regular expression. I escaped the dots so the pattern matches the literal IPv4 address.
- The syslog "exact IP" example was a plain substring search and could also match longer strings such as `203.0.113.420`. I changed it to `grep -w` so it behaves like an exact token match in typical log text.
- The multi-IP example had the same exact-match problem as the syslog example. I changed it to `grep -Ew` so each alternation is matched as a whole word.
- The IPv4 pattern-matching comment said the regex matched "any IPv4 address", but the pattern only matches dotted-quad candidates and does not validate octet ranges. I corrected the wording without changing the example’s intent.
- The `/24 subnet` section’s second example was labeled like a last-octet wildcard, but the regex actually matched a `10.1.x.x` prefix and the sample path was `/var/log/syslog`, where lines typically do not start with an IP. I corrected the wording and aligned the example with access-log-style input.
- The "More precise" `awk` example claimed to check all four octets but only examined the first three and did not verify that the fourth existed. I updated it to validate that the split produced four fields and to check both trailing octets.
- The "Count Requests per Minute from IP" example used `match(..., ..., array)`, whose array argument is a `gawk` extension and failed on the local `mawk`-based `/usr/bin/awk`. I replaced it with a portable `substr($4, 2, 17)` extraction for standard Nginx access-log timestamps.
- The Python example indexed `line.split()[0]` unconditionally, which would raise `IndexError` on blank lines. I changed it to skip empty lines before parsing the first field.
- The rotated-log example used plain `grep` with `access.log*`, which can include `.gz` files on systems where rotated logs are compressed. I changed the example to `zgrep`.
- The recursive `find` example used `grep`, which has the same compressed-log problem, and it did not restrict matches to files. I changed it to `find ... -type f ... -exec zgrep ... {} +`.
- The conclusion said to "always" use a glob plus `zgrep` for rotated and compressed logs. That was too absolute because recursive searches still need `find`. I narrowed the wording to match the corrected examples.

## Review Notes
- The regex examples in the pattern-matching section are practical extraction patterns, not full IPv4 validators. That is acceptable for log triage, but strict 0-255 validation is delegated to the `awk` and Python examples.
- The Python `ipaddress` example is correct for exact network membership checks and uses current standard-library APIs.
