# Validation Summary: How to Use Podman with Kubernetes YAML

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Podman (`podman play kube`, `podman generate kube`, `podman pod`, `podman volume`, `podman events`)
- Kubernetes YAML (Pod, Deployment, DaemonSet, Job, ConfigMap, Secret, PersistentVolumeClaim)
- Container runtimes / OCI images (nginx, redis, postgres, mysql, alpine, node, python)
- SELinux volume labeling (`:Z`, `:z`)
- GitHub Actions (CI/CD example)
- OpenTelemetry collector (sidecar example for OneUptime monitoring)

## Sources Consulted
- Podman kube play man page: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- Podman kube generate man page: https://docs.podman.io/en/latest/markdown/podman-kube-generate.1.html
- Podman events man page: https://docs.podman.io/en/latest/markdown/podman-events.1.html
- Podman run man page (for `host.containers.internal`): https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman source `libpod/define/annotations.go`: https://github.com/containers/podman/blob/main/libpod/define/annotations.go
- Red Hat blog on `podman play kube` Deployment support: https://www.redhat.com/en/blog/podman-play-kube

## Issues Found
1. **Incomplete list of supported Kubernetes resource types.** The post claimed `podman play kube` supports only "Pod, Deployment, DaemonSet, and ConfigMap" — but the article itself later uses Secrets and PersistentVolumeClaim, which Podman also supports. Per the official `podman-kube-play.1` man page, the full supported list is: Pod, Deployment, DaemonSet, Job, PersistentVolumeClaim, ConfigMap, and Secret (Service is NOT supported by `kube play`). Updated the sentence to reflect the actual supported set.
2. **Misleading comment on `host.containers.internal`.** The multi-pod stack example commented `# Use host.containers.internal to reach other pods`. That DNS name resolves to the Podman host, not to other pods. The example still works because the MySQL pod publishes `hostPort: 3306`, so the backend reaches it via the host's published port. Rewrote the comment to accurately explain that `host.containers.internal` points at the host and the database is reached via its hostPort.

## Review Notes
- Both `podman play kube` and `podman generate kube` are valid; in newer Podman (4.x/5.x) the preferred forms are `podman kube play` / `podman kube generate`. The legacy forms used in the post still work and are not deprecated to the point of failure, so they were left as written.
- `podman play kube --publish`, `podman generate kube --service`, `podman events --filter pod=`, and the `<deployment-name>-pod-<N>` naming convention all verified accurate against current Podman documentation.
- The `io.podman.annotations.autoremove/<container-name>: "FALSE"` annotation format in the generated YAML example matches real Podman output.
- The 3-container count shown for the Deployment example (2 user containers + 1 auto-created infra container per pod) is correct.
- The post does not mention that `podman play kube` requires cgroups v2 for rootless resource limits — a minor version-specific caveat, not a technical error.
- The OneUptime OTLP endpoint `https://otlp.oneuptime.com` matches the convention used in other posts in this blog repo.
