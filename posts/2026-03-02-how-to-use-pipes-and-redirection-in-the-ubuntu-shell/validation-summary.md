# Validation Summary: How to Use Pipes and Redirection in the Ubuntu Shell

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Bash shell
- POSIX shell redirection operators (`<`, `>`, `>>`, `2>`, `2>&1`, `&>`)
- Here strings (`<<<`) and here documents (`<<`)
- Pipes (`|`) and pipelines
- Process substitution (`<()`, `>()`)
- Named pipes / FIFOs (`mkfifo`)
- Common Unix utilities used in pipelines: `grep`, `awk`, `sort`, `uniq`, `wc`, `tr`, `sed`, `tee`, `find`, `du`, `ps`, `last`, `mail`, `bc`, `dd`
- `PIPESTATUS` array and `set -o pipefail`
- Special device files: `/dev/null`, `/dev/zero`, `/dev/urandom`

## Sources Consulted
- GNU Bash Reference Manual — Redirections: https://www.gnu.org/software/bash/manual/html_node/Redirections.html
- `man bash` (bash 5.2.21) — Redirections, Pipelines, Compound Commands, PIPESTATUS sections
- POSIX shell command language specification: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html
- GNU coreutils documentation for `head`, `tr`, `sort`, `tee`, `dd`
- Verified `bc <<< "2^10"` returns 1024 and `IFS=: read -r a b c <<< "$data"` parses correctly on a live shell

## Issues Found
- **`&>` redirection labeled "Bash 4+ shorthand"** (line 66 originally): incorrect version claim. `&>word` is a long-standing bash feature (a csh-style construct documented in `man bash` without any version qualifier) that predates Bash 4. The Bash 4 era introduced things like `|&`, `mapfile`, and associative arrays — but not `&>`. Changed the comment to "Bash shorthand (equivalent to > file 2>&1)".

## Review Notes
- The `command 2>&1 > output.log` "wrong" example is correctly explained: stderr gets duplicated to the original stdout (terminal) before stdout is redirected to the file. Good pedagogy.
- The `cat file.txt > file.txt` truncation warning is correct — the shell opens/truncates the redirection target before exec'ing the command.
- The `last | grep "$(date +%a)"` example to count "users logged in today" matches by day-of-week abbreviation, so it would also match the same weekday from prior weeks if `last` shows them. The post's framing is a useful approximation, not a strict "today only" filter; left as written since this is a stylistic/scoping choice rather than a syntax error.
- The `ps aux | grep "[j]ava"` trick to exclude the `grep` process itself from results is correct and idiomatic.
- The `awk -v dt=... '$4 > "["dt'` nginx-log filter relies on lexicographic string comparison of the bracketed timestamp prefix; this works because the format is fixed-width up through the hour. Correct.
- `head -c` is GNU coreutils-specific (not POSIX), but it is the default on Ubuntu and works as shown.
- Process substitution and `exec > >(tee ...)` patterns are bash-specific (not POSIX `sh`); appropriate for a post tagged "Bash".
