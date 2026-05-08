# Validation Summary: How to Configure Pod Exit Policy in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Container lifecycle configuration
- Podman CLI

## Sources Consulted
- Podman `podman pod create` official documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `podman pod inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-pod-inspect.1.html
- Podman Quadlet/systemd unit official documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html

## Issues Found
- The post described `--exit-policy stop` as useful for jobs that should "clean up" automatically. Podman's official documentation says this policy stops the pod, including the infra container, when the last container exits; it does not remove the pod or completed containers. Updated the wording to say the pod stops automatically instead of implying automatic cleanup/removal.

## Review Notes
The local environment did not have `podman` installed, so command behavior was verified against official Podman documentation rather than local execution. The documented `--exit-policy continue | stop` values, the default `continue` behavior for `podman pod create`, and the `podman pod inspect --format '{{.ExitPolicy}}'` field are current in the official docs.
