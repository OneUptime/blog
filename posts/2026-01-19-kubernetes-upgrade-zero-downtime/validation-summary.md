# Validation Summary: How to Upgrade Kubernetes Clusters with Zero Downtime

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Kubernetes
- kubeadm
- kubectl
- etcd and etcdutl
- Amazon EKS
- Google Kubernetes Engine (GKE)
- Azure Kubernetes Service (AKS)
- PodDisruptionBudget
- Prometheus / Grafana monitoring queries

## Sources Consulted
- Kubernetes kubeadm upgrade documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes Linux node upgrade documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/upgrading-linux-nodes/
- Kubernetes kubeadm installation and package repository documentation: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes etcd operations documentation: https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes ComponentStatus API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/component-status-v1/
- Kubernetes metrics reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- AWS CLI EKS update-cluster-version reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-version.html
- AWS CLI EKS update-nodegroup-version reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-nodegroup-version.html
- Google Cloud SDK gcloud container clusters upgrade reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/upgrade
- Azure CLI AKS reference: https://learn.microsoft.com/en-us/cli/azure/aks

## Issues Found
- The kubeadm examples used old Kubernetes 1.28 Debian package versions with the legacy `-00` package suffix. Updated the examples to current pkgs.k8s.io-style wildcard package syntax and a current minor-version example.
- The etcd snapshot verification and restore examples used deprecated `etcdctl snapshot status` / restore flows. Updated them to use `etcdutl`, matching current Kubernetes etcd guidance.
- The health check example used deprecated `kubectl get componentstatuses`. Replaced it with the API server `/readyz?verbose` endpoint.
- The worker-node scripts selected worker nodes using only the current control-plane label and treated `NotReady` as ready by grepping for `Ready`. Updated the selector to exclude both current and legacy control-plane labels and replaced the grep loop with `kubectl wait --for=condition=Ready`.
- The parallel drain script did not abort if one of the background drains failed. Added a failure check that uncordons the batch and exits.
- The managed Kubernetes examples hard-coded stale Kubernetes 1.28 target versions and used shell placeholders that would not run if copied. Replaced them with shell variables for target versions.
- The Deployment YAML was not valid as an `apps/v1` Deployment because it lacked `spec.selector`, pod template labels, and containers. Added the required selector, matching labels, and a minimal container.
- The standalone Pod YAML lacked required object metadata and a container image. Added a name and image.
- The scheduler metric `scheduler_e2e_scheduling_duration_seconds_bucket` is no longer listed in the current Kubernetes metrics reference. Replaced it with `scheduler_scheduling_attempt_duration_seconds_bucket`.
- The related PDB resource link pointed to a resource quotas article. Updated it to a relevant PodDisruptionBudget-related post in the repository.

## Review Notes
Zero downtime still depends on application architecture, available spare capacity, PDB settings, readiness behavior, storage choices, and provider-specific upgrade behavior. The post now gives technically valid examples, but operators should still test exact target versions against their cluster provider and configured package repositories before running the commands.
