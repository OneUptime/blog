# Validation Summary: Why a kOps Rolling Update Stops on Cluster Validation—and How to Resume Safely

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- kOps rolling updates, cluster validation, cluster updates, and reconciliation
- Kubernetes Nodes, Pods, PriorityClasses, PodDisruptionBudgets, and the Eviction API
- kubectl
- systemd and journalctl
- Cloud instance groups, surge capacity, and state-store access

## Sources Consulted

- [kOps: Rolling Updates](https://kops.sigs.k8s.io/operations/rolling-update/)
- [kOps CLI: `kops rolling-update cluster`](https://kops.sigs.k8s.io/cli/kops_rolling-update_cluster/)
- [kOps CLI: `kops validate cluster`](https://kops.sigs.k8s.io/cli/kops_validate_cluster/)
- [kOps CLI: `kops get instances`](https://kops.sigs.k8s.io/cli/kops_get_instances/)
- [kOps CLI: `kops update cluster`](https://kops.sigs.k8s.io/cli/kops_update_cluster/)
- [kOps CLI: `kops reconcile cluster`](https://kops.sigs.k8s.io/cli/kops_reconcile_cluster/)
- [kOps: Troubleshooting](https://kops.sigs.k8s.io/operations/troubleshoot/)
- [kOps: Upgrading Kubernetes](https://kops.sigs.k8s.io/tutorial/upgrading-kubernetes/#note-for-kubernetes-131)
- [kOps upstream rolling-update implementation](https://github.com/kubernetes/kops/blob/master/pkg/instancegroups/instancegroups.go)
- [Kubernetes: Disruptions and PodDisruptionBudgets](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)
- [Kubernetes: Safely Drain a Node](https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/)
- [Kubernetes: JSONPath Support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found

- The introduction described every update as strictly sequential. kOps can replace multiple instances concurrently when `maxUnavailable` or `maxSurge` permits it, so the statement was scoped to the default single-node concurrency.
- The API/DNS/auth troubleshooting row directed the operator away from node health entirely. An unreachable API can also indicate an unhealthy control plane, so the first investigation now includes API-server reachability and health as well as the operator endpoint and kubeconfig.
- The cloud-resource update and final drift-preview commands assumed that kOps directly manages the cloud resources. Terraform-managed clusters must generate Terraform configuration and use Terraform plan/apply instead, so those instructions now distinguish the two workflows.
- The Kubernetes 1.31+ section presented `kops reconcile cluster` as universal. The official upgrade guide documents a separate targeted Terraform apply and rolling-update workflow for Terraform-managed clusters, so the reconcile guidance was scoped to directly managed clusters and the Terraform exception was added.

## Review Notes

- All documented kOps flag names and defaults were confirmed against the current CLI reference and upstream implementation as of 2026-08-01.
- The shell snippets are syntactically valid. The locally available kubectl v1.34.1 also confirms the used `--all-namespaces`, `--sort-by`, YAML output, and JSONPath options.
- The post correctly distinguishes drain failures from validation failures, explains that direct Pod deletion bypasses PDB protection, and warns that `--cloudonly` skips validation, cordoning, and draining.
- The listed CLI defaults are version-specific and should be rechecked if the post is revisited after a future kOps release.
