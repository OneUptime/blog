# Validation Summary: How to Implement Canary Node Pool Upgrades for Risk Mitigation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Amazon EKS managed node groups
- Google Kubernetes Engine node pools
- AWS CLI
- gcloud CLI
- kubectl
- Bash

## Sources Consulted
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS CLI `eks create-nodegroup` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-nodegroup.html
- AWS CLI `eks update-nodegroup-config` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-nodegroup-config.html
- Amazon EKS Nodegroup API reference: https://docs.aws.amazon.com/eks/latest/APIReference/API_Nodegroup.html
- GKE node pool management guide: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/node-pools
- gcloud `container node-pools create` command reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- gcloud `container get-server-config` command reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/get-server-config
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- kubectl generated command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The EKS example implied a managed node group could be created at a newer Kubernetes version before the control plane supported it. Updated the explanation to state that EKS managed node group versions must match the current control plane version.
- The post used Kubernetes `1.29` as the target version, which is outdated for a 2026 validation. Updated the EKS example to a supported `1.34` path and changed the GKE example to read an available node version from `gcloud container get-server-config`.
- The EKS `--labels` example used shorthand that was less consistent with the official AWS CLI examples. Updated it to JSON map syntax.
- The traffic-shifting script mixed percentages and replica counts, scaling the stable deployment to values like 98 while describing a 10-replica deployment. Updated it to compute canary and stable replicas from `TOTAL_REPLICAS`.
- The monitoring script had a malformed `echo` line that broke Bash syntax. Split it into separate valid `echo` commands.
- The monitoring script could divide by zero when stable errors were zero or when no pods were returned by `kubectl top`. Added guards for those cases.
- The automated canary analysis script defined an unused latency threshold and could divide by zero when no HTTP requests were present. Removed the unused variable and added request-count guards.
- The automated canary analysis script defined an error-rate threshold but did not use it. Updated the failure condition to check both the absolute threshold and relative stable comparison.
- The promotion script selected old nodes using a `nodepool` label that the EKS examples did not create. Updated the selector to use the EKS managed node group label `eks.amazonaws.com/nodegroup`.
- The promotion script used invalid `aws eks update-nodegroup-config --labels stable=true,canary-` syntax. Updated it to the documented `addOrUpdateLabels` and `removeLabels` structure.

## Review Notes
The examples are still illustrative and assume matching deployment names, labels, metrics-server availability for `kubectl top`, log formats containing HTTP status codes, and suitable IAM/subnet values. Production implementations should usually pair this with PodDisruptionBudgets, readiness checks, service mesh or ingress traffic splitting where applicable, and provider-specific upgrade policies.
