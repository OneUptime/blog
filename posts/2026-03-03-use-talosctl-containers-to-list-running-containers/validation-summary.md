# Validation Summary: How to Use talosctl containers to List Running Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- containerd
- Kubernetes
- Bash scripting

## Sources Consulted
- Sidero Labs Talos CLI reference for `talosctl containers`, `talosctl stats`, `talosctl logs`, `talosctl processes`, and `talosctl upgrade`: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs Talos logging documentation for Kubernetes container log and container listing examples: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/logging-and-telemetry/logging
- Sidero Labs Talos Linux FAQ for the no shell / no SSH architecture: https://docs.siderolabs.com/talos/v1.7/troubleshooting/faqs
- Kubernetes documentation for node-name field selector usage: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The post said `talosctl containers --nodes <node>` lists all containers and showed both `system` and `k8s.io` containers in the same output. The Talos CLI reference documents `-k, --kubernetes` as the switch for the `k8s.io` containerd namespace, so I changed the basic example to system containers and clarified that Kubernetes containers require `-k`.
- The post implied all Talos node containers and system processes are returned from one containerd query. I narrowed the wording to selected containerd namespaces and containerized system workloads.
- The example output omitted the `NODE` column and used generic `RUNNING` status values for Kubernetes containers. I updated examples to match Talos-style output more closely, including `CONTAINER_EXITED` for stopped Kubernetes containers.
- The post described the default namespace behavior as version-dependent. Current CLI documentation shows `-k` switches to Kubernetes, so I changed the default behavior description to system namespace containers.
- The post included `ghcr.io/siderolabs/kubelet` in a Kubernetes `-k` image list. I removed it from that list because kubelet is a system workload, not a Kubernetes pod container.
- The upgrade example pinned `ghcr.io/siderolabs/installer:v1.7.0`, which is outdated for a 2026 post and could mislead readers. I replaced it with a `<target-talos-version>` placeholder.
- The pod sandbox section said every Kubernetes pod always has a pause container. I changed this to "every running Kubernetes pod" and described pause counting as an estimate of running pod sandboxes.

## Review Notes
The remaining shell snippets are syntactically valid Bash and use documented `talosctl` flags. Counting rows with `tail -n +2 | wc -l` is a rough operational metric rather than a precise Kubernetes object count, but the post now frames the count as container-level inspection rather than exact pod inventory.
