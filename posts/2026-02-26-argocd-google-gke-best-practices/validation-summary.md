# Validation Summary: How to Use ArgoCD with Google GKE Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Helm chart
- Google Kubernetes Engine (GKE) Autopilot and Standard
- Workload Identity Federation for GKE
- GKE private clusters
- GKE Ingress, Gateway API, and Google-managed certificates
- Google Workspace OIDC and Dex
- Google Cloud Managed Service for Prometheus
- Google Cloud Storage backups

## Sources Consulted
- GKE Autopilot resource requests: https://cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests
- Workload Identity Federation for GKE: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- GKE private clusters: https://cloud.google.com/kubernetes-engine/docs/how-to/private-clusters
- GKE internal Ingress: https://cloud.google.com/kubernetes-engine/docs/how-to/internal-load-balance-ingress
- GKE Google-managed certificates: https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs
- GKE Gateway API deployment: https://cloud.google.com/kubernetes-engine/docs/how-to/deploying-gateways
- Argo CD declarative cluster setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Google user management: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/google/
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Argo CD latest release metadata: https://github.com/argoproj/argo-cd/releases/tag/v3.4.2
- Google Cloud CLI Docker images: https://cloud.google.com/sdk/docs/downloads-docker

## Issues Found
- The Autopilot section said resource requests are required and DaemonSets are unsupported. Updated it to reflect current GKE behavior: Autopilot applies defaults when requests are missing and supports DaemonSets with Autopilot-specific constraints.
- The Argo CD Helm values pinned Argo CD `v2.10.0`, which is outdated for this 2026 post. Updated the example to `v3.4.2`, the current latest release found during review.
- The Helm and Ingress examples used GKE ManagedCertificate annotations with an internal GKE Ingress. Updated the internal Ingress examples to use a regional pre-shared certificate instead, because GKE ManagedCertificate is supported for external Ingress, not internal Ingress.
- The private cluster section implied all private clusters hide the control plane publicly and used a public endpoint in a private endpoint access example. Updated the wording and command to focus on private endpoint access and required VPC-level connectivity.
- The remote cluster Secret used `gke-gcloud-auth-plugin` with unsupported cluster-selection arguments. Updated it to the Argo CD documented `argocd-k8s-auth gcp` exec provider pattern and added TLS CA configuration.
- The Google Workspace RBAC section implied standard Google OIDC returns Google Groups. Updated it to map user emails for standard OIDC and note that Dex with Google Directory API access is required for Google Groups RBAC.
- The backup CronJob used `bitnami/kubectl:latest` while calling `gsutil`. Updated the image to a custom backup-tools image that includes both `kubectl` and `gsutil`.

## Review Notes
The examples are still intentionally illustrative and use placeholder project IDs, domains, service accounts, certificates, and bucket names. For production, the backup image should be pinned to a real immutable image digest, and the GKE Ingress/Gateway choice should be validated against the specific cluster version and load balancer feature set.
