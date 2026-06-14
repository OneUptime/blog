# Validation Summary: How to Configure VPN for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes Services, DaemonSets, Deployments, Pods, ConfigMaps, Secrets, and NetworkPolicies
- WireGuard and wg-quick configuration
- Tailscale Kubernetes Operator
- Tailscale Connector subnet routers
- OpenVPN using the kylemanna/openvpn container image
- kubectl
- Prometheus WireGuard exporter

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Tailscale Kubernetes Operator overview: https://tailscale.com/docs/kubernetes-operator
- Tailscale Kubernetes Operator installation documentation: https://tailscale.com/docs/kubernetes-operator/install-operator
- Tailscale Kubernetes Operator ingress documentation: https://tailscale.com/docs/kubernetes-operator/ingress
- Tailscale Connector subnet-router documentation: https://tailscale.com/docs/kubernetes-operator/connector/deploy-subnet-router
- Tailscale Kubernetes examples: https://github.com/tailscale/tailscale/blob/main/docs/k8s/README.md
- WireGuard wg-quick manual: https://man7.org/linux/man-pages/man8/wg-quick.8.html
- WireGuard quick start: https://www.wireguard.com/quickstart/
- LinuxServer.io WireGuard image documentation: https://docs.linuxserver.io/images/docker-wireguard/
- kylemanna/docker-openvpn documentation: https://github.com/kylemanna/docker-openvpn/blob/master/README.md

## Issues Found
- The Tailscale Operator example showed a bare Deployment using a Tailscale auth key. Current Tailscale Operator installation requires the operator chart or static manifests, including CRDs, RBAC, and OAuth client credentials. Replaced the incomplete Deployment with the official Helm installation flow.
- The Tailscale subnet-router example used a standalone Tailscale Deployment in a section that had just installed the Kubernetes Operator. Updated it to the current operator-managed Connector resource with `subnetRouter.advertiseRoutes`.
- The OpenVPN section was titled "OpenVPN Access Server", but the example uses the community `kylemanna/openvpn` container, not OpenVPN Access Server. Renamed the section to "OpenVPN Server".
- The OpenVPN Deployment included `OVPN_*` environment variables that are not how the `kylemanna/openvpn` image is configured. Removed them and kept configuration generation in the `ovpn_genconfig` initialization command.
- The multi-cluster WireGuard route only added a route on interface startup and did not include the interface in the route command or remove the route on shutdown. Added `dev %i` and a matching `PostDown` route deletion.
- The VPN sidecar example used an init container to wait for `wg0`, but init containers complete before regular containers start, so it could never observe an interface created by the WireGuard sidecar. Moved the route setup into the WireGuard sidecar's `postStart` lifecycle hook.
- The monitoring script targeted `deploy/wireguard`, but the post deploys WireGuard as a DaemonSet. Updated the script to select a WireGuard pod by label and run `kubectl exec` against that pod.

## Review Notes
The examples still use placeholder CIDRs, endpoint names, keys, images tagged `latest`, and broad privileges such as `privileged: true`; those can be acceptable in a general tutorial but should be pinned and hardened for production. NetworkPolicy behavior with Service CIDRs, Pod CIDRs, NAT, and `ipBlock` matching can vary by CNI and cloud provider, so production policies should be tested on the target cluster implementation.
