# Validation Summary: How to List Pods with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman pods
- Podman CLI filtering and formatting
- Shell scripting
- jq

## Sources Consulted
- Podman official documentation: podman-pod-ps, https://docs.podman.io/en/latest/markdown/podman-pod-ps.1.html
- Podman official documentation: podman-pod-inspect, https://docs.podman.io/en/latest/markdown/podman-pod-inspect.1.html
- Red Hat Enterprise Linux official documentation for Podman pod usage, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/epub/building_running_and_managing_containers/using-podman-events-for-auditing_assembly_monitoring-containers

## Issues Found
- The custom format example used `{{.NumContainers}}` with `podman pod ls`. The official `podman pod ps` formatting placeholders use `{{.NumberOfContainers}}` for the number of containers attached to a pod, so the example was updated accordingly.
- The stopped pod filter example used `--filter status=exited`. Podman documents `stopped` and `exited` as distinct pod status filter values, so the command was changed to `--filter status=stopped` to match the comment.

## Review Notes
`podman pod ps` is the command documented in Podman's official man page for listing pods. Red Hat documentation also uses `podman pod ls` in Podman pod workflows, so the post's use of `podman pod ls` was left unchanged.
