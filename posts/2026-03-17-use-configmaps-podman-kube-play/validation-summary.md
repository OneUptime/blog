# Validation Summary: How to Use ConfigMaps with podman kube play

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- `podman kube play`
- Kubernetes ConfigMaps
- Kubernetes Pod manifests
- YAML
- NGINX container configuration

## Sources Consulted
- Podman `podman kube play` official documentation: https://docs.podman.io/en/latest/markdown/podman-kube-play.1.html
- Kubernetes ConfigMaps official documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Volumes official documentation: https://kubernetes.io/docs/concepts/storage/volumes/

## Issues Found
- The environment-variable example used `command: ["python", "-c", "import os; print(os.environ.get('DATABASE_HOST'))"]`, which exits immediately after printing. That made the later `podman exec myapp-app env | grep DATABASE` command invalid because there would be no running container to exec into. Changed the command to `["sleep", "infinity"]` so the container stays running and the documented `podman exec` verification works.

## Review Notes
- Podman supports ConfigMap references as environment-variable sources and ConfigMap-backed volumes in `podman kube play`, but ConfigMaps are not standalone Podman objects; Podman creates the needed environment variables or anonymous volumes when a pod or deployment uses them.
- `podman` was not installed in the local review environment, so CLI behavior was verified against the official Podman documentation rather than local `podman --help` output.
