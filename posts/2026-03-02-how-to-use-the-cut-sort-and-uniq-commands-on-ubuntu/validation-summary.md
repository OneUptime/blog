# Validation Summary: How to Use the cut, sort, and uniq Commands on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- GNU coreutils: `cut`
- GNU coreutils: `sort`
- GNU coreutils: `uniq`
- Supporting Unix tools used in pipelines: `awk`, `grep`, `head`, `tail`, `find`, `xargs`, `basename`, `du`, `dpkg`
- Common Ubuntu log files: `/var/log/auth.log`, `/var/log/nginx/access.log`, `/etc/passwd`

## Sources Consulted
- `cut --help` (GNU coreutils) — verified `-c`, `-d`, `-f`, `--complement`
- `sort --help` (GNU coreutils) — verified `-r`, `-f`, `-n`, `-t`, `-k`, `-h`, `-s`, `-S`, `--parallel`, `-u`
- `uniq --help` (GNU coreutils) — verified `-c`, `-d`, `-u`, `-i`
- GNU coreutils manual: https://www.gnu.org/software/coreutils/manual/
- Live test of `echo -e "10\n2\n20\n1" | sort` vs `sort -n` to confirm the lexicographic/numeric example output
- Standard OpenSSH `auth.log` "Accepted" line format and default nginx combined log format for the `awk '{print $9}'` field-position claims

## Issues Found
No technical issues found. All command flags, syntax, examples, and explanations are accurate against current GNU coreutils on Ubuntu:

- `cut -c`, `cut -d`/`-f`, and `cut --complement` behave as described.
- The lexicographic vs. numeric sort example output (`1, 10, 2, 20` vs `1, 2, 10, 20`) reproduces exactly.
- `sort -t ':' -k 3 -n /etc/passwd` correctly sorts by UID (field 3).
- `sort -k 3,3 -k 1,1` semantics ("start at field 3, stop at field 3") match the GNU sort manual.
- `sort -h`, `sort -s`, `sort -S`, and `sort --parallel=N` are all valid GNU sort options.
- `uniq -c`, `uniq -d`, `uniq -u`, `uniq -i` are correct, and the note that `uniq` only collapses adjacent duplicates (hence the `sort | uniq` idiom) is accurate.
- For the SSH `auth.log` "Accepted ..." lines, `$9` is correctly the username given the standard syslog prefix.
- For the nginx default combined log format, `$9` is correctly the HTTP status code.
- `dpkg -l | awk '/^ii/{print $2}' | cut -d ':' -f 1` correctly strips the multi-arch suffix (e.g. `:amd64`).

## Review Notes
- The `find ... | xargs -I {} basename {}` pipeline works but spawns one `basename` per file. On GNU coreutils, `basename -a` (or `xargs -n 50 basename`) is much faster on large trees. Not incorrect, just inefficient — left as written to preserve author voice.
- `cut` only handles a single-character delimiter; for true CSV with quoted/embedded commas, a CSV-aware tool (e.g. `csvkit`, `mlr`) is safer. The post stays in the simple-CSV scope, which is fine for a beginner guide.
- The `sort -f` flag folds case for ordering but does not deduplicate case-insensitively — that distinction is correctly handled by mentioning `uniq -i` separately.
