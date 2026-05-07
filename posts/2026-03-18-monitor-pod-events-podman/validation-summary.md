# Validation Summary: How to Monitor Pod Events with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman pods
- Podman events
- Bash scripting
- jq

## Sources Consulted
- Podman events official documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman pod ps official documentation: https://docs.podman.io/en/latest/markdown/podman-pod-ps.1.html
- Podman pod inspect official documentation: https://docs.podman.io/en/latest/markdown/podman-pod-inspect.1.html
- Podman container inspect official documentation: https://docs.podman.io/en/stable/markdown/podman-container-inspect.1.html
- Podman pod create official documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html

## Issues Found
- The JSON event examples used Docker-style fields such as `.Actor.Attributes.name`, `.Actor.Attributes.containerExitCode`, and `.time`. Podman `events --format json` documents top-level fields such as `.Name`, `.Time`, `.Status`, and `.ContainerExitCode`, so the lifecycle, audit, filtering, and failure-detection examples were updated to use those fields.
- The specific-pod filtering example piped all pod events through `jq` using the incorrect `.Actor.Attributes.name` path. It now uses Podman's documented `--filter pod=web-pod` event filter.
- The pod health monitor assumed `podman pod ps --format json` exposed a `.Containers` array with per-container status objects. The documented `podman pod ps` placeholders expose `.NumberOfContainers` and `.ContainerStatuses`, so the example now uses a Go template and counts `running` statuses from the comma-separated status list.
- The audit example inspected a pod as though `podman pod inspect` returned a single object and used `.InfraContainerId`. The official inspect output is a JSON array and uses `.InfraContainerID`, so the `jq` expression was corrected.
- The failure detector watched `event=die`; Podman documents the container status as `died`, while noting `die` is mapped for Docker compatibility. The example now uses the documented `event=died` spelling.

## Review Notes
Podman is not installed in the local review environment, so command behavior was checked against current official Podman documentation rather than live CLI execution. The examples assume `jq` is installed and that the user has a working Podman environment with permission to pull and run the referenced images.
