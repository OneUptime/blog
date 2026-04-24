# Validation Summary: How to Import a Kubernetes Cluster Using Kubeconfig in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Business Edition
- Kubernetes
- kubeconfig
- kubectl
- Amazon EKS
- Azure AKS
- Google Kubernetes Engine (GKE)

## Sources Consulted
- Portainer: Import an existing Kubernetes environment - https://docs.portainer.io/admin/environments/add/kubernetes/import
- Portainer: Add a new environment - https://docs.portainer.io/admin/environments/add
- Kubernetes: kubeconfig (v1) - https://kubernetes.io/docs/reference/config-api/kubeconfig.v1
- Kubernetes: kubectl config view - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_view/
- Kubernetes: kubectl create token - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Amazon EKS: Connect kubectl to an EKS cluster by creating a kubeconfig file - https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
- AWS CLI: eks get-token - https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- Azure CLI: az aks get-credentials - https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest#az-aks-get-credentials
- Google Kubernetes Engine: Install kubectl and configure cluster access - https://docs.cloud.google.com/kubernetes-engine/docs/how-to/cluster-access-for-kubectl

## Issues Found
- The post said or implied kubeconfig import worked in Portainer CE and did not require anything to be installed on the cluster. I corrected this to match Portainer's current docs: kubeconfig import is a legacy Portainer Business Edition feature, and Portainer deploys the Portainer Agent during import.
- The prerequisites were incomplete. I added the documented requirements for a self-contained kubeconfig, `current-context`, cluster-admin-level credentials, a load balancer on the cluster, and API reachability from Portainer.
- The service-account example requested a 10-year token with `kubectl create token --duration=87600h`. I replaced that with a normal token request because `kubectl create token` issues bounded tokens and the API server determines the final lifetime.
- The RBAC example used a custom wildcard role while the Portainer requirement is cluster-admin-level access. I replaced it with a binding to the built-in `cluster-admin` role.
- The post exported a specific context but subsequent commands could still hit the wrong cluster. I added `export KUBECONFIG=portainer-kubeconfig.yaml` and fixed the cluster metadata lookup so the later commands stay aligned with the exported kubeconfig.
- The Portainer UI section included an undocumented paste-as-text path and a namespace setting that are not present in the current documented import flow. I updated that section to the documented wizard steps and supported settings.
- The EKS section treated `aws eks get-token` as a static-token workaround and used an outdated exec API version. I updated the exec snippet to `client.authentication.k8s.io/v1beta1` and changed the guidance to use a Kubernetes service-account kubeconfig for Portainer import.
- The AKS and GKE sections needed current CLI guidance. I updated AKS to `az aks get-credentials --admin --file` and GKE to `gcloud container clusters get-credentials --location`, and clarified the exec-plugin limitation for Portainer import.
- The final section suggested editing an imported environment to refresh kubeconfig credentials. I rewrote that part to say credentials should be regenerated and the import retried if they expire before the import completes.

## Review Notes
- Portainer currently documents kubeconfig import as a legacy option and recommends the Edge Agent for most new setups.
- Cloud-provider-generated kubeconfigs often depend on external exec plugins such as `aws`, `kubelogin`, or `gke-gcloud-auth-plugin`, so provider-specific examples should be rechecked against current CLI output before future republishes.
