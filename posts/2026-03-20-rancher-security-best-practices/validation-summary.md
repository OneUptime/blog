# Validation Summary: How to Implement Security Best Practices in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RKE2
- Fleet
- Prometheus Operator
- cert-manager
- `kubectl`
- `jq`

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher Projects workflow: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher project resource quota behavior: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes PodDisruptionBudget task guide: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Fleet GitRepo Resource reference: https://fleet.rancher.io/0.10/reference/ref-gitrepo
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/

## Issues Found
- The Rancher provisioning example used `AWSNodeTemplate` under `machineConfigRef`, which is a legacy RKE1 node template kind. It was changed to `Amazonec2Config` to match Rancher’s `provisioning.cattle.io/v1` cluster examples.
- The namespace labeling example used `field.cattle.io/projectId` as a label. Rancher documents this as an annotation when assigning a namespace to a project, and the value must be in `<cluster ID>:<project ID>` format. The example was changed to `kubectl annotate ... field.cattle.io/projectId=YOUR_CLUSTER_ID:YOUR_PROJECT_ID`.
- The default-deny network policy example omitted DNS egress. Kubernetes documents that deny-all egress also blocks DNS, so explicit TCP/UDP 53 egress to `kube-system` was added.
- The “Pod Security” section used a `PodDisruptionBudget`, which is an availability control rather than a Pod Security Standards control. It was replaced with a deployment example that sets `runAsNonRoot`, `seccompProfile: RuntimeDefault`, `allowPrivilegeEscalation: false`, and drops all capabilities.
- The audit script iterated over `kubectl get namespaces` output with headers included, which would incorrectly report `NAME` as an empty namespace. It was changed to use `--no-headers -o custom-columns=':metadata.name'` and proper shell quoting.
- The audit output label `Pod security violations` overstated what the `jq` filter actually checked. It was renamed to `Privileged containers` to match the implementation.

## Review Notes
- The `kubernetesVersion` value in the cluster example is syntactically valid, but pinned Rancher/RKE2 versions should be refreshed periodically against the Rancher support matrix before production use.
- The network policy examples assume a CNI that enforces Kubernetes `NetworkPolicy` resources and that the selected namespace labels exist in the target cluster.
- The Prometheus alert examples are structurally valid `PrometheusRule` objects, but the metric names and labels must match the instrumentation exposed by the workloads being monitored.
