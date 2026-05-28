# Validation Summary: How to Migrate Azure Kubernetes Service Clusters to Google Kubernetes Engine

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Google Kubernetes Engine (GKE)
- Kubernetes manifests, Services, Ingress, StorageClasses, PVCs, and ServiceAccounts
- Azure CLI and Azure Container Registry
- Google Cloud CLI, Artifact Registry, IAM, and Workload Identity Federation for GKE
- Docker image tagging, pulling, and pushing
- Google Cloud Storage

## Sources Consulted
- Google Cloud SDK reference for `gcloud container clusters create`: https://cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud SDK reference for `gcloud container node-pools create`: https://cloud.google.com/sdk/gcloud/reference/container/node-pools/create
- Google Cloud SDK reference for `gcloud artifacts repositories create`: https://cloud.google.com/sdk/gcloud/reference/artifacts/repositories/create
- Google Artifact Registry Docker authentication and image naming docs: https://cloud.google.com/artifact-registry/docs/docker/authentication and https://cloud.google.com/artifact-registry/docs/docker/names
- GKE internal LoadBalancer documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/internal-load-balancing
- GKE Compute Engine persistent disk CSI driver documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- GKE managed certificate and Ingress documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs
- GKE Workload Identity Federation documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Kubernetes `kubectl get` and `kubectl cp` references: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/ and https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Microsoft Azure CLI reference for `az aks` and `az acr`: https://learn.microsoft.com/en-us/cli/azure/aks and https://learn.microsoft.com/en-us/cli/azure/acr
- Microsoft AKS Azure Disk CSI documentation: https://learn.microsoft.com/en-us/azure/aks/azure-disk-csi

## Issues Found
- The persistent data migration example called the tar-based workflow "Volume snapshot and restore," but the commands perform a file-level backup and restore, not a Kubernetes CSI `VolumeSnapshot` workflow. Changed the label to "File-level export and restore" and added the missing restore commands for the GKE pod.
- The Workload Identity section used the older shorthand "GKE Workload Identity." Updated it to the current official term, "Workload Identity Federation for GKE," and clarified that the created service account is a Google Cloud IAM service account.

## Review Notes
- The command examples use placeholder project, cluster, namespace, registry, and service account names; users must replace them with their own values.
- The GKE Ingress example is correct for Google-managed certificates, but a real deployment also needs the referenced `ManagedCertificate` resource and a reserved global static IP address.
- The `kubectl cp` workflow requires the `tar` binary in the container image, which is consistent with Kubernetes documentation.
