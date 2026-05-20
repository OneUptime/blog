# Validation Summary: How to Configure ArgoCD for Clusters Behind VPNs

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- AWS Site-to-Site VPN
- Azure VPN Gateway
- WireGuard
- SSH tunnels
- Submariner
- CoreDNS

## Sources Consulted
- AWS CLI `create-customer-gateway` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-customer-gateway.html
- AWS CLI `create-vpn-gateway`, `create-vpn-connection`, and `create-route` command references: https://docs.aws.amazon.com/cli/latest/reference/ec2/
- Azure VPN Gateway CLI guide: https://learn.microsoft.com/en-us/azure/vpn-gateway/create-routebased-vpn-gateway-cli
- Azure CLI `az network vnet-gateway`, `local-gateway`, `vpn-connection`, `public-ip`, and `vnet subnet` references: https://learn.microsoft.com/en-us/cli/azure/network/
- Argo CD declarative cluster setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD official install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes API health endpoint documentation: https://kubernetes.io/docs/reference/using-api/health-checks
- Submariner `subctl` documentation: https://submariner.io/operations/deployment/subctl/
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- WireGuard quick start and `PersistentKeepalive` guidance: https://www.wireguard.com/quickstart/

## Issues Found
- The description mentioned OpenVPN, but the post does not cover OpenVPN. Changed it to mention SSH tunnels instead.
- The AWS customer gateway example used deprecated `--public-ip`. Updated it to `--ip-address`, which is the current AWS CLI option.
- The Azure VPN Gateway example omitted the required `GatewaySubnet` and public IP resource for the virtual network gateway. Added commands to create both and referenced the public IP with `--public-ip-addresses`.
- The Argo CD application controller was shown as a Deployment. The official Argo CD install manifest defines `argocd-application-controller` as a StatefulSet, so the WireGuard and SSH examples and `kubectl patch` command were updated accordingly.
- The SSH Secret used placeholder values under `data`, which must be base64-encoded. Changed it to `stringData` with clear-text placeholder content, which Kubernetes accepts and encodes into Secret data.
- The Argo CD cluster Secret pointed to `https://localhost:6443` through an SSH tunnel while keeping TLS verification enabled. Added `tlsClientConfig.serverName` so certificate verification can use the real API server certificate name instead of `localhost`.
- The Submariner section claimed Kubernetes API servers become reachable through the tunnel. Narrowed this to exported services and clarified that API servers require explicit routable exposure.
- The health check used Kubernetes API server `/healthz`, which has been deprecated since Kubernetes v1.16. Updated the example to use `/readyz`.

## Review Notes
The sidecar-based VPN examples are valid patterns but require careful operational hardening in production, especially around image pinning, liveness probes, NetworkPolicies, secret handling, and GitOps-friendly patch management. The cloud CLI examples remain illustrative and still require users to substitute real IDs, CIDRs, routes, and shared secrets for their environment.
