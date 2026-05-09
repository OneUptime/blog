# Validation Summary: Troubleshoot Calico Installation on AKS

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Azure CNI and kubenet networking
- Calico network policy
- Kubernetes NetworkPolicy
- Azure CLI
- kubectl

## Sources Consulted
- Microsoft Learn: Secure pod traffic with network policies in AKS - https://learn.microsoft.com/en-us/azure/aks/use-network-policies
- Microsoft Learn: Azure CLI `az aks` command reference - https://learn.microsoft.com/en-us/cli/azure/aks
- Tigera Calico documentation: Installing on AKS - https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/aks
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Project Calico GitHub raw manifest URL for `v3.27.0/manifests/calico-policy-only.yaml` - https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico-policy-only.yaml

## Issues Found
- The post instructed readers to install Calico on AKS with the generic `calico-policy-only.yaml` manifest. Microsoft documents AKS-managed Calico installation through `az aks create` or `az aks update --network-policy calico`, and Tigera documents self-managed Calico on AKS through the Tigera operator with AKS-specific configuration. I changed the install and repair commands to use `az aks update --network-policy calico`.
- The post listed `calicoctl` as a prerequisite, but none of the guide's commands use it. I removed it from the prerequisites.
- The network policy validation test tried to connect to `server.policy-test.svc.cluster.local` without creating a Service named `server`. I added `kubectl expose pod server --port=80 -n policy-test`.
- The validation test could run before pods were ready. I added a `kubectl wait` command for the client and server pods.
- The BusyBox `wget` timeout flag was written as `--timeout=5`, which is less portable for BusyBox. I changed it to `-T 5`.
- The best-practices wording said to use AKS-specific Calico manifests. I changed it to recommend either AKS's network policy option or Tigera's AKS-specific self-managed Calico guide, which matches the current official guidance.
- Fixed the typo "upgrading-Calico" to "upgrading because Calico".

## Review Notes
AKS-managed Calico supports the standard Kubernetes NetworkPolicy API. Microsoft notes that AKS does not test or support broader Calico features in the managed integration; those require self-managed Calico and support from the Calico community or a commercial support plan.
