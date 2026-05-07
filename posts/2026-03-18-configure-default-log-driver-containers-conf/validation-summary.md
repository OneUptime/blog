# Validation Summary: How to Configure Default Log Driver in containers.conf

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- containers.conf
- Container log drivers
- systemd-journald
- journalctl

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-container-inspect` documentation: https://docs.podman.io/en/v4.0.0/markdown/podman-container-inspect.1.html
- containers.conf manual from containers/common documentation: https://browse.dgit.debian.org/golang-github-containers-common.git/tree/docs/containers.conf.5.md
- Podman `podman-logs` documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html

## Issues Found
- The post described `k8s-file` as the default log driver. Current containers.conf documentation says Podman uses `journald` by default when the systemd journal is readable and writable, otherwise `k8s-file`. Updated the driver list to reflect that.
- The post said it covered each available log driver but did not include `passthrough-tty`, which is listed in current `podman run` documentation. Changed the wording to "common log drivers" and added `passthrough-tty` to the available-driver notes.
- The post described `log_size_max` as log rotation. The containers.conf manual describes it as a maximum log-file size where the file is truncated and reopened. Updated the wording from rotation to size limit/truncation.
- The journald example used `--rm` and then showed `podman logs` only as a commented example. Since `--rm` removes the container on exit, this made the `podman logs` example misleading. Removed `--rm`, showed `podman logs journal-test`, and added cleanup with `podman rm journal-test`.
- The summary advised always configuring `log_size_max`, but that is specifically relevant to file-based container logs rather than `journald` or `none`. Updated the recommendation to apply to file-based logging.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official Podman and containers.conf documentation rather than local `--help` output.
