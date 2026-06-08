# Validation Summary: How to Configure Podman Pod Resource Sharing

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Podman (pods, containers, networking, volumes)
- Linux kernel namespaces (network, IPC, UTS, PID, user, cgroup)
- cgroups (v2 — `memory.max`, `cpu.max`)
- SELinux (`:Z` mount option, label types)
- seccomp profiles
- Kubernetes-compatible pod YAML (`podman play kube` / `podman kube play`)
- systemd integration (`podman generate systemd`)
- nginx (reverse proxy sidecar)
- Fluent Bit (log shipping sidecar)
- Prometheus / statsd_exporter (metrics sidecar)
- PostgreSQL, Redis, busybox, alpine container images

## Sources Consulted
- Podman official documentation: https://docs.podman.io/
- `podman pod create` man page: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- `podman generate kube` man page: https://docs.podman.io/en/latest/markdown/podman-generate-kube.1.html
- `podman play kube` / `podman kube play` man page: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- `podman generate systemd` man page: https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- `podman create --init-ctr` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- `podman events` filter documentation: https://docs.podman.io/en/latest/markdown/podman-events.1.html
- Kubernetes Pod spec API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/#pod-v1-core
- nginx ssl_certificate / proxy_pass docs: https://nginx.org/en/docs/http/ngx_http_ssl_module.html

## Issues Found

**1. Incorrect description of `podman generate kube --service`** (line 652)
- **Was:** `# Generate with persistent volume claims included`
- **Changed to:** `# Generate with a Kubernetes Service object alongside the Pod`
- **Why:** The `--service` (`-s`) flag generates a Kubernetes Service manifest in addition to the Pod manifest. It does not produce PersistentVolumeClaims — PVCs are emitted automatically by `podman generate kube` when named volumes are attached, regardless of the `--service` flag. The original comment misrepresented what the flag does.

## Review Notes
- `podman play kube` (used at line 634/641) still works but is deprecated in favor of `podman kube play` as of Podman 4.x. Both forms work in current releases; no fix needed but a future revision could prefer the newer form.
- `podman generate systemd` (used in the Systemd Integration section) is deprecated in Podman 4.4+ in favor of Quadlet (`.container`, `.pod` unit files in `~/.config/containers/systemd/`). The command still works in current Podman releases, so the example is functional, but Quadlet is now the recommended approach for new deployments.
- The `--share` flag default in modern Podman (5.x) includes `cgroup` in addition to `ipc,net,uts`. The article states the defaults as `network, IPC, and UTS`, which is accurate for the user-facing behavior described (localhost communication, shared IPC, shared hostname) but technically incomplete. Not corrected since the user-facing claim is true.
- `--security-opt no-new-privileges:true` (line 725) uses Docker-style `:` separator. Podman accepts this form along with `no-new-privileges=true` and the boolean-only `no-new-privileges`. All work in current Podman releases.
- `prom/statsd-exporter` (line 489) is a real image but it *receives* statsd metrics rather than *scraping* them. The example wording ("scrapes app metrics") is slightly imprecise but the image is real and the sidecar pattern shown is valid; left as-is since it does not break the example's correctness.
- `podman pod create -v` volumes are attached to the infra container and are inherited by application containers in modern Podman (4.x+); the article also explicitly re-mounts on each container, which is the safe pattern across versions.
- cgroup v2 paths (`/sys/fs/cgroup/memory.max`, `/sys/fs/cgroup/cpu.max`) are correct for modern Linux distributions (Fedora 31+, RHEL 9+, Ubuntu 21.10+). On systems still using cgroup v1 the paths differ; not flagged since cgroup v2 is the default everywhere Podman is typically run.
