# Validation Summary: How to Use Dynamic Matrix in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions (matrix strategy, dynamic matrices)
- GitHub Actions workflow syntax (`fromJson`, `toJson`, job outputs, `needs`)
- `$GITHUB_OUTPUT` step output mechanism
- Bash scripting
- `jq` (JSON processing)
- `git diff` for change detection
- npm / npm workspaces
- Docker

## Sources Consulted
- GitHub Actions — Workflow commands (setting step outputs, multiline values with `$GITHUB_OUTPUT`): https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions
- GitHub Actions — Using a matrix for your jobs (`include`, `exclude`, `fail-fast`, `max-parallel`, dynamic matrix via `fromJson`): https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs
- jq manual (`-c`/compact, `-s`/slurp, `-R`/raw input, `-n`/null input, `--argjson`): https://jqlang.github.io/jq/manual/

## Issues Found
The core dynamic-matrix patterns (`fromJson(needs.<job>.outputs.matrix)`, job `outputs`, `if:` guards on empty matrices, `include`/`exclude`, `max-parallel`, `continue-on-error` with `matrix.experimental`) are all correct and current. However, several matrix-generation steps piped JSON through `jq` using its **default pretty-printed (multiline) output**, then wrote it via `echo "matrix=$VAR" >> $GITHUB_OUTPUT`. Per GitHub's workflow-command documentation, multiline values written to `$GITHUB_OUTPUT` require a heredoc delimiter; writing pretty-printed JSON without one captures only the first line (`matrix={`) or fails the step. These workflows would therefore break at runtime. The author already used compact output (`jq -c`) in the include/exclude example, confirming compact single-line JSON was the intent. Fixes applied (compact output added so each value is a single line):

1. **Basic Dynamic Matrix** — `jq -s '{package: .}'` → `jq -sc '{package: .}'`.
2. **Multi-Dimensional Dynamic Matrix** — `jq -n \` → `jq -n -c \` for the combined service/environment object.
3. **Matrix from Configuration File** — `MATRIX=$(cat .github/matrix-config.json)` → `MATRIX=$(jq -c . .github/matrix-config.json)` so the multiline config file is collapsed to one line.
4. **Matrix from API Response** — `jq '{ include: ... }'` → `jq -c '{ include: ... }'`.
5. **Monorepo Change Detection** — `jq -s '{package: .}'` → `jq -sc '{package: .}'`.
6. **Dynamic Matrix from Directory Structure** — `jq -s '{service: .}'` → `jq -sc '{service: .}'`.

## Review Notes
- The `// .github/matrix-config.json` line inside the ```json``` block is a filename label, not valid JSON. This is a common documentation convention and was left as-is; readers should not copy that comment line into the actual config file (standard JSON does not allow comments, and the now-`jq`-based read in fix #3 would reject it).
- `find ... -printf '%h\n'` (directory example) relies on GNU `find`, which is present on `ubuntu-latest` runners — correct for the stated environment.
- Action versions used (`actions/checkout@v4`, `actions/setup-node@v4`) are current and non-deprecated.
- `git diff A...B` (three-dot) correctly diffs against the merge-base for PR change detection, and `fetch-depth: 0` is correctly required for it.
- The `npm test --workspace=packages/<pkg>` form is valid npm workspaces syntax (path or package name accepted).
