# Validation Summary: How efficient are containers vs virtual machines? A deep dive into density

## Status
validated

## Post Type
Technical guide / infrastructure performance analysis

## Technologies Covered
- Linux containers
- Virtual machines and hypervisors
- Docker and Dockerfile multi-stage builds
- Kubernetes resource requests, limits, probes, kubectl, and Vertical Pod Autoscaler
- Linux namespaces, cgroups, seccomp, AppArmor, SELinux, and OverlayFS
- Container and VM networking

## Sources Consulted
- Docker Docs: Storage drivers and writable layers: https://docs.docker.com/engine/storage/drivers/
- Docker Docs: OverlayFS storage driver and page-cache sharing: https://docs.docker.com/engine/storage/drivers/overlayfs-driver/
- Docker Docs: Container resource constraints: https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: `docker image ls`: https://docs.docker.com/reference/cli/docker/image/ls/
- Docker Docs: Multi-stage builds: https://docs.docker.com/build/building/multi-stage/
- Docker Docs: Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Docs: Host network driver and networking overview: https://docs.docker.com/engine/network/drivers/host/
- Kubernetes Docs: Resource management for pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Docs: Configure liveness, readiness, and startup probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes Docs: `kubectl top pod`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes Autoscaler project: Vertical Pod Autoscaler: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler
- Linux manual pages: namespaces(7): https://man7.org/linux/man-pages/man7/namespaces.7.html
- Linux manual pages: cgroups(7): https://man7.org/linux/man-pages/man7/cgroups.7.html
- Linux Kernel documentation: cgroup v2: https://docs.kernel.org/admin-guide/cgroup-v2.html
- Go release notes: Go 1.26: https://go.dev/doc/go1.26
- Alpine Linux releases and downloads: https://alpinelinux.org/releases/ and https://www.alpinelinux.org/downloads/

## Issues Found
- Corrected the VM driver description from only "emulated" drivers to "emulated or paravirtualized" drivers, because common VM stacks use paravirtualized devices such as virtio.
- Corrected the cgroups description to remove generic network limits and describe CPU, memory, I/O, PIDs, and related kernel resources, matching Linux cgroup controller behavior.
- Replaced the AUFS-centric storage wording with "OverlayFS and other storage drivers" to reflect current Docker storage-driver documentation.
- Clarified that VM large-page allocation overhead applies when huge pages are configured, rather than implying all VM memory must be physically contiguous.
- Corrected the Docker copy-on-write explanation so shared image layers are described as storage/page-cache sharing, not automatic sharing of all memory pages.
- Reworded the per-container memory table and example to avoid treating unique writable-layer data as fixed memory overhead.
- Corrected the host-networking claim from "zero networking overhead" to skipping Docker bridge and NAT overhead while still using the host network stack.
- Updated the Dockerfile example from `golang:1.21-alpine` and `alpine:3.19` to `golang:1.26-alpine` and `alpine:3.24`, because Go 1.21 and Alpine 3.19 are outdated for a post validated on 2026-06-22.

## Review Notes
The commands and Kubernetes snippets are syntactically valid based on Docker CLI help and official Kubernetes documentation. Many density and benchmark numbers are workload-dependent illustrative estimates rather than universally guaranteed results; the post now avoids the main mechanistic inaccuracies while preserving the author's density-focused argument.
