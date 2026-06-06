# Validation Summary: How to Debug Collector File Permissions Issues on Linux

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector file_storage extension and persistent sending queues
- OpenTelemetry Collector hostmetrics receiver
- Linux file ownership and permissions
- systemd service configuration and hardening
- SELinux troubleshooting and policy tooling
- Docker Compose volume mounts
- Kubernetes SecurityContext, ConfigMap volumes, Deployments, and DaemonSets
- logrotate

## Sources Consulted
- OpenTelemetry Collector resiliency documentation: https://opentelemetry.io/docs/collector/resiliency/
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector Contrib hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Security Context documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- systemd.exec manual page: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- Local Linux manual pages for systemd.exec and useradd.

## Issues Found
- The persistent queue example defined `file_storage` and referenced it from `sending_queue`, but did not enable the extension under `service.extensions`. Added `service: extensions: [file_storage]` to match OpenTelemetry Collector resiliency documentation.
- The systemd process-user diagnostic suggested looking for `User` in `systemctl status` output and used a different service name than the rest of the post. Changed the example to `systemctl status otelcol` plus `systemctl show otelcol -p User -p Group -p MainPID`.
- The systemd drop-in example wrote to `/etc/systemd/system/otelcol.service.d/override.conf` without first creating the drop-in directory. Added `sudo mkdir -p /etc/systemd/system/otelcol.service.d`.
- The systemd host metrics fix used `ProtectSystem`, `ProtectHome`, and `PrivateTmp`, which do not directly control `/proc` visibility. Replaced that advice with `ProtectProc=default` and `ProcSubset=all` for cases where service hardening restricted `/proc`.
- The Docker host metrics example mounted `/proc` and `/sys` separately and set `HOST_PROC`/`HOST_SYS`, but OpenTelemetry hostmetrics documentation uses a mounted host filesystem with `root_path`. Updated the example to mount `/:/hostfs:ro` and use `root_path: /hostfs`.
- The SELinux context example used `usr_t` for `/var/lib/otelcol`, which is not an appropriate var-lib data context. Changed it to restore a default `var_lib_t` context for mislabeled data files and left custom policy generation as the fix for policy denials.
- The Kubernetes Deployment example omitted the required `spec.selector` and matching pod template labels for `apps/v1`. Added matching labels and selector, and added an explicit Collector `--config=/etc/otelcol/config.yaml` argument for the mounted ConfigMap.
- The Kubernetes host metrics DaemonSet claimed privileged mode was required. OpenTelemetry documentation shows a read-only `hostfs` mount with `root_path: /hostfs`; privileged mode is not inherently required for the basic hostmetrics receiver. Replaced the privileged example with a non-root, read-only-root-filesystem container and a read-only host filesystem mount.
- The summary described host metrics issues as missing capabilities. Updated it to the more accurate category of overly restrictive service or container sandboxing.

## Review Notes
YAML snippets in the post were parsed with PyYAML after edits. `kubectl` was not installed in the workspace, so Kubernetes API server validation was not run locally.
