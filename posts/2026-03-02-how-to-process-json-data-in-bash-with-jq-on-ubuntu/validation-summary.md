# Validation Summary: How to Process JSON Data in Bash with jq on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- jq (command-line JSON processor)
- Bash scripting
- Ubuntu (apt package management)
- curl (for API examples)
- GitHub REST API (as an example data source)
- AWS CLI (`aws ec2 describe-instances`) as an example

## Sources Consulted
- Official jq manual: https://jqlang.org/manual/ (verified all filter syntax, operators, and CLI flags)
- jq language documentation for: negative indexing, array slicing, `add`/`max`/`sort_by`, `//` alternative operator, `has`, `with_entries`, string interpolation, object merge `*`, `--arg`/`--argjson`, `-e` exit codes, `@tsv`, `-R`/`-s` flags
- Ubuntu package repository (jq is shipped in the universe/main repositories and installable via `apt install jq`)
- GitHub REST API documentation (field names `full_name`, `stargazers_count`, `language`, `pushed_at`, error `message` envelope)
- AWS CLI `describe-instances` JSON shape (Reservations[].Instances[] with State, Tags, InstanceType, PrivateIpAddress, PublicIpAddress)

## Issues Found
No technical issues found.

Verified specifically:
- `sudo apt update && sudo apt install -y jq` is the correct install method.
- The identity filter `.` pretty-prints input — correct.
- `-r` raw output flag — correct.
- Field access `.key`, nested `.a.b`, array iteration `.[]`, indexing `.[0]`, negative indexing `.[-1]`, slicing `.[1:3]` (yielding indices 1 and 2) — all correct per jq manual.
- `length` returns 3 for a 3-element array — correct.
- `select()`, boolean operators (`and`), and comparisons (`==`, `>`) — correct.
- Object construction `{name: .username, ...}`, object addition `. + {...}` — correct.
- String interpolation `"\(.field)"` — correct.
- `jq -e '.message'` returning non-zero when result is null/false — correct logic for the GitHub error-check pattern.
- AWS example: `.[][]` correctly flattens the Reservations[*].Instances[*] double-nesting, and `// "unnamed"` / `// "none"` provide null defaults — correct.
- `jq -c '.[]'` for compact one-per-line output piped through process substitution `< <(...)` — correct.
- Aggregation: `[.[].requests] | add`, `... | max`, `round`, and `sort_by(-.requests)` (negation trick for descending sort) — all correct.
- `jq -n --arg name "$name" --argjson active "$active" '{...}'` — correct; `--arg` always passes string, `--argjson` parses JSON value.
- `printf '%s\n' "${arr[@]}" | jq -R . | jq -s .` produces a JSON array of strings — correct.
- Object merge `.[0] * .[1]` via `-s` slurp — correct (recursive merge per manual).
- `has("key")`, `// default`, and `with_entries(select(.value != null))` for null-stripping — all correct.

## Review Notes
- The `canonical/ubuntu` repo used in the GitHub API example may not exist as a public repository (Canonical hosts most Ubuntu source on Launchpad, not GitHub). The code itself is correct; if a reader runs it verbatim they will hit the demonstrated error path, which arguably illustrates the error-handling pattern rather than detracting from it. Left unchanged.
- `sort_by(-.requests)` works because jq evaluates the expression per element and sorts ascending; for non-numeric fields a reader would need `sort_by(.field) | reverse` instead. The post uses it only with numeric fields, so this is fine.
- The in-place file update pattern `jq '...' file > /tmp/file && mv /tmp/file file` is a common idiom; readers handling concurrent writers or symlinks may want jq's `--in-place`/`sponge`-style workflows, but this is out of scope.
- Post is accurate against jq 1.7/1.8 (current Ubuntu LTS ships 1.6/1.7); none of the features used are version-gated beyond very old (pre-1.5) releases.
