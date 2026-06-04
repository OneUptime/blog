# Validation Summary: How to Use Registry Storage Backends with S3 and Azure Blob for Harbor

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Harbor
- Harbor Helm chart
- CNCF Distribution registry storage drivers
- AWS S3
- AWS IAM
- Amazon EKS IRSA
- Azure Blob Storage
- Azure CLI
- AKS Workload Identity
- Docker CLI

## Sources Consulted
- Harbor Helm chart README and values: https://github.com/goharbor/harbor-helm
- Harbor Helm chart registry templates: https://github.com/goharbor/harbor-helm/tree/main/templates/registry
- Harbor installation docs for storage backend configuration: https://goharbor.io/docs/main/install-config/configure-yml-file/
- CNCF Distribution storage configuration reference: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution S3 storage driver reference: https://distribution.github.io/distribution/storage-drivers/s3/
- CNCF Distribution Azure storage driver reference: https://distribution.github.io/distribution/storage-drivers/azure/
- AWS CLI S3 bucket versioning reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html
- AWS CLI S3 public access block reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-public-access-block.html
- Azure CLI storage account reference: https://learn.microsoft.com/en-us/cli/azure/storage/account
- Azure CLI monitor metrics reference: https://learn.microsoft.com/en-us/cli/azure/monitor/metrics
- AKS Workload Identity deployment docs: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster

## Issues Found
- The Harbor Helm values used `registry.storage`, but the official chart configures image storage under `persistence.imageChartStorage`. Updated the S3, Azure, IRSA, and performance snippets to use the chart's actual values structure.
- The Helm repository URL used `https://helm.getharbor.io`, which is not the current official chart repo URL. Updated it to `https://helm.goharbor.io`.
- The S3 IAM policy omitted permissions required by the CNCF Distribution S3 driver, including bucket location and multipart upload actions. Updated the policy to match the official driver permission scope.
- The cache description implied that Harbor's top-level `cache` setting is registry storage cache. Updated the wording to describe it as Harbor metadata caching.
- The Azure managed identity section omitted the federated identity credential and used pod annotations instead of the AKS Workload Identity service account annotation plus pod label. Added the federated credential and corrected the Kubernetes service account and pod label configuration.
- The Azure managed identity values implied account keys could simply be omitted in the standard chart. Added a caveat that this requires registry configuration support for the Azure driver `credentials` block, because the checked Harbor Helm chart exposes key-based Azure storage fields.
- The S3 performance snippet included Distribution driver settings under the wrong Helm values path and included an S3 acceleration field not rendered by the checked Harbor Helm chart. Moved supported settings under `persistence.imageChartStorage.s3` and removed the unsupported Helm value.
- The Azure monitoring command used `az storage account show-usage`, which reports storage account count and limits under a subscription, not blob capacity for a storage account. Replaced it with `az monitor metrics list` for the `BlobCapacity` metric.
- The migration script had the shebang after a comment and did not URL-encode Harbor repository names for the artifacts API. Moved the shebang to the first line and added URL encoding for repository names.

## Review Notes
The post is technically relevant and salvageable. The remaining migration example is still a simplified approach and does not cover pagination, authentication hardening, immutable tags, signatures, or replication policy migration; those would be useful future improvements but are outside the narrow technical corrections made here.
