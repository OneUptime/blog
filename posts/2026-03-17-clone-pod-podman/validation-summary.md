# Validation Summary: How to Clone a Pod with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Podman containers
- Container networking and port publishing

## Sources Consulted
- Podman official documentation: `podman-pod-clone` - https://docs.podman.io/en/stable/markdown/podman-pod-clone.1.html
- Podman official documentation: `podman-pod-create` - https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman official documentation: `podman-pod-ps` - https://docs.podman.io/en/stable/markdown/podman-pod-ps.1.html
- Podman official documentation: `podman-ps` - https://docs.podman.io/en/stable/markdown/podman-ps.1.html

## Issues Found
- The post incorrectly said `podman pod clone` only clones the pod configuration and that cloned pods start empty with only the infra container. Updated the text to state that `podman pod clone` recreates the pod configuration and its containers.
- The post described the default clone name as auto-generated. Updated it to the documented default format, `<ORIGINAL_NAME>-clone`, using `original-pod-clone` in the example.
- The post used `podman pod clone -p 9090:80`, but `-p/--publish` is available on `podman pod create`, not `podman pod clone`. Replaced that example with a supported resource override using `--cpus=2`.
- The post used the invalid `podman pod ls` Go template field `.NumContainers`. Replaced it with the documented `.NumberOfContainers` placeholder.
- The A/B testing example attempted to clone a pod while changing the published host port and container image, neither of which is supported by `podman pod clone`. Reworked the example as a parallel test clone and removed the unsupported port and image override commands.
- The container verification example used `podman ps --filter pod=cloned-pod`, which only lists running containers by default. Changed it to `podman ps -a --filter pod=cloned-pod` so cloned-but-not-yet-running containers are visible.

## Review Notes
Podman was not installed in the local environment, so command behavior was verified against the official Podman documentation rather than local `--help` output. The corrected examples avoid changing port mappings after pod creation because Podman documents pod port publishing as immutable once the pod is created.
