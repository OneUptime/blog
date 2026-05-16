# Validation Summary: How to Install Talos Linux on Azure

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.7.0)
- Microsoft Azure (Resource Groups, VNet, Subnets, NSGs, Load Balancer, Public IP, Storage Account, Blob Storage, Managed Images, Virtual Machines, NICs)
- Azure CLI (`az`)
- Kubernetes (`kubectl`)
- talosctl
- Helm
- Azure Disk CSI driver (`disk.csi.azure.com`)
- Cilium CNI
- Kubernetes StorageClass API (`storage.k8s.io/v1`)

## Sources Consulted
- Talos Linux v1.7.0 release assets on GitHub: https://github.com/siderolabs/talos/releases/tag/v1.7.0 (verified `azure-amd64.vhd.xz` exists)
- Talos install script: https://talos.dev/install (HTTP 200)
- Azure CLI install script: https://aka.ms/InstallAzureCLIDeb (HTTP 200)
- Azure CLI reference docs (`az network nsg rule create`, `az network lb create`, `az network nic create`, `az vm create`, `az storage blob url`, `az image create`)
- talosctl command reference (`gen config`, `config merge/endpoint/node`, `bootstrap`, `health --wait-timeout`, `kubeconfig`)
- Azure Disk CSI driver Helm chart repo: https://raw.githubusercontent.com/kubernetes-sigs/azuredisk-csi-driver/master/charts (HTTP 200)
- Cilium CLI documentation (`cilium install --helm-set`)
- Kubernetes StorageClass API documentation

## Issues Found
No technical issues found.

## Review Notes
- Talos v1.7.0 is a real release and the `azure-amd64.vhd.xz` asset filename is correct. As newer Talos versions are published, users may want to use the Image Factory (`factory.talos.dev`) for system-extension support, but the direct GitHub release artifact path used here remains valid.
- The `--admin-username talos --generate-ssh-keys` arguments on `az vm create` are not used by Talos (which has no SSH) but are required by the Azure CLI to create a Linux VM; including them is correct.
- `cilium install --helm-set ipam.mode=kubernetes` is appropriate for a self-managed Kubernetes cluster on Azure (which is what Talos provides). The `azure` IPAM mode is specific to AKS and would not apply here.
- The etcd NSG rule restricts source to `10.0.1.0/24` (the controlplane subnet), which is the correct scoping for peer-to-peer etcd traffic.
- The load balancer uses a TCP health probe on port 6443, which is the conventional approach; an HTTPS probe against `/readyz` would be more precise but requires additional certificate handling and is reasonably omitted in an introductory guide.
