# Validation Summary: Argo Workflows Artifact Upload Failed: Debugging S3, MinIO, GCS, and Azure Storage

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Argo Workflows 4.0 and the Argo Workflows 4.1 init-less Pod layout
- Kubernetes Workflows, Pods, ConfigMaps, Secrets, service accounts, NetworkPolicies, and `emptyDir` volumes
- Amazon S3, AWS IAM Roles for Service Accounts (IRSA), and AWS KMS
- MinIO and S3-compatible object storage
- Google Cloud Storage and GKE Workload Identity
- Azure Blob Storage, Azure workload or managed identity, storage account keys, Shared Access Signatures, and Azure RBAC
- Argo CLI, `kubectl`, YAML, and shell commands

## Sources Consulted

- [Argo Workflows v4.0.8 release](https://github.com/argoproj/argo-workflows/releases/tag/v4.0.8)
- [Argo Workflows: Configuring Your Artifact Repository (v4.0)](https://argo-workflows.readthedocs.io/en/release-4.0/configure-artifact-repository/)
- [Argo Workflows: Artifact Repository Ref](https://argo-workflows.readthedocs.io/en/latest/artifact-repository-ref/)
- [Argo Workflows: Artifacts (v4.0)](https://argo-workflows.readthedocs.io/en/release-4.0/walk-through/artifacts/)
- [Argo Workflows: Empty Dir for Outputs](https://argo-workflows.readthedocs.io/en/latest/empty-dir/)
- [Argo Workflows: Init-less Pod Layout](https://argo-workflows.readthedocs.io/en/latest/initless-pod/)
- [Argo Workflows: Field Reference (v4.0)](https://argo-workflows.readthedocs.io/en/release-4.0/fields/)
- [Argo CLI: `argo submit`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_submit/) and [`argo get`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_get/)
- [Argo Workflows: Using `kubectl`](https://argo-workflows.readthedocs.io/en/latest/kubectl/)
- [Kubernetes: `kubectl run`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/) and [Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Amazon EKS: IAM roles for service accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [Amazon S3: Required permissions for API operations](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-policy-actions.html) and [SSE-KMS permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html)
- [Google Kubernetes Engine: Workload Identity Federation for GKE](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity) and [Cloud Storage IAM roles](https://docs.cloud.google.com/storage/docs/access-control/iam-roles)
- [Azure Kubernetes Service: Workload identity](https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview)
- [Azure Blob Storage: Assign an Azure role for data access](https://learn.microsoft.com/en-us/azure/storage/blobs/assign-azure-role-data-access) and [Create an account SAS](https://learn.microsoft.com/en-us/rest/api/storageservices/create-account-sas)
- [MinIO: Healthcheck Probe](https://min.io/docs/minio/kubernetes/openshift/operations/monitoring/healthcheck-probe.html)
- [Official curl container image](https://github.com/curl/curl-container) and [Docker Official Image for Alpine](https://hub.docker.com/_/alpine)

## Issues Found

- The init-less Pod layout was described only as something used by newer installations. Clarified that Argo Workflows v4.1 introduces it as an opt-in beta feature and that the traditional layout remains the default. This prevents readers on the current stable v4.0 line from expecting a `supervisor` container.
- The MinIO diagnostic `kubectl run` command did not use `--command`. With the curl container's entrypoint, the literal `curl` token would therefore be passed as the first curl argument rather than used as the command. Added `--command` so the generated Pod runs the displayed command correctly.
- The MinIO diagnostic text implied that any Pod in the same namespace is governed by the same NetworkPolicy. Kubernetes NetworkPolicies select Pods by labels, so the text now tells readers to apply labels that cause the same egress policies to select the diagnostic Pod.
- The smoke-test instructions said the shown commands would retain the Pod, but neither command configures Pod garbage collection or retention. Changed the wording to state accurately that the commands submit and watch the Workflow.

## Review Notes

- The review covered Argo Workflows v4.0.8, the current stable release on the review date, and the documented v4.1 init-less beta behavior. The S3, GCS, and Azure artifact repository fields used by the post are current and non-deprecated in the reviewed documentation.
- The complete repository, service-account, and Workflow YAML examples were parsed successfully. The minimal artifact Workflow also passed strict offline linting with the official Argo Workflows v4.0.8 CLI.
- Commands and configuration were compared with official documentation. No live Kubernetes cluster or cloud-storage credentials were available, so the examples were not exercised against running storage services.
- Argo requires an unarchived S3 directory key to end in `/` when Artifact Garbage Collection is enabled. The post's `archive.none` examples upload files rather than directories, so they are not affected by that caveat.
