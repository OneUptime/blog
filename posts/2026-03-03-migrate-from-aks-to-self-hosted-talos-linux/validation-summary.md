# Validation Summary: How to Migrate from AKS to Self-Hosted Talos Linux

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Talos Linux (talosctl, machine config)
- Azure Disk / Azure File CSI drivers
- Azure Workload Identity
- Azure Application Gateway Ingress Controller (AGIC)
- Azure Key Vault + Secrets Store CSI Driver
- Velero (with Azure plugin)
- Cilium (CNI, kube-proxy replacement)
- Longhorn (storage)
- MetalLB (LoadBalancer)
- ingress-nginx
- kube-prometheus-stack (Prometheus + Grafana)
- HashiCorp Vault / Sealed Secrets
- kubectl, jq, az CLI, helm

## Sources Consulted
- Talos Linux CLI reference: https://www.talos.dev/v1.12/reference/cli/
- Velero plugin for Microsoft Azure: https://github.com/vmware-tanzu/velero-plugin-for-microsoft-azure
- Velero file-system backup docs: https://velero.io/docs/main/file-system-backup/
- Cilium kube-proxy replacement docs: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- AKS Free/Standard/Premium pricing tiers: https://learn.microsoft.com/en-us/azure/aks/free-standard-pricing-tiers
- Application Gateway Ingress Controller annotations: https://azure.github.io/application-gateway-kubernetes-ingress/annotations/
- Secrets Store CSI Driver: https://secrets-store-csi-driver.sigs.k8s.io/
- Longhorn helm chart: https://charts.longhorn.io/
- MetalLB IPAddressPool/L2Advertisement CRDs: https://metallb.universe.tf/configuration/

## Issues Found
1. **Velero install command missing `--plugins` flag.** The original `velero install --provider azure ...` command would install the Velero deployment but not load the Azure plugin, so Azure backups would fail at runtime. Added `--plugins velero/velero-plugin-for-microsoft-azure:v1.14.0` (current stable plugin version) to the install command.
2. **AKS control plane pricing claim was outdated/oversimplified.** The post claimed "AKS does not charge for the control plane (unlike EKS and GKE)". This is only true for the AKS Free tier; the Standard tier (which provides an uptime SLA and is recommended for production) is approximately $0.10/cluster/hour and Premium is approximately $0.60/cluster/hour. Reworded to clarify the tier distinction.

## Review Notes
- The `talosctl gen config ... --output-dir _out` flag is accepted, but in current Talos versions the canonical form is `--output`. Either still works.
- `kubeProxyReplacement=true` (boolean) is correct for current Cilium versions; the legacy `strict`/`partial`/`disabled` string values are deprecated.
- `--default-volumes-to-fs-backup` is current Velero CLI (replaced the deprecated `--default-volumes-to-restic`).
- The AGIC `ingressClassName: azure-application-gateway` plus annotation form is reasonable, though the annotation `kubernetes.io/ingress.class: azure/application-gateway` remains the most broadly documented option in the AGIC project.
- The Azure backup-location-config could optionally include `useAAD="true"` for workload-identity-based auth, but the example using a secret file is a valid alternative.
- The MetalLB install may require labeling the `metallb-system` namespace with `pod-security.kubernetes.io/enforce: privileged` on restricted clusters, but this isn't required for default Talos.
- Setting `bind-address: 0.0.0.0` on controllerManager/scheduler is intentional in Talos for metrics scraping (Talos otherwise binds these to 127.0.0.1) — this is correct as written.
