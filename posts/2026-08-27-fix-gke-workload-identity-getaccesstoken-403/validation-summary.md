# Validation Summary: How to Fix `iam.serviceAccounts.getAccessToken` 403 in GKE Workload Identity

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- Google Kubernetes Engine (GKE) Autopilot and Standard clusters
- Workload Identity Federation for GKE
- Kubernetes Pods, ServiceAccounts, Deployments, and NetworkPolicy
- Google Cloud IAM and IAM service accounts
- IAM Service Account Credentials API and Security Token Service
- Google Cloud CLI, `kubectl`, and the GKE metadata server

## Sources Consulted

- [Authenticate to Google Cloud APIs from GKE workloads](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- [Troubleshoot GKE authentication issues](https://cloud.google.com/kubernetes-engine/docs/troubleshooting/authentication#iam-service-account-access-denied)
- [About Workload Identity Federation for GKE](https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity)
- [GKE network policy and Workload Identity Federation](https://cloud.google.com/kubernetes-engine/docs/how-to/network-policy#network-policy-and-workload-identity)
- [IAM Workload Identity User role](https://cloud.google.com/iam/docs/roles-permissions/iam#iam.workloadIdentityUser)
- [Roles for service account authentication](https://cloud.google.com/iam/docs/service-account-permissions)
- [IAM access change propagation](https://cloud.google.com/iam/docs/access-change-propagation)
- [`gcloud container clusters describe` reference](https://cloud.google.com/sdk/gcloud/reference/container/clusters/describe)
- [`gcloud container node-pools describe` reference](https://cloud.google.com/sdk/gcloud/reference/container/node-pools/describe)
- [`gcloud iam service-accounts add-iam-policy-binding` reference](https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/add-iam-policy-binding)
- [`gcloud iam service-accounts get-iam-policy` reference](https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/get-iam-policy)
- [`gcloud services enable` reference](https://cloud.google.com/sdk/gcloud/reference/services/enable)
- [`kubectl annotate` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_annotate/)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)

## Issues Found

- The opening said the permission error uniquely identified the linked-service-account configuration. `iam.serviceAccounts.getAccessToken` can also be denied during other `GenerateAccessToken` impersonation flows. Qualified the statement so it applies to the automatic GKE metadata-server flow discussed by the guide.
- The Standard-cluster diagnostic described a manually named node pool without making clear that it must be the pool hosting the affected Pod. Clarified that the actual Pod's node pool must be identified before checking its workload metadata mode.
- The `apps/v1` Deployment example omitted the required `.spec.selector` and matching `.spec.template.metadata.labels`, so Kubernetes would reject it as a Deployment. Added a matching `app: processor` selector and Pod-template label.
- The IAM explanation described the legacy `serviceAccount:PROJECT_ID.svc.id.goog[NAMESPACE/KSA]` member as one exact KSA. Clusters in the same project share a workload identity pool, and IAM treats matching namespace/KSA names in those clusters as the same identity. Corrected the scope and added the documented isolation caveat.
- The GKE troubleshooting link used the obsolete `#iam_service_account_access_denied` fragment. Updated it to the current `#iam-service-account-access-denied` fragment.

## Review Notes

- All Bash snippets are syntactically valid. The documented `gcloud`, `kubectl`, IAM member, metadata endpoint, and curl forms are current.
- The regional command examples are valid. For a zonal cluster, the post correctly directs the reader to use `--zone` instead of `--region`.
- The IAM Service Account Credentials API project placement, `GKE_METADATA` node-pool field, Workload Identity User permission, direct-principal alternative, propagation timings, and metadata-server/STS network distinctions match current official documentation.
