# Validation Summary: How to Configure Networking for podman kube play

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- podman kube play
- Kubernetes Pod YAML
- Container networking
- Podman custom networks

## Sources Consulted
- Podman `podman kube play` documentation: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Kubernetes Pods documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes command and arguments documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/

## Issues Found
- The multi-pod connectivity example used `curl` inside the `nginx:alpine` container. That image should not be assumed to include `curl`, so the command could fail even when networking is configured correctly. Changed it to use BusyBox `wget`, which is available in Alpine-based images, while preserving the same connectivity check.

## Review Notes
- The local review environment did not have `podman` installed, so commands were verified against official Podman documentation rather than local `--help` output.
- `podman kube play --publish` is documented as defining or overriding YAML port definitions, with CLI mappings taking precedence for matching `containerPort` values.
- `podman kube play --ip` is documented for assigning a static IP to a pod. For multiple networks, Podman documents the `--network name:ip=<ip>` syntax.
