# Validation Summary: How to Configure Container Isolation in Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Docker
- Docker Compose (v3.8 spec)
- Portainer
- Linux namespaces (network, IPC, PID)
- Linux capabilities and seccomp
- cgroups (resource limits)

## Sources Consulted
- Docker Compose file reference (services): https://docs.docker.com/reference/compose-file/services/
- Docker `container run` CLI reference (`--pid`, `--ipc`, `--cap-drop`, `--security-opt`, `--read-only`, `--tmpfs`, `--memswap-limit`, `--cpu-quota`, `--pids-limit`): https://docs.docker.com/reference/cli/docker/container/run/
- Docker security documentation (capabilities, seccomp, no-new-privileges): https://docs.docker.com/engine/security/
- Compose spec (networks `internal`, deploy resources): https://github.com/compose-spec/compose-spec/blob/main/spec.md
- Docker engine PidMode validation source (only `""`, `host`, `container:<id>` accepted)

## Issues Found
1. **`pid: "private"` is not a valid Docker value.** The Docker engine's `PidMode.Valid()` only accepts the empty string (default), `host`, and `container:<id>`. Setting `pid: "private"` would fail validation. Replaced the explicit setting with a comment explaining that the private PID namespace is the unspecified default and only `host`/`container:<id>` are valid explicit values.
2. **`ulimits.nproc` is not equivalent to `pids_limit`.** `pids_limit` uses the cgroup pids controller to cap total processes/threads in the container, while `RLIMIT_NPROC` (`nproc`) is a per-user limit enforced by the kernel. The comment "Same as pids_limit" was misleading; replaced with "Per-user process limit (RLIMIT_NPROC)".

## Review Notes
- The `ipc: private` value was verified against the Docker CLI reference and is a legitimate value (distinct from the `shareable` default that Docker sets when `--ipc` is unspecified). The post's comment that "private" is the (recommended) default is a slight simplification — Docker's actual unspecified default mode is `shareable` (which still gives each container its own namespace) — but the recommendation to use `private` for stricter isolation is correct, so left as-is.
- `version: "3.8"` in compose files is now ignored by Compose v2 (treated as informational only); kept since the examples still parse and the rest of the keys are valid under the current Compose specification.
- `seccomp:/etc/docker/seccomp/api-profile.json` is correct syntax; readers will need to supply their own profile file at that path.
- The Step 7 audit script uses `readonly` as a variable name. `readonly` is a bash builtin but assignment to it as a regular variable works in practice; left unchanged as it is functional.
