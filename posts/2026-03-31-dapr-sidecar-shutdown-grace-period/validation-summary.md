# Validation Summary: How to Configure Dapr Sidecar Shutdown Grace Period

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (sidecar runtime)
- Kubernetes (pod lifecycle, termination, annotations)
- daprd (Dapr sidecar process)
- kubectl CLI
- jq (JSON filtering)

## Sources Consulted
- [Dapr arguments and annotations for daprd, CLI, and Kubernetes | Dapr Docs](https://docs.dapr.io/reference/arguments-annotations-overview/) — verified the correct annotation name and default values
- [Sidecar health | Dapr Docs](https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/) — verified shutdown behavior and block-shutdown-duration annotation

## Issues Found
1. **Incorrect annotation name** (appeared twice): The post used `dapr.io/sidecar-graceful-shutdown-seconds` but the correct Dapr annotation is `dapr.io/graceful-shutdown-seconds`. The `sidecar-` prefix does not exist in the official Dapr annotation reference. Fixed both occurrences.

2. **Misleading preStop hook explanation**: The post stated the preStop hook "adds 5 seconds before the SIGTERM is sent, giving the app time to stop accepting new work before Dapr begins its own shutdown." This incorrectly implies the preStop hook delays the Dapr sidecar's shutdown. In Kubernetes, each container receives its own SIGTERM independently — a preStop hook on the application container only delays SIGTERM to that container, while the daprd sidecar starts its shutdown in parallel. Updated the explanation to clarify this.

## Review Notes
- The default value for `dapr.io/graceful-shutdown-seconds` is 5 seconds per the official docs. The post does not state a specific default for the Dapr annotation, which avoids version-sensitivity issues.
- The `dapr.io/block-shutdown-duration` annotation (not mentioned in the post) is a related but distinct setting that delays the start of the full shutdown procedure. It could be a useful addition in a future revision.
- The six-step shutdown sequence described in the post is a reasonable description of daprd behavior, though the official documentation does not enumerate the steps in exactly this order. The sequence is directionally accurate.
- The `kubectl logs` command with `jq` filtering is syntactically correct and practical.
- The advice to set `terminationGracePeriodSeconds` greater than the Dapr graceful shutdown period is sound and aligns with official Dapr production guidelines.
