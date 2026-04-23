# Validation Summary: How to Implement Monitoring Best Practices in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RKE2
- Fleet
- Prometheus Operator / PrometheusRule
- NetworkPolicy
- Pod Security Admission
- cert-manager
- `kubectl`
- `jq`

## Sources Consulted
- Rancher RKE2 cluster configuration reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher project workflows API docs: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher project resource quotas guide: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher monitoring architecture overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Fleet GitRepo resource reference: https://fleet.rancher.io/0.10/reference/ref-gitrepo
- Fleet target mapping guide: https://fleet.rancher.io/0.13/gitrepo-targets
- Kubernetes NetworkPolicy docs: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes well-known labels reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Pod Security Admission docs: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes namespace label enforcement guide: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels
- Kubernetes ResourceQuota docs: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange docs: https://kubernetes.io/docs/concepts/policy/limit-range
- Kubernetes PodDisruptionBudget docs: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- cert-manager Certificate docs: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The Rancher cluster provisioning example used `AWSNodeTemplate` inside a `provisioning.cattle.io/v1` `Cluster`. Current Rancher RKE2 machine-pool examples use machine config references such as `Amazonec2Config`, and the example also needed `cloudCredentialSecretName` to match Rancher’s documented cluster YAML shape.
- The namespace example used `field.cattle.io/projectId` as a label. Rancher documents project assignment via the `field.cattle.io/projectId` annotation, so the example was corrected to use `kubectl annotate` with the documented `<cluster-id>:<project-id>` format.
- The NetworkPolicy example matched namespaces using ad hoc `app` labels that were never created in the post. It was updated to use the built-in immutable namespace label `kubernetes.io/metadata.name`, which Kubernetes documents specifically for targeting namespaces by name.
- The Pod Security block used a misleading `pod-security-policy.yaml` filename comment even though PodSecurityPolicy is removed and the manifest was actually a PodDisruptionBudget plus Pod Security Admission labels. The comments were corrected, and version labels were added to pin the Pod Security Standard to the Kubernetes minor version shown elsewhere in the post.
- The audit script treated cert-manager `Certificate` resources as if they were always present and queried them with the generic `certificates` short name. It was updated to use the fully qualified `certificates.cert-manager.io` resource and to fall back cleanly when cert-manager is not installed.
- The audit script iterated `kubectl get namespaces` output including the header row, which would incorrectly try to inspect a namespace named `NAME`. It was changed to a JSONPath-based namespace list.
- The privileged-pod audit query could emit duplicate matches and only inspected regular containers. It was updated to use a robust `jq` predicate that checks init, regular, and ephemeral containers.

## Review Notes
- The PrometheusRule example is syntactically valid, but it assumes the monitored applications expose `http_requests_total` and `http_request_duration_seconds_bucket` metrics with the expected labels.
- The pinned `kubernetesVersion` and Pod Security Admission version labels should be kept aligned with the Rancher release’s supported Kubernetes versions.
- The post title emphasizes monitoring, but much of the body is broader Rancher platform governance and security guidance rather than monitoring-specific practice.
