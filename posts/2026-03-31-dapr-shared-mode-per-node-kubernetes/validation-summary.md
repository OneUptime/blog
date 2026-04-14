# Validation Summary: How to Use Dapr Shared (Per-Node Deployment) on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Shared (dapr-shared)
- Kubernetes (DaemonSet, Deployment)
- Helm (OCI registry charts)

## Sources Consulted
- Dapr official docs — Deploy Dapr per-node or per-cluster with Dapr Shared: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-dapr-shared/
- GitHub — dapr/dapr-shared repository: https://github.com/dapr/dapr-shared
- dapr-shared README and tutorial: https://github.com/dapr/dapr-shared/blob/main/docs/tutorial/README.md
- Dapr Helm Charts repository: https://dapr.github.io/helm-charts/

## Issues Found

### 1. Incorrect Helm installation command (Critical)
**What was wrong:** The post used `helm install dapr-shared dapr/dapr-shared` suggesting the chart is available in the standard Dapr Helm repository.
**What was changed:** Corrected to use the OCI registry: `helm install my-service-dapr oci://registry-1.docker.io/daprio/dapr-shared-chart`.
**Why:** The dapr-shared chart is not published to the standard Dapr Helm repo. It is only available as an OCI artifact from Docker Hub.

### 2. Incorrect application connection model (Critical)
**What was wrong:** The post showed standard Dapr sidecar annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`, `dapr.io/sidecar-listen-addresses`) on application pods, which would cause Dapr to inject a regular sidecar — defeating the purpose of shared mode.
**What was changed:** Removed all Dapr annotations and replaced with `DAPR_HTTP_ENDPOINT` and `DAPR_GRPC_ENDPOINT` environment variables pointing to the Dapr Shared service.
**Why:** Applications using Dapr Shared do not use Dapr annotations. The Dapr control plane should not inject sidecars into these pods. Instead, Dapr SDKs connect to the shared Dapr instance via environment variables.

### 3. Missing one-release-per-service requirement (Critical)
**What was wrong:** The post implied a single shared Dapr instance serves all applications on a node. The Helm install example used a generic `shared.appId="shared-dapr"`.
**What was changed:** Clarified that each microservice requires its own Dapr Shared Helm release with a unique app-id. Updated the example to show a per-service Helm release.
**Why:** Dapr Shared uses one Helm release per microservice (app-id). This is a fundamental architectural requirement.

### 4. Missing Deployment strategy option (Moderate)
**What was wrong:** The post only described DaemonSet deployment and presented it as the only option.
**What was changed:** Added mention of the Deployment strategy (`--set shared.strategy=deployment`) as an alternative to DaemonSet.
**Why:** Dapr Shared supports both DaemonSet (per-node, default) and Deployment (per-cluster) strategies.

### 5. Unverified Actor limitation claim (Moderate)
**What was wrong:** The post stated "Actor placement is not supported in shared mode" but this is not confirmed in official Dapr documentation.
**What was changed:** Removed the unverified claim and replaced limitations with documented trade-offs (per-service Helm releases, DaemonSet resource usage, Deployment latency, reduced isolation).
**Why:** Making unverified claims about feature support can mislead users. Only documented limitations should be stated.

### 6. Incorrect terminology (Minor)
**What was wrong:** The post used "Dapr Shared Mode" throughout.
**What was changed:** Corrected to "Dapr Shared" which is the official name from Dapr documentation.
**Why:** The official Dapr docs use "Dapr Shared" not "Dapr Shared Mode."

### 7. Incorrect verification commands (Minor)
**What was wrong:** The kubectl commands used `-l app=dapr-shared` as label selectors.
**What was changed:** Updated to use `-l app.kubernetes.io/name=dapr-shared-chart` which matches the labels set by the Helm chart.
**Why:** The OCI Helm chart uses standard Kubernetes label conventions, not `app=dapr-shared`.

## Review Notes
- Dapr Shared is still in early development (v0.0.16 as of review), so APIs and Helm values may change. The post should note this is a pre-1.0 component.
- The resource savings calculation (95% reduction) is illustrative but actual savings depend heavily on the number of distinct microservices, since each needs its own Helm release. The savings are most dramatic when you have many replicas of few services.
- The `shared.remoteURL` and `shared.remotePort` values in the Helm install example should match the actual Kubernetes service and port of the application being fronted by Dapr Shared.
