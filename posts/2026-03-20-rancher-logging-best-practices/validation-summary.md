# Validation Summary: How to Implement Operational Best Practices in Rancher - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- RKE2
- Fleet
- ResourceQuota and LimitRange
- NetworkPolicy
- Pod Security Admission
- PodDisruptionBudget
- Prometheus Operator / PrometheusRule
- cert-manager
- `kubectl`
- `jq`

## Sources Consulted
- Rancher RKE2 cluster configuration reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher projects API workflow docs: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher project resource quotas guide: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher monitoring architecture overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Fleet GitRepo resource reference: https://fleet.rancher.io/0.10/ref-gitrepo
- Fleet target mapping guide: https://fleet.rancher.io/0.13/gitrepo-targets
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes well-known labels, annotations, and taints reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes Pod Security Admission docs: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes namespace-label enforcement guide for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes ResourceQuota docs: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange docs: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes PodDisruptionBudget docs: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes JSONPath support reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- cert-manager Certificate docs: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The original title, tags, description, introduction, and conclusion described Rancher logging and referenced Fluentd and Elasticsearch, but the body covered broader Rancher operational, security, GitOps, and monitoring practices instead. I corrected the metadata and title so the post now matches its actual technical scope.
- The Rancher cluster example used `AWSNodeTemplate` inside a `provisioning.cattle.io/v1` `Cluster` manifest. Current Rancher RKE2 machine-pool examples use machine config references such as `Amazonec2Config`, and the example also needed `cloudCredentialSecretName` to match Rancher’s documented cluster YAML shape.
- The namespace example used `field.cattle.io/projectId` as a label. Rancher documents project assignment via the `field.cattle.io/projectId` annotation, so the example was corrected to use `kubectl annotate` with the documented `<cluster-id>:<project-id>` format.
- The NetworkPolicy example matched namespaces using ad hoc `app` labels that were never created in the post. It was updated to use the built-in immutable namespace label `kubernetes.io/metadata.name`, which Kubernetes documents specifically for targeting namespaces by name.
- The Pod Security section used a misleading `pod-security-policy.yaml` filename comment even though PodSecurityPolicy has been removed and the manifest was actually a PodDisruptionBudget plus Pod Security Admission labels. I corrected the labeling and pinned the Pod Security Standard version to the Kubernetes minor version shown in the cluster example.
- The audit script queried cert-manager certificates using a generic resource name with no fallback, iterated `kubectl get namespaces` output including the header row, and only checked regular containers for privileged mode. I updated it to use the fully qualified `certificates.cert-manager.io` resource with a graceful fallback, a JSONPath-based namespace list, and a `jq` predicate that checks init, regular, and ephemeral containers.

## Review Notes
- The PrometheusRule example is syntactically valid, but it assumes the monitored applications expose `http_requests_total` and `http_request_duration_seconds_bucket` metrics with the expected labels.
- The pinned `kubernetesVersion` and Pod Security Admission version labels should be kept aligned with the Rancher release’s supported Kubernetes versions.
- No technical issues remain after correction, but the post is now accurately positioned as a Rancher operational-best-practices guide rather than a logging-specific guide.
