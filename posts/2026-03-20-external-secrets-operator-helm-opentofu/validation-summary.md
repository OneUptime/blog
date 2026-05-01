# Validation Summary: How to Deploy External Secrets Operator on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- External Secrets Operator
- OpenTofu
- Helm
- AWS IAM / EKS IRSA
- AWS Secrets Manager
- Azure Key Vault

## Sources Consulted
- External Secrets Operator releases: https://github.com/external-secrets/external-secrets/releases
- External Secrets Operator stability and support policy: https://external-secrets.io/latest/introduction/stability-support/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- ExternalSecret reference: https://external-secrets.io/latest/api/externalsecret/
- AWS provider access guide for ESO: https://external-secrets.io/latest/provider/aws-access/
- Azure Key Vault provider guide for ESO: https://external-secrets.io/latest/provider/azure-key-vault/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes guide on updating configuration in running Pods: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- OpenTofu `yamlencode` function: https://opentofu.org/docs/language/functions/yamlencode/
- Helm provider `helm_release` resource: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Kubernetes provider `kubernetes_manifest` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Amazon EKS IAM best practices: https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html

## Issues Found
- The post pinned ESO to chart version `0.9.13`, which is from an unsupported release line. I updated it to `2.4.1`, which is the latest chart release as of 2026-05-01 and aligns with the current supported ESO line.
- The post used `external-secrets.io/v1beta1` for `ClusterSecretStore`, `ExternalSecret`, and `SecretStore`. Current ESO documentation uses `external-secrets.io/v1` for these resources, so I updated the manifests to the current API version.
- The Helm values set `replicaCount = 2` for the controller without enabling leader election. I added `leaderElect = true` so the HA configuration matches the chart's intended behavior for multiple controller replicas.
- The later AWS examples assume the service account is named `external-secrets`, but the chart snippet relied on the generated default name. I made the service account name explicit in the Helm values to keep the IRSA trust policy and `serviceAccountRef` aligned.
- The Azure Workload Identity example omitted the requirement that the referenced service account already be configured for Azure Workload Identity. I added a short inline comment to make that prerequisite explicit.
- The summary said ESO "handles rotation automatically" and that Pods "always use the latest secret values without restarts." That is too broad. ESO refreshes the synced Kubernetes Secret based on `refreshInterval`, but source-secret rotation happens in the external backend, and workloads using environment variables typically need a restart or rollout to observe updated values.

## Review Notes
- The AWS IAM trust policy example is functionally valid, but Amazon EKS best-practice documentation also scopes the OIDC `:aud` claim to `sts.amazonaws.com`. That would be a worthwhile future hardening improvement.
- The post description mentions HashiCorp Vault, but the body only includes AWS and Azure examples. That is a scope mismatch rather than a technical correctness issue.
