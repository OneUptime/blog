# Validation Summary: How to Use Podman with systemd for Production Container Workloads on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- systemd
- Quadlet
- SELinux volume labeling
- journald logging
- Podman container health checks

## Sources Consulted
- Podman documentation: podman-generate-systemd, https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman documentation: podman-systemd.unit / Quadlet, https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Red Hat Enterprise Linux 9 documentation: Building, running, and managing containers, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Red Hat Enterprise Linux 9.3 release notes: Containers / Quadlet availability, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.3_release_notes/new-features
- Red Hat Ecosystem Catalog / registry image metadata for registry.access.redhat.com/ubi9/nginx-124:latest

## Issues Found
- Current upstream Podman documentation marks `podman generate systemd` as deprecated and recommends Quadlet for containers under systemd. Updated the introduction to clarify that generated units are available for existing containers or pods, but Quadlet is preferred where supported.
- The Quadlet version note was accurate for RHEL 9.3, but more precise as a Podman feature. Updated it to state that RHEL 9.3 and later include Podman 4.6 or newer with Quadlet support.
- The health check example defined `HealthCmd`, `HealthInterval`, and `HealthRetries`, but did not define what should happen when the container becomes unhealthy. Added `HealthOnFailure=kill`, which Podman documents as integrating well with systemd because systemd can then restart the service.

## Review Notes
- The `podman generate systemd --new --name --files --restart-policy=always` example, `mv -Z`, Quadlet path, `PublishPort`, `Volume`, `Exec`, `Restart`, and `TimeoutStartSec` settings match the documented Podman/systemd behavior.
- The `registry.access.redhat.com/ubi9/nginx-124:latest` image exists and exposes port 8080. A local container start using the post's command succeeded.
