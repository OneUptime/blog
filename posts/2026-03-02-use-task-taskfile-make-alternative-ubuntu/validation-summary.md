# Validation Summary: How to Use Task (Taskfile) as a Make Alternative on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Task (go-task / Taskfile) — v3 schema
- YAML
- Ubuntu (snap, apt-style installs)
- Go template syntax (with sprig functions, e.g. `default`)
- Bash / Zsh shell completion
- Example workflows in Go and Python (pytest, flake8, mypy, black, isort, pre-commit)

## Sources Consulted
- Task official documentation — Usage: https://taskfile.dev/usage/
- Task official documentation — Installation: https://taskfile.dev/installation/
- Task official documentation — CLI reference: https://taskfile.dev/reference/cli/
- Task official documentation — Variables and templates: https://taskfile.dev/usage/#variables
- Task official documentation — Prevent unnecessary work (sources/generates): https://taskfile.dev/usage/#prevent-unnecessary-work
- Sprig template functions: https://sprig.taskfile.dev/defaults.html
- go-task GitHub releases (asset naming): https://github.com/go-task/task/releases

## Issues Found

1. **Invalid `parallel: true` syntax in `cmds`** — The "Running Tasks in Parallel" section showed:
   ```yaml
   parallel-commands:
     cmds:
       - parallel: true
       - npm run build:frontend
       - go build ./...
       - docker-compose build
   ```
   This is not a valid Task feature. Per the official docs, commands inside `cmds` always execute sequentially. Parallel execution is achieved via `deps` (which always run concurrently) or with the CLI `--parallel` flag for top-level tasks. Rewrote the example to split the work into sub-tasks and run them as parallel `deps`, and added a brief note about the CLI `--parallel` flag.

2. **`go mod download` with `generates: vendor/**/*`** — The "Using the `status` Clause" section had a task that ran `go mod download` and declared `generates: vendor/**/*`. `go mod download` populates the module cache, not the `vendor/` folder — only `go mod vendor` does that. With the original code, the `generates` checksum would never match real on-disk state, causing the task to always re-run. Changed the command to `go mod vendor` (and renamed the task to `vendor-deps`) so the example actually creates what it claims to generate.

3. **Comparison table claim** — The Make vs. Task table listed Task's parallel-tasks mechanism as ``parallel: true` or `deps``. Updated to ``deps` (always parallel) or `--parallel` CLI flag`, matching the corrected section above.

## Review Notes

- The install script invocation `sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin` is the form documented on taskfile.dev — verified.
- Snap install (`sudo snap install task --classic`) is the documented Ubuntu method.
- The manual install URL pattern (`https://github.com/go-task/task/releases/download/v${TASK_VERSION}/task_linux_amd64.tar.gz`) matches the actual go-task release asset naming. The pinned `3.35.1` will become stale over time; the inline comment pointing to `releases/latest` mitigates this.
- `task --completion bash` is valid even though it's not in the CLI reference page; it's documented in the installation/completion docs. The `>> ~/.bashrc` form works but is verbose — the docs recommend `eval "$(task --completion bash)"` as the preferred form. Left as-is since the post's form is also valid.
- The `check-tools` task has identical `cmds` and `status` blocks. This is technically valid (if all `status` commands exit 0 the task is skipped; otherwise the same commands run again and fail) but the `cmds` block is effectively redundant. Left in place since the example is meant to illustrate `status` behavior.
- Sprig `default` function (`{{.PORT | default "8080"}}`) is supported by Task — verified.
- The `sh:` dynamic variable example using `git describe ... || echo "dev"` parses correctly under Task's mvdan/sh shell.
- All Task v3 schema fields used (`vars`, `env`, `deps`, `sources`, `generates`, `status`, `includes`, `desc`, `cmds`) are valid.
