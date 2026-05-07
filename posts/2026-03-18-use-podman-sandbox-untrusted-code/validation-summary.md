# Validation Summary: How to Use Podman as a Sandbox for Untrusted Code

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Linux containers
- Rootless container isolation
- Seccomp
- SELinux volume labeling
- Bash
- Python
- Flask

## Sources Consulted
- Podman `run` reference: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman rootless mode reference: https://docs.podman.io/en/v4.7.2/markdown/podman.1.html
- Alpine Linux release branches: https://www.alpinelinux.org/releases/
- Flask request/JSON patterns: https://flask.palletsprojects.com/en/stable/patterns/javascript/
- Python `subprocess` documentation: https://docs.python.org/3/library/subprocess.html
- Python `tempfile` documentation: https://docs.python.org/3/library/tempfile.html
- GNU Coreutils `timeout` documentation: https://www.gnu.org/software/coreutils/timeout
- GNU Bash reference manual: https://www.gnu.org/software/bash/manual/bash.html
- Docker rootless mode documentation, to verify the comparative runtime claim: https://docs.docker.com/engine/security/rootless/

## Issues Found
- The Dockerfile used `alpine:3.19`, which is past end of support as of May 7, 2026. Updated it to `alpine:3.23`, which is a current supported stable branch.
- The isolation examples relied on `--read-only` alone, but current Podman mounts writable tmpfs directories under `/run`, `/tmp`, and `/var/tmp` by default unless `--read-only-tmpfs=false` is set. Added `--read-only-tmpfs=false` anywhere the post claimed a single tightly controlled writable temp area.
- The `sandbox-run.sh` example used `set -euo pipefail` together with `timeout ...` and then checked `$?` afterward. In Bash, that non-zero exit would terminate the script before the timeout handling code ran. Wrapped the `timeout` call with `set +e` / `set -e` so the exit code is captured correctly.
- The runner script referenced `sandbox:node`, `sandbox:shell`, and `sandbox:ruby` images that the post never built. The API example also defaulted to `language='python'`, which produced a `.python` file that the runner would reject. Tightened the examples so they consistently support the Python image actually defined in the post.
- The custom seccomp JSON allowlist was too small to run Python reliably. Local syscall tracing of `python3` startup showed required syscalls such as `ioctl` and `getdents64` that were missing from the profile. Replaced the broken profile with accurate guidance to derive a custom seccomp profile from Podman’s default profile for the exact runtime being sandboxed.
- The conclusion claimed Podman rootless protection was something daemon-based runtimes “cannot match.” That was too absolute because daemon-based runtimes such as Docker also support rootless mode. Reworded the conclusion to keep the security point without the inaccurate comparison.

## Review Notes
- Podman itself was not installed in this workspace, so CLI flags were validated against the official Podman documentation rather than by executing `podman run` locally.
- The Bash and Python snippets were syntax-checked locally, and the seccomp concern was confirmed with a local `strace` of Python startup behavior.
- Podman documents that some resource-limit flags such as `--memory` and `--cpus` are not supported on cgroups v1 rootless systems. The post is still valid, but that environment-specific limitation remains worth keeping in mind.
