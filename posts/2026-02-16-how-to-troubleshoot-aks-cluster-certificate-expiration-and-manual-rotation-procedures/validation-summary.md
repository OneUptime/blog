# Validation Summary: How to Troubleshoot AKS Cluster Certificate Expiration

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes certificates and kubeconfig
- Azure CLI
- kubectl
- OpenSSL
- Azure Monitor

## Sources Consulted
- Microsoft Learn: Certificate rotation in Azure Kubernetes Service (AKS), https://learn.microsoft.com/en-us/azure/aks/certificate-rotation
- Microsoft Learn: Azure CLI `az aks` command reference, https://learn.microsoft.com/en-us/cli/azure/aks?view=azure-cli-latest
- Microsoft Learn: Azure Kubernetes Service monitoring data reference, https://learn.microsoft.com/en-us/azure/aks/monitor-aks-reference
- Microsoft Learn: Monitor Azure Kubernetes Service (AKS), https://learn.microsoft.com/en-us/azure/aks/monitor-aks

## Issues Found
- The post claimed AKS generally auto-rotates all certificates during upgrades and that certificates are typically valid for around two years. Updated this to match Microsoft guidance: non-CA certificate autorotation applies to clusters created or upgraded after March 2022, pre-May 2019 clusters had two-year certificates, and post-May 2019 Cluster CA certificates expire after 30 years.
- The `az aks show --query certificateProfile.expirationDate` example used a field not documented in the AKS CLI or AKS certificate rotation guidance. Replaced it with the documented kubeconfig Cluster CA certificate inspection pattern.
- The node certificate paths used `/etc/kubernetes/pki/...`, which does not match Microsoft AKS troubleshooting guidance. Updated the kubelet client certificate path to `/var/lib/kubelet/pki/kubelet-client-current.pem` and the API server certificate path to `/etc/kubernetes/certs/apiserver.crt`.
- The post said `az aks rotate-certs` performs a rolling restart and updates kubeconfig. Microsoft documents that it rotates certificates, CAs, and service accounts, recreates agent nodes, VM scale sets, and disks, and requires `az aks get-credentials --overwrite-existing` afterward. Updated the description and warning accordingly.
- The Azure Monitor alert example referenced `CertificateExpirationWithin30Days`, which is not listed in the official AKS metrics reference. Replaced it with a scheduled certificate-expiration check based on the documented kubeconfig certificate inspection approach.
- The prevention section recommended quarterly certificate rotations as a blanket practice. Adjusted it to recommend scheduled checks and policy- or expiration-driven rotation because manual rotation is disruptive.
- The verification command omitted SNI while the earlier certificate check included it. Added `-servername kubernetes.default.svc` for consistency.

## Review Notes
The local environment did not have the Azure CLI installed, so CLI syntax was verified against the official Microsoft Learn Azure CLI reference instead of local `az --help` output.
