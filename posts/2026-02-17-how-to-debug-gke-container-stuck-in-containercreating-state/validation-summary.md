# Validation Summary: How to Debug GKE Container Stuck in ContainerCreating State

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Kubernetes Pods and kubelet startup states
- Artifact Registry and container image pulls
- Kubernetes Secrets, ConfigMaps, PersistentVolumeClaims, and ServiceAccounts
- Kubernetes CNI networking, Calico, and GKE Dataplane V2
- Google Cloud CLI and kubectl

## Sources Consulted
- GKE image pull troubleshooting: https://cloud.google.com/kubernetes-engine/docs/troubleshooting/image-pulls
- Artifact Registry image management: https://cloud.google.com/artifact-registry/docs/docker/manage-images
- Artifact Registry and GKE integration: https://cloud.google.com/artifact-registry/docs/integrate-gke
- Container Registry transition and shutdown: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- gcloud Artifact Registry image commands: https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/list and https://cloud.google.com/sdk/gcloud/reference/artifacts/docker/images/describe
- GKE Image streaming: https://cloud.google.com/kubernetes-engine/docs/how-to/image-streaming
- GKE Dataplane V2 troubleshooting: https://cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2
- GKE maximum Pods per node and Pod CIDR behavior: https://cloud.google.com/kubernetes-engine/docs/how-to/flexible-pod-cidr
- Kubernetes private registry image pull secrets: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- kubectl create secret docker-registry reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes ServiceAccount administration: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes ServiceAccounts: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes init containers: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/

## Issues Found
- Image pull failures were described as `ContainerCreating - ImagePullBackOff`. GKE and Kubernetes expose failed pulls as waiting states such as `ErrImagePull` and `ImagePullBackOff`, so the intro, diagram, event list, and diagnostic summary were updated to distinguish `ContainerCreating` from related startup waiting states.
- Registry verification examples used `gcloud container images` and `gcr.io`, which are tied to deprecated Container Registry. Replaced the examples with current Artifact Registry `gcloud artifacts docker images list --include-tags` and `gcloud artifacts docker images describe` commands using `*.pkg.dev` image names.
- Same-project registry authentication was overstated as automatic. Updated the text to say GKE can pull from Artifact Registry when the node service account has the Artifact Registry Reader role, and to mention granting IAM access as an alternative to image pull secrets.
- The large image section referred to a kubelet default image pull timeout without enough precision. Updated it to the documented behavior that large or slow image pulls can time out.
- The GKE pod IP limit explanation incorrectly tied the default pod limit to machine type. Updated it to reference maximum Pods per node and Pod secondary IP range configuration.
- The service account section said a missing ServiceAccount could keep a pod stuck at startup. Kubernetes ServiceAccount admission normally rejects such pods at creation time, so the section now distinguishes creation rejection from token projection failures.
- The node pressure section listed CPU as a node pressure condition. Updated it to memory, disk, PID pressure, or severe CPU contention.
- The init container section implied the main container itself remains in `ContainerCreating`. Updated it to say a stuck init container prevents the main container from starting.

## Review Notes
The troubleshooting sequence remains high-level and intentionally practical. For deeper GKE debugging, future revisions could add Cloud Logging queries for kubelet logs, note that SSH access is unavailable for Autopilot nodes, and include Artifact Registry IAM commands for granting `roles/artifactregistry.reader`.
