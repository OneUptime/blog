# Validation Summary: How to Install Rancher on Azure Virtual Machines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher
- K3s
- Helm
- cert-manager
- Kubernetes
- Microsoft Azure Virtual Machines
- Azure CLI
- Azure DNS

## Sources Consulted
- Rancher install/upgrade on a Kubernetes cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Helm CLI quick start: https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-rancher-manager/helm-cli
- Rancher bootstrap password reference: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/bootstrap-password
- Rancher creating an Azure cluster: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/use-new-nodes-in-an-infra-provider/create-an-azure-cluster
- Rancher hosted Kubernetes providers overview: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/set-up-clusters-from-hosted-kubernetes-providers
- K3s configuration options: https://docs.k3s.io/installation/configuration
- K3s cluster access: https://docs.k3s.io/cluster-access
- Helm installation docs: https://helm.sh/docs/v3/intro/install/
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- Azure CLI `az group` reference: https://learn.microsoft.com/en-us/cli/azure/group?view=azure-cli-lts
- Azure CLI `az vm` reference: https://learn.microsoft.com/en-us/cli/azure/vm?view=azure-cli-lts
- Azure CLI `az network nsg` reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg?view=azure-cli-lts
- Azure CLI `az network nsg rule` reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule?view=azure-cli-lts
- Azure CLI `az network dns record-set a` reference: https://learn.microsoft.com/en-us/cli/azure/network/dns/record-set/a?view=azure-cli-lts

## Issues Found
- The prerequisite said a domain name was optional. Rancher's Helm install requires a hostname for `--set hostname=...`; for proof-of-concept installs, Rancher documents using a resolvable fake hostname such as `<IP>.sslip.io`. I updated the prerequisite and the hostname replacement note accordingly.
- The NSG section marked TCP port `6443` as a required inbound rule. This guide performs Kubernetes administration from inside the VM and only requires SSH plus HTTP/HTTPS ingress, so I removed the unnecessary "required" `6443` rule.
- The Azure section said Rancher's Azure node driver provisions managed Kubernetes clusters. Current Rancher documentation distinguishes hosted AKS clusters from Rancher-provisioned Azure VM-based RKE2/K3s clusters, so I updated the wording to describe the VM-based provisioning flow accurately.
- The access step implied a normal HTTPS login with the default certificate. Rancher's default `ingress.tls.source=rancher` uses Rancher-generated self-signed certificates, so I added a note that browsers may warn unless you use a trusted certificate option.

## Review Notes
- The commands are valid as of 2026-05-07, but the post intentionally installs the latest Rancher, K3s, Helm, and cert-manager artifacts available at runtime. Pinning versions would make the tutorial more reproducible over time.
