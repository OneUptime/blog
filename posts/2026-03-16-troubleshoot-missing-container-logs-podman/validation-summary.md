# Validation Summary: How to Troubleshoot Missing Container Logs in Podman

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Podman
- Podman container log drivers
- journald / systemd-journald
- Linux shell commands
- Application stdout/stderr buffering

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-events` documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman `podman-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman global documentation for logging and configuration: https://docs.podman.io/en/latest/markdown/podman.1.html
- containers/common `containers.conf` documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- GNU Coreutils `stdbuf` documentation: https://www.gnu.org/software/coreutils/manual/html_node/stdbuf-invocation.html

## Issues Found
- The log-driver list omitted `passthrough-tty`, which is a current Podman log driver and, like `passthrough`, does not store logs for later `podman logs` reads. Added it to the support table, diagnostic script, and summary.
- The `json-file` description implied a separate native driver. Current Podman documents `json-file` as an alias for `k8s-file`, so the wording was corrected.
- The raw log file section did not distinguish file-backed drivers from `journald`. Added a note that `LogPath` checks apply to `k8s-file`/`json-file`, while `journald` stores logs in the journal.
- The suggested `podman exec tail -f` command could stream logs to the current exec session without configuring the container's main stdout. Reworded it as an entrypoint/application configuration approach.
- The C/C++ buffering example set `LD_PRELOAD` directly to `libstdbuf.so`, which is incomplete and distribution-specific. Replaced it with the documented `stdbuf` wrapper pattern.
- The `podman info --format '{{.Host.LogSizeMax}}'` example was not supported by the consulted current docs. Replaced it with a check for configured `containers.conf` `log_size_max` defaults.
- The journald example used `journalctl ... | tail`; changed it to `journalctl ... -n 20`, which uses journalctl's native option.
- The diagnostic script assumed `.LogPath` always names a host file and would call `dirname` on an empty path for non-file drivers such as `journald`. Added guards for empty log paths and disk checks.
- The disk-space example also assumed `.LogPath` was non-empty. Added a guard so it only checks a log directory when Podman reports a file-backed log path.

## Review Notes
Podman was not installed in the local environment, so CLI examples could not be validated with local `--help` output. Commands were checked against current official Podman and GNU documentation instead.
