# Validation Summary: How to Use Dapr Shared Mode to Reduce Sidecar Overhead

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Shared (dapr-shared)
- Kubernetes (Deployments, DaemonSets, Services)
- Helm (OCI registry charts)

## Sources Consulted
- [Dapr Shared official documentation](https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-dapr-shared/)
- [dapr/dapr-shared GitHub repository README](https://github.com/dapr/dapr-shared/blob/main/README.md)
- [dapr-shared tutorial](https://github.com/dapr/dapr-shared/blob/main/docs/tutorial/README.md)
- [Dapr Kubernetes annotations reference](https://docs.dapr.io/reference/arguments-annotations-overview/)

## Issues Found

1. **Wrong Helm chart source**: The post used `dapr/dapr-shared` from `https://dapr.github.io/helm-charts/` with `helm repo add`. The dapr-shared chart is actually distributed via OCI registry at `oci://registry-1.docker.io/daprio/dapr-shared-chart` and is not part of the standard Dapr Helm charts repository. Fixed to use the correct OCI-based `helm install` command.

2. **Fabricated `dapr.io/shared-mode: "true"` annotation**: No such annotation exists in Dapr. Dapr Shared does not use special pod annotations. Applications disable sidecar injection with `dapr.io/enabled: "false"` and connect to the shared instance via environment variables. Removed the fake annotation and the `dapr.io/app-id` annotation (which is a sidecar annotation, not needed for shared mode).

3. **Wrong environment variables**: The post used `DAPR_HTTP_PORT` and `DAPR_GRPC_PORT` with bare port numbers. The correct approach is `DAPR_HTTP_ENDPOINT` and `DAPR_GRPC_ENDPOINT` with full Kubernetes service URLs (e.g., `http://<release-name>-dapr.<namespace>.svc.cluster.local:3500`). Fixed with correct variable names and example values.

4. **Misleading architecture description**: The post described Dapr Shared as "running a single Dapr process on each node that all pods on that node share." In reality, you deploy one Dapr Shared Helm release per application (app-id), and the strategy can be DaemonSet (per-node) or Deployment (per-cluster). Fixed to accurately describe both deployment strategies and the per-app-id model.

5. **Incorrect configuration approach**: The post showed a ConfigMap wrapping a Dapr Configuration resource. The correct approach is to create a standard Dapr Configuration CRD and reference it via the `shared.daprd.config` Helm value. Fixed with the correct pattern.

6. **Wrong namespace and Helm release naming**: The install command used `--namespace dapr-system` and a generic release name. Dapr Shared instances are typically deployed in the application namespace. Fixed with correct conventions.

7. **Overstated resource savings claim**: The "single ~60 MB process per node" claim was misleading because it's one process per app-id per node (with DaemonSet strategy). Revised the resource savings section to be more accurate.

8. **Inaccurate limitation about App ID consistency**: The original said "App ID must be consistent across pods using the same shared process." Since each app-id gets its own Helm release, this was replaced with the accurate limitation that each application requires its own Dapr Shared Helm release.

## Review Notes
- The `shared.strategy` default is `daemonset` according to the GitHub README. The blog now documents both strategies.
- The dapr-shared project is still relatively early-stage within the Dapr ecosystem. Users should check for the latest Helm chart versions and parameter changes.
- The post originally claimed "up to 90% memory reduction" in the summary; this was removed as it depends heavily on the number of app-ids and nodes, making a blanket percentage claim misleading.
