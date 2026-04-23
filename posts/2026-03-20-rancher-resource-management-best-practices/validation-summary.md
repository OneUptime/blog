# Validation Summary: How to Implement Resource Management Best Practices in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- RKE2 machine-provisioned clusters
- Rancher project resource quotas
- Fleet GitOps
- Prometheus Operator and Rancher Monitoring
- cert-manager
- `kubectl`
- `jq`

## Sources Consulted
- Rancher RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Rancher How Resource Quotas Work in Rancher Projects: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher Configuring PrometheusRules: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheusrules
- Rancher How Monitoring Works: https://ranchermanager.docs.rancher.com/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Fleet GitRepo Resource: https://fleet.rancher.io/0.10/reference/ref-gitrepo
- Fleet Mapping to Downstream Clusters: https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-targets
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Enforce Pod Security Standards with Namespace Labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes Specifying a Disruption Budget for your Application: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes JSONPath Support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- cert-manager API reference docs: https://cert-manager.io/v1.4-docs/reference/api-docs/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator alerting docs: https://prometheus-operator.dev/docs/developer/alerting/

## Issues Found
- The RKE2 cluster example used `AWSNodeTemplate`, which is not the current machine config kind shown in Rancher RKE2 cluster YAML. I updated both `machineConfigRef.kind` fields to `Amazonec2Config` and added `cloudCredentialSecretName` so the example aligns with Rancher's current machine-provisioned cluster format.
- The namespace example used `field.cattle.io/projectId` as a label. Rancher documents `field.cattle.io/projectId` as an annotation for creating or assigning namespaces to projects, so I split the example into a `kubectl label` command and a `kubectl annotate` command.
- The "Pod Security" section included a `PodDisruptionBudget` under a misleading `pod-security-policy.yaml` comment. I renamed the section and snippet label to reflect that it covers both pod security standards and availability controls.
- The monthly audit script could misreport results. I replaced the namespace loop with JSONPath output, changed pod counting to `-o name`, switched the certificate check to the fully qualified cert-manager resource and explicit `Ready` condition lookup, and hardened the `jq` filter so it safely detects privileged containers across standard, init, and ephemeral containers.

## Review Notes
- The `PrometheusRule` example is syntactically valid, but its alert expressions assume application metrics such as `http_requests_total` and `http_request_duration_seconds_bucket` are already being scraped.
- The post is broader than pure resource management and also covers security, GitOps, and operational auditing. That is acceptable, but the title is narrower than the content.
