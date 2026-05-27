# Validation Summary: How to Use Litmus Chaos for Reliability Testing on GKE Clusters on GCP

## Status
validated

## Post Type
Tutorial / hands-on guide

## Technologies Covered
- Google Kubernetes Engine
- Google Cloud SDK
- Kubernetes Deployments, Services, RBAC, and Custom Resources
- Litmus Chaos / ChaosCenter
- Litmus chaos-charts
- Helm
- Cloud Monitoring alert policies

## Sources Consulted
- Litmus ChaosCenter installation docs: https://docs.litmuschaos.io/docs/getting-started/installation
- Litmus 3.0 documentation note: https://docs.litmuschaos.io/docs/3.0.0/introduction/what-is-litmus
- Litmus pod-delete experiment docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-delete/
- Litmus node-drain experiment docs: https://litmuschaos.github.io/litmus/experiments/categories/nodes/node-drain/
- Litmus pod-network-loss experiment docs: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-network-loss/
- Litmus chaos-charts repository and release installation instructions: https://github.com/litmuschaos/chaos-charts
- Google Cloud SDK `gcloud container clusters create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The Litmus install manifest URL used in the post returned 404 and Litmus 3.0.0 documentation is no longer actively maintained. Updated the installation to use the official Helm repository and chart, which is the documented straightforward self-hosted installation path.
- The Litmus frontend exposure flow patched `litmusportal-frontend-service` after install. With the Helm release used in the corrected install, the frontend can be configured as a LoadBalancer at install time and accessed through `chaos-litmus-frontend-service`, so the commands were updated.
- The pod-delete ChaosHub API URL no longer returns the experiment manifest. Replaced it with the official chaos-charts release download and `fault.yaml` installation flow.
- The pod-delete RBAC example was missing several permissions from the Litmus minimal RBAC, including `configmaps`, `pods/exec`, parent workload lookups, and `deletecollection` on pods. Added the missing permissions so the example matches the documented experiment requirements.
- The node-drain example used app-scoped environment variables that are not node-drain tunables. Updated it to use `TARGET_NODE`, removed the irrelevant `appinfo`, and added the documented requirement to cordon the target node and use the node-drain ClusterRole permissions.
- The pod-network-loss example omitted GKE/containerd runtime settings and pod targeting percentage. Added `CONTAINER_RUNTIME`, `SOCKET_PATH`, and `PODS_AFFECTED_PERC` based on the Litmus experiment tunables.
- The Cloud Monitoring alert command used non-existent `--condition-threshold-*` flags. Replaced them with the documented `--if` and `--duration` flags for `gcloud monitoring policies create`.

## Review Notes
- I could not run `kubectl`, `gcloud`, or `helm` locally because they are not installed in this workspace. Commands were checked against official documentation and remote manifests/releases where possible.
- The node-drain and pod-network-loss sections now point readers to the official RBAC requirements instead of embedding full RBAC manifests, keeping the post focused while avoiding incomplete runnable snippets.
