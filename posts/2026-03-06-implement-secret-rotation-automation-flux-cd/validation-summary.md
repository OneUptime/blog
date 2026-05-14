# Validation Summary: How to Implement Secret Rotation Automation with Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux CD v2
- Kubernetes CronJobs and Deployments
- External Secrets Operator
- AWS Secrets Manager
- HashiCorp Vault
- Stakater Reloader
- SOPS
- Flux notification-controller alerts

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization SOPS decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification Alert and Provider documentation: https://fluxcd.io/flux/components/notification/alerts/ and https://fluxcd.io/flux/components/notification/providers/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator ClusterSecretStore API: https://external-secrets.io/latest/api/clustersecretstore/
- External Secrets Operator Helm chart metadata: https://artifacthub.io/packages/helm/external-secrets-operator/external-secrets
- AWS CLI Secrets Manager rotate-secret reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/rotate-secret.html
- AWS CLI Secrets Manager examples for list-secret-version-ids and staging labels: https://docs.aws.amazon.com/cli/latest/userguide/cli_secrets-manager_code_examples.html
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/main/reference/annotations.html
- Stakater Reloader installation and Helm values documentation: https://docs.stakater.com/reloader/1.4/installation/install-oss.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- SOPS documentation: https://github.com/getsops/sops

## Issues Found
- External Secrets Operator examples used the deprecated `external-secrets.io/v1beta1` API and an old chart version. Updated the chart to `2.4.1` and all `ExternalSecret` / `ClusterSecretStore` manifests to `external-secrets.io/v1`, matching current ESO documentation.
- The AWS rotation CronJob checked `RotationEnabled`, which only indicates whether rotation is configured, not whether an in-progress rotation completed. Changed the loop to inspect secret version staging labels with `list-secret-version-ids` and wait until no standalone `AWSPENDING` version remains.
- The AWS CLI image was pinned to an old v2 release. Updated it to `amazon/aws-cli:2.34.40`, matching the current CLI documentation version consulted.
- The Reloader HelmRelease referenced a `stakater` HelmRepository that was not defined. Added the missing Flux `HelmRepository` using Stakater's official chart repository URL.
- The Reloader chart version was outdated. Updated it to chart version `2.2.11`, the current Artifact Hub version checked during review.
- The Deployment example had a selector but no pod template labels, which would make the Kubernetes Deployment invalid. Added `template.metadata.labels.app: api-server` to match the selector.
- The Flux SOPS comment said the referenced Secret could contain an AWS KMS reference. Corrected it to say cloud provider static credentials, because KMS key references live in SOPS metadata / `.sops.yaml`, while Flux's `secretRef` contains keys or credentials.
- Flux notification examples used `notification.toolkit.fluxcd.io/v1` for Alert and Provider resources. Current Flux Alert and Provider docs use `notification.toolkit.fluxcd.io/v1beta3`, so both manifests were corrected.

## Review Notes
- The post is now technically valid as a practical GitOps-oriented guide. In a future revision, the author could add RBAC manifests for the rotator/checker service accounts and clarify whether Slack alerts use a bot token or legacy incoming webhook secret, but those omissions do not make the current examples incorrect.
