# Validation Summary: How to Implement Networking Best Practices in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- RKE2
- Kubernetes
- NetworkPolicy
- Pod Security Admission / Pod Security Standards
- PodDisruptionBudget
- Fleet GitOps
- Prometheus Operator
- cert-manager

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher Projects API workflow: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Fleet Create a GitRepo Resource: https://fleet.rancher.io/0.14/how-tos-for-users/gitrepo-add
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Debugging DNS Resolution: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes Specifying a Disruption Budget for your Application: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes `kubectl annotate` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/
- Kubernetes `kubectl label` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- cert-manager Certificate resource: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The Rancher provisioning example mixed the current `provisioning.cattle.io/v1` cluster API with the legacy `AWSNodeTemplate` kind. I changed both machine pool references to `Amazonec2Config` and added `cloudCredentialSecretName`, which Rancher’s current RKE2 cluster configuration reference includes for cloud-provisioned machine pools.
- The section title `Namespace Hierarchy` was technically inaccurate because Kubernetes namespaces are flat and cannot be nested. I renamed it to `Namespace Organization`.
- The namespace/project command used `field.cattle.io/projectId` as a label, but Rancher documents project assignment via a namespace annotation and requires the value format `<cluster ID>:<project ID>`. I split the example into a `kubectl label` command for labels and a `kubectl annotate` command for Rancher project assignment.
- The NetworkPolicy example started from a full default-deny ingress/egress policy but did not allow DNS, which would break normal service-name resolution for most workloads. I added explicit DNS egress to CoreDNS on TCP/UDP 53 and clarified that the cluster CNI must support NetworkPolicy for the policy to have any effect.
- The same NetworkPolicy example used a non-standard namespace label for the ingress controller namespace. I changed that selector to the standardized `kubernetes.io/metadata.name` namespace label that Kubernetes sets automatically.
- The Pod Security section conflated availability controls with pod security by labeling the file as `pod-security-policy.yaml` even though it actually used a `PodDisruptionBudget` plus Pod Security Standards namespace labels. I corrected the section wording and file comment to reflect Pod Security plus availability, and to avoid confusion with removed PodSecurityPolicy APIs.
- The audit script’s namespace loop read the header row from `kubectl get namespaces`, so it would try to inspect a fake namespace named `NAME`. I changed the command to use `--no-headers`, an explicit custom column, and safe shell quoting.
- The certificate audit command assumed cert-manager resources were present and used the short resource name without any fallback. I made the CRD group explicit with `certificates.cert-manager.io` and added a fallback message when cert-manager is not installed.

## Review Notes
- The `ResourceQuota`, `LimitRange`, `PodDisruptionBudget`, `PrometheusRule`, and Fleet `GitRepo` examples are syntactically valid against current upstream APIs after the fixes above.
- The Prometheus alert rules use application-specific metric names such as `http_requests_total` and `http_request_duration_seconds_bucket`; those are valid PromQL patterns, but users still need their workloads to expose matching metrics.
- The example pins `kubernetesVersion` to `v1.28.8+rke2r1`. That is acceptable as an example, but the exact version string should be updated over time to match the Rancher release a reader is actually deploying.
