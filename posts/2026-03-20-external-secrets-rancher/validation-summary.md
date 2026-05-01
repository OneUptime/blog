# Validation Summary: How to Configure Kubernetes Secrets with External Vaults in Rancher

## Status
not-technically-relevant

## Post Type
Guide

## Technologies Covered
- Rancher
- External Secrets Operator
- Kubernetes
- HashiCorp Vault
- AWS Secrets Manager
- Helm
- Prometheus Operator / `PrometheusRule`
- kube-state-metrics
- `kubectl`, `jq`, and Bash

## Sources Consulted
- External Secrets Operator introduction: https://external-secrets.io/main/
- External Secrets Operator getting started: https://external-secrets.io/main/introduction/getting-started/
- External Secrets Operator `SecretStore` API: https://external-secrets.io/main/api/secretstore/
- External Secrets Operator `ExternalSecret` API: https://external-secrets.io/latest/api/externalsecret/
- Rancher docs, "Helm Charts and Apps": https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- Kubernetes docs, "Pod Security Standards": https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes docs, "Pod Security Admission": https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes docs, "Configure a Security Context for a Pod or Container": https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes docs, "Application Security Checklist": https://kubernetes.io/docs/concepts/security/application-security-checklist/
- Kubernetes docs, "Deployments": https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The article is not actually about configuring Kubernetes secrets with external vaults in Rancher. Official External Secrets Operator documentation centers on `SecretStore`, `ClusterSecretStore`, and `ExternalSecret` resources plus provider authentication, but the post never creates or explains any of those resources.
- The Rancher-specific portion is effectively absent. Rancher documents Helm app installation and management through its Apps / Charts workflow, but the post does not use Rancher concepts, UI paths, or a Rancher-specific deployment flow for External Secrets.
- Step 1 contains an invalid Kubernetes field reference: `.spec.containers[].securityContext.runAsRoot`. Kubernetes documents `runAsUser` and `runAsNonRoot`; there is no `runAsRoot` field in container security contexts.
- Step 2 is a made-up `ConfigMap` called `security-config` in `kube-system` with no documented connection to Rancher, External Secrets Operator, Vault, or AWS Secrets Manager. It does not configure any real external secret integration.
- Step 4 includes an invalid `apps/v1` Deployment manifest. Kubernetes requires `.spec.selector` for Deployments, and it must match labels on `.spec.template.metadata.labels`; the example omits both.
- Step 5 uses placeholder installation details (`https://charts.example.com/security` and `security-charts/security-tool`) instead of the real External Secrets Operator chart and repository documented by the project and instead of a real Rancher app installation path.
- Step 6 alert expressions depend on pod security-context metrics that are not present in the current kube-state-metrics pod metrics reference, such as `kube_pod_spec_container_security_context_privileged` and `kube_pod_spec_container_security_context_run_as_user`.
- Some snippets about Pod Security Standards and security contexts are broadly related to Kubernetes hardening, but they belong to a different topic. Making this post technically correct would require rewriting it into a real External Secrets + Rancher tutorial rather than patching isolated lines.
- Because the problems are structural and the article does not match its claimed subject, I did not patch `README.md`. The post is marked `not-technically-relevant` for removal instead.

## Review Notes
- `kubectl` is not installed in this workspace, so I could not use local `kubectl explain` output to validate field names. I validated the Kubernetes manifest and field issues against the official Kubernetes documentation instead.
- No changes were made to `README.md` because a correct version of this post would need a full replacement with real `SecretStore` / `ExternalSecret` examples for Vault or AWS Secrets Manager, plus whatever Rancher-specific installation flow the author intends to cover.
