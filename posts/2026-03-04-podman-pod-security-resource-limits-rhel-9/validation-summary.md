# Validation Summary: How to Configure Podman Pod Security and Resource Limits on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Linux cgroups v2
- Linux capabilities
- SELinux labels
- seccomp profiles
- containers.conf
- Containerfile

## Sources Consulted
- Podman run reference: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman pod create reference: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- containers.conf man page: https://www.mankier.com/5/containers.conf
- Red Hat Enterprise Linux 9 container documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Docker Official Image documentation for nginx: https://hub.docker.com/_/nginx
- NGINX Docker deployment documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-docker/

## Issues Found
- The pod section said limits were set at the pod level, but the example only set limits on individual containers. Updated `podman pod create` to include `--memory 512m --cpus 1` and adjusted the section text and heading to describe both pod-level and per-container limits.
- The nginx capability example dropped all capabilities but only added `NET_BIND_SERVICE`. A stock nginx image commonly needs to drop worker privileges at startup, so the example now also keeps `SETUID` and `SETGID`.
- The read-only nginx example did not provide a writable cache directory. Added `--tmpfs /var/cache/nginx` so nginx has writable runtime cache space while the root filesystem remains read-only.
- The non-root nginx example could fail because the stock nginx image expects root-owned runtime setup and low-port binding behavior. Changed the example to use UBI Minimal with `sleep infinity`, which accurately demonstrates `--user 1001:1001`.
- The Containerfile used `useradd` on `ubi9/ubi-minimal`, where that command is not guaranteed to exist by default. Replaced it with numeric `USER 1001:1001`.
- The ulimit example used `--ulimit nproc`, but Podman documentation cautions that `nproc` is a user-scoped Linux limit rather than a container process-count limit. Removed it; the post already demonstrates container process limiting with `--pids-limit`.

## Review Notes
- Podman resource-limit flags can require sufficient cgroup delegation, especially for rootless containers. The examples are valid for RHEL 9 with cgroups v2, but operators should verify their rootless cgroup setup when applying them in production.
- The block I/O example uses `/dev/sda` as a sample device path. The actual block device path must match the target RHEL host.
