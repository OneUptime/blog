# Validation Summary: How to Use the column and printf Commands for Formatted Output on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- `column` command (from util-linux package)
- `printf` shell builtin and standalone command (coreutils)
- Bash scripting
- ANSI escape codes for terminal colors
- Various Ubuntu utilities used in examples (`stat`, `systemctl`, `lsb_release`, `df`, `free`, `uptime`, `cut`)

## Sources Consulted
- `column(1)` man page from util-linux (verified locally against util-linux 2.39.3)
- util-linux release notes / changelog (https://github.com/util-linux/util-linux/blob/master/Documentation/releases/) for `--table-columns` and `--json` availability
- `printf(1)` man page and Bash builtin documentation (https://www.gnu.org/software/bash/manual/bash.html#index-printf)
- POSIX printf format specifier reference
- `stat(1)` format reference for `%s`, `%y`, `%A`
- `systemctl(1)` reference for `is-active` and `show --property=ActiveEnterTimestamp --value`

## Issues Found
1. **Default fill direction was reversed.** The post stated "By default, `column` fills across rows. The `-x` flag fills down columns instead." This is the opposite of the actual behavior. Per the column(1) man page: "columns are filled before rows - This is the default mode (required by backward compatibility)" and "-x, --fillrows ... rows are filled before columns." Corrected the description and the inline comments in the example block.

2. **`-c` flag misdescribed as "number of columns".** The post used `ls /usr/bin | column -c 3` with the comment "Display in exactly 3 columns". The `-c`/`--output-width` flag actually sets the total output width in characters, not the number of columns; `column -c 3` would produce a 3-character-wide output, not three columns. Removed the incorrect example and rewrote the section to accurately describe `-c` as output width, including the `-c 0` (unlimited) idiom mentioned in the man page.

3. **Incorrect version for `--table-columns`.** The post claimed `--table-columns` and JSON output arrived in util-linux 2.35+. `--table-columns` was actually added in util-linux 2.30 (2017) and `--json` in 2.27 (2015). Updated to "util-linux 2.30+" and split out the JSON note so the version claim is accurate.

## Review Notes
- All `printf` examples (format specifiers, width/padding, number formatting, hex/octal, color codes, repeat-on-extra-args behavior) match the GNU coreutils and Bash builtin behavior. The octal example `printf "%o\n" 493` correctly produces `755`.
- `stat -c %s/%y/%A`, `lsb_release -ds`, `uptime -p`, `free -h | awk '/^Mem/{print $2}'` are all valid on Ubuntu and produce the implied output.
- The `column -t /etc/fstab` usage is correct — `column` accepts a file argument.
- The "Adding Column Headers" example pipes whitespace-separated input through `column --table --table-columns NAME,AGE,CITY`; this works because `--table` (`-t`) uses whitespace as the default separator.
- The example output shown after the `cut -d: ... | column -t -s ':'` snippet is illustrative; actual column widths will depend on the local `/etc/passwd` contents but the structure shown is plausible.
- Minor stylistic note (not changed): the `printf '%0.s-' {1..50}` idiom relies on the precision-0 string truncation trick and is a well-known Bash pattern; it works as described.
