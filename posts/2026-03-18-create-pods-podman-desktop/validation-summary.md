# Validation Summary: How to Create Pods with Podman Desktop

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Desktop
- Podman pods
- Kubernetes-style Pod YAML
- Node.js HTTP server example
- Nginx container image

## Sources Consulted
- Podman Desktop documentation: Creating a pod from selected containers: https://podman-desktop.io/docs/containers/creating-a-pod
- Podman documentation: podman pod create: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman documentation: podman run --pod option: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html
- Podman documentation: podman pod ps: https://docs.podman.io/en/latest/markdown/podman-pod-ps.1.html
- Podman documentation: podman ps --pod: https://docs.podman.io/en/stable/markdown/podman-ps.1.html
- Podman documentation: podman kube play: https://docs.podman.io/en/v5.5.1/markdown/podman-kube-play.1.html
- Podman documentation: podman kube down: https://docs.podman.io/en/stable/markdown/podman-kube-down.1.html
- Podman documentation: podman pod stats: https://docs.podman.io/en/stable/markdown/podman-pod-stats.1.html
- Podman documentation: podman pod rm: https://docs.podman.io/en/v5.4.0/markdown/podman-pod-rm.1.html

## Issues Found
- The post said pods share networking and storage/resources. Podman pods share selected namespaces by default, including network, IPC, and UTS, and can use shared volume mounts and resource limits when configured. I changed the wording to avoid implying that storage is automatically shared.
- The post described creating an empty pod from the Podman Desktop Pods section and then adding containers with an Add Container action. Current Podman Desktop documentation describes selecting existing containers on the Containers page and using Create Pod. I updated the UI steps to match the documented workflow.
- The post used `podman play kube` and `podman play kube --down`. Current Podman documentation uses `podman kube play` and `podman kube down`, so I updated those commands.
- The post said YAML definitions ensure the local setup translates directly to production Kubernetes deployments. Podman supports Kubernetes-style YAML, but practical production deployment can still require adaptation. I narrowed the wording to say the manifest is easier to adapt for production Kubernetes deployments.

## Review Notes
Podman is not installed in this workspace, so commands could not be executed locally. The review was completed against current official Podman and Podman Desktop documentation.
