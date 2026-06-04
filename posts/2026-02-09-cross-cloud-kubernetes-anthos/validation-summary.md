# Validation Summary: How to Set Up Cross-Cloud Kubernetes Clusters with Anthos Multi-Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Google Cloud GKE Multi-Cloud
- GKE on AWS
- GKE on Azure
- Google Cloud CLI
- AWS IAM
- Azure AD applications and service principals
- Config Sync
- Cloud Service Mesh

## Sources Consulted
- Google Cloud GKE on AWS deprecation announcement: https://docs.cloud.google.com/kubernetes-engine/multi-cloud/docs/aws/deprecations/deprecation-announcement
- Google Cloud GKE on Azure deprecation announcement: https://docs.cloud.google.com/kubernetes-engine/multi-cloud/docs/azure/deprecations/deprecation-announcement
- Google Cloud GKE on AWS create cluster guide: https://docs.cloud.google.com/kubernetes-engine/multi-cloud/docs/aws/how-to/create-cluster
- Google Cloud GKE on AWS IAM roles guide: https://docs.cloud.google.com/kubernetes-engine/multi-cloud/docs/aws/how-to/create-aws-iam-roles
- Google Cloud GKE on AWS create node pool guide: https://docs.cloud.google.com/kubernetes-engine/multi-cloud/docs/aws/how-to/create-node-pool
- Google Cloud GKE on Azure create cluster guide: https://docs.cloud.google.com/kubernetes-engine/multi-cloud/docs/azure/how-to/create-cluster
- Google Cloud GKE on Azure AD application guide: https://docs.cloud.google.com/kubernetes-engine/multi-cloud/docs/azure/how-to/create-azure-ad-application
- Google Cloud GKE on Azure role assignments guide: https://docs.cloud.google.com/kubernetes-engine/multi-cloud/docs/azure/how-to/create-azure-role-assignments
- Google Cloud GKE on Azure kubectl access guide: https://docs.cloud.google.com/kubernetes-engine/multi-cloud/docs/azure/how-to/configure-cluster-access-for-kubectl
- Google Cloud SDK reference for `gcloud container aws clusters create`: https://docs.cloud.google.com/sdk/gcloud/reference/container/aws/clusters/create
- Google Cloud SDK reference for `gcloud container azure clusters create`: https://docs.cloud.google.com/sdk/gcloud/reference/container/azure/clusters/create
- Google Cloud SDK reference for `gcloud container fleet mesh`: https://docs.cloud.google.com/sdk/gcloud/reference/container/fleet/mesh
- Google Cloud Config Sync ConfigManagement fields: https://cloud.google.com/kubernetes-engine/config-sync/docs/configmanagement-fields
- Google Cloud Service Mesh asmcli reference: https://docs.cloud.google.com/service-mesh/docs/asmcli-reference

## Issues Found
- The post used the older Anthos Multi-Cloud framing without noting the current GKE Multi-Cloud documentation name or the maintenance-mode status of GKE on AWS and GKE on Azure. Added the current naming context and the March 17, 2027 support shutdown caveat.
- The prerequisite APIs omitted `gkehub.googleapis.com`, which is needed for fleet-related operations. Added it.
- The AWS prerequisites understated the required setup. Updated the text to include the GKE Multi-Cloud API service agent role, control plane and node pool instance profiles, and AWS KMS keys.
- The AWS IAM example attached broad AWS managed policies. Replaced those with a custom GKE Multi-Cloud API policy placeholder to align with the official scoped-permission guidance.
- The AWS cluster create command omitted required current flags including `--fleet-project`, `--iam-instance-profile`, `--config-encryption-kms-key-arn`, and `--database-encryption-kms-key-arn`. Added those flags.
- The AWS node pool create command omitted `--max-pods-per-node` and `--config-encryption-kms-key-arn`, and used an instance profile ARN where the official examples use a profile name. Corrected the command.
- The Azure setup used `az ad sp create-for-rbac` and CLI flags `--client-id` and `--tenant-id`, which do not match the current GKE on Azure workload identity federation flow or current `gcloud container azure clusters create` flags. Replaced them with Azure AD application/service principal setup guidance and `--azure-application-id` / `--azure-tenant-id`.
- The Azure cluster create command omitted required current flags including `--fleet-project`, `--ssh-public-key`, `--vm-size`, and `--subnet-id`. Added those flags.
- The Azure node pool create command omitted `--max-pods-per-node` and `--ssh-public-key`. Added those flags.
- The version examples hard-coded stale Kubernetes versions. Replaced them with `get-server-config` commands and an explicit `SUPPORTED_VERSION` placeholder.
- The Config Management section used legacy Anthos Config Management naming. Updated it to Config Sync while keeping the existing `ConfigManagement` manifest pattern.
- The Config Sync apply examples assumed kubeconfig context names. Replaced them with `get-credentials` followed by `kubectl apply`, matching the documented access flow.
- The Service Mesh fleet commands used `gcloud container hub`. Updated them to `gcloud container fleet`.
- The upgrade example used the standard GKE `get-server-config` command and `validMasterVersions`, which does not apply to GKE on AWS. Replaced it with `gcloud container aws get-server-config` and `validVersions`.

## Review Notes
GKE on AWS and GKE on Azure remain technically documented, but both products are in maintenance mode and scheduled for shutdown on March 17, 2027. Future revisions should consider reframing the post as migration guidance or replacing it with GKE attached clusters, depending on the blog's content strategy.
