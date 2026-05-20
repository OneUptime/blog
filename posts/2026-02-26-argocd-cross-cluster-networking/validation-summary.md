# Validation Summary: How to Handle Cross-Cluster Networking for ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes NetworkPolicy
- CoreDNS
- Amazon EKS, VPC Peering, and Transit Gateway
- Google Kubernetes Engine and VPC Network Peering
- Azure Kubernetes Service and VNet Peering
- AWS CLI, Google Cloud CLI, Azure CLI, kubectl, and argocd CLI

## Sources Consulted
- Argo CD architectural overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Argo CD declarative cluster setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD argocd cluster add command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- Azure AKS CoreDNS customization documentation: https://learn.microsoft.com/en-us/azure/aks/coredns-custom
- AWS CLI create-vpc-peering-connection command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-peering-connection.html
- AWS CLI update-cluster-config command reference for EKS endpoint access: https://docs.aws.amazon.com/cli/latest/reference/eks/update-cluster-config.html
- Google Cloud SDK VPC peering command reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/peerings/create
- Google Cloud SDK GKE cluster update command reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Azure CLI VNet peering command reference: https://learn.microsoft.com/en-us/cli/azure/network/vnet/peering

## Issues Found
- The post said the Argo CD repo server needs remote Kubernetes API access. Updated this to say the application controller is the main component that needs remote API access, with the API server component needing it for interactive operations and status checks. The repo server generates manifests from source repositories and is not generally the component that talks to managed cluster APIs.
- The GKE private cluster guidance said to authorize the ArgoCD cluster pod CIDR. Updated this to authorize the source range observed by the GKE control plane, such as node subnet, VPC, VPN, or NAT egress range. Pod CIDRs are not always the source seen by the control plane.
- The CoreDNS customization example used an AKS-specific `coredns-custom` pattern without saying so. Clarified that the snippet is for an AKS-based ArgoCD cluster.
- The cluster Secret example used a raw API server IP without accounting for TLS name verification. Added `tlsClientConfig.serverName` and a note explaining why it is needed when the certificate is issued for a hostname.
- The GCP firewall example implied a firewall rule with target tags could allow access to the managed GKE API endpoint. Replaced it with the appropriate GKE master authorized networks command.
- The `argocd cluster add` command used `--server https://target-api-server:443`, but `--server` is an inherited flag for the Argo CD API server address, not the target cluster endpoint. Removed that flag from the example.
- The high-latency section claimed to adjust timeouts but showed QPS, burst, and processor settings. Replaced the snippet with documented Argo CD Kubernetes client TCP, TLS handshake, and idle timeout settings.

## Review Notes
The remaining cloud networking commands are structurally correct examples but still require environment-specific IDs, route table selection, DNS forwarding targets, and security rules. The guide intentionally stays at the pattern level, so these placeholders are acceptable.
