# Validation Summary: How to Run Dapr in Self-Hosted Mode with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (self-hosted mode, CLI)
- Podman (v4.0+, rootless containers, podman-docker shim)
- Docker socket compatibility (DOCKER_HOST)
- Python / Flask (sample application)
- systemd (user-level socket activation)

## Sources Consulted
- Dapr official documentation: self-hosted mode initialization (https://docs.dapr.io/getting-started/install-dapr-selfhost/)
- Dapr CLI reference: `dapr init` and `dapr run` commands (https://docs.dapr.io/reference/cli/)
- Podman documentation: rootless setup, machine commands, socket paths (https://docs.podman.io/)
- Podman GitHub: socket path conventions across versions (https://github.com/containers/podman)
- Flask documentation: app routing and `jsonify` usage (https://flask.palletsprojects.com/)
- Linux kernel documentation: `net.ipv4.ip_unprivileged_port_start` sysctl

## Issues Found
- **Missing `dapr_placement` container in expected output**: The `podman ps` output comment in Step 3 listed only `dapr_redis` and `dapr_zipkin`. In self-hosted mode, `dapr init` also creates a `dapr_placement` container for the actor placement service. Added `dapr_placement` to the expected container names.

## Review Notes
- Dapr CLI 1.10+ supports a `--container-runtime podman` flag on `dapr init`, which is the officially documented approach for Podman. The blog uses the DOCKER_HOST environment variable approach instead, which is a valid alternative and internally consistent with the tutorial's narrative. Future updates could mention both approaches.
- The macOS socket path (`$HOME/.local/share/containers/podman/machine/podman.sock`) may vary across Podman versions (4.x vs 5.x) and machine backends (QEMU vs Apple Hypervisor). The troubleshooting section already covers dynamic socket path discovery via `podman info`, which mitigates this concern.
- All install commands (dnf, apt, brew) are correct for their respective platforms.
- The Flask sample app is syntactically correct and functional.
- The `sysctl net.ipv4.ip_unprivileged_port_start=0` command is correct for enabling unprivileged low-port binding on Linux.
- The `podman ps --format` template and `podman logs` commands use correct syntax.
