# Validation Summary: How to Debug Failing Docker Containers Safely

## Status
validated

## Post Type
Guide / Tutorial — a step-by-step on-call runbook for safely triaging failing Docker containers.

## Technologies Covered
- Docker CLI (`docker ps`, `inspect`, `logs`, `cp`, `exec`, `run`, `history`, `stats`, `events`, `commit`, `save`, `rm`, `rmi`)
- Docker Compose (`docker compose logs`)
- Docker Desktop (`docker debug`)
- Linux namespaces (network, PID) and cgroups
- Container image tooling (`dive`, `syft`)

## Sources Consulted
- Docker CLI reference — https://docs.docker.com/reference/cli/docker/
- `docker inspect` (Go template `--format`) — https://docs.docker.com/reference/cli/docker/inspect/
- `docker logs` (`--tail`, `--since`, `-f`) — https://docs.docker.com/reference/cli/docker/container/logs/
- `docker cp` — https://docs.docker.com/reference/cli/docker/container/cp/
- `docker run` (`--network container:`, `--pid container:`, `--read-only`) — https://docs.docker.com/reference/cli/docker/container/run/
- Docker Debug (Docker Desktop feature) — https://docs.docker.com/reference/cli/docker/debug/ and https://www.docker.com/blog/how-to-fix-and-debug-docker-containers-like-a-superhero/
- BuildKit overview (to confirm `docker debug` is NOT BuildKit) — https://docs.docker.com/build/buildkit/
- Bash line-continuation / comment behavior — https://www.gnu.org/software/bash/manual/bash.html

## Issues Found
1. **Broken multi-line shell command (Section 5).** The ephemeral debug-container `docker run` command placed inline `# ...` comments *after* the line-continuation backslashes:
   ```
   --network container:api_web_1 \    # Share network namespace ...
   ```
   In bash a `\` continues a line only when it is the final character on the line. With trailing text after the backslash, the backslash escapes a space (not the newline), the line is no longer continued, and the comment text corrupts the command — so the snippet as written would not run. Fixed by moving the per-flag explanations into full-line comments above the command and leaving each backslash as the last character on its line, preserving all the explanatory content while making the command valid.

2. **Incorrect attribution of `docker debug` (Section 5).** The post described `docker debug` as a "BuildKit" feature. `docker debug` is a Docker Desktop feature (GA in Docker Desktop 4.33, available on Pro/Teams/Business plans); BuildKit is the build backend used by `docker build`, not the source of `docker debug`. Changed "(BuildKit)" to "(Docker Desktop)".

## Review Notes
- All other commands were verified as syntactically correct and current: `docker ps -a --filter`, `docker inspect --format '{{.State.Status}} {{.State.ExitCode}}'`, `docker logs --tail/--since/-f`, `docker cp <container>:<path> <local>`, `docker exec -it --env ...`, `docker history`, `docker stats`, `docker events --since`, `docker commit`, and `docker save`.
- Section 5 corrected the comment about Alpine. Alpine ships a minimal busybox shell plus core utilities; it is a small base for a debug helper rather than a tool-rich image. Wording was softened accordingly during the comment fix (no behavioral change to the command).
- Minor (not changed): Section 6 lists `syft` alongside `dive` "to inspect file diffs." `dive` is the correct tool for per-layer file diffs; `syft` is an SBOM/package-inventory generator, not a file-diff tool. The mention is harmless context but slightly imprecise — worth tightening in a future edit.
- Minor (not changed): `docker run --read-only -v /tmp` creates an anonymous writable volume at `/tmp`; `--tmpfs /tmp` is the more idiomatic way to provide a writable scratch dir on a read-only container. Both work; left as-is to preserve author intent.
