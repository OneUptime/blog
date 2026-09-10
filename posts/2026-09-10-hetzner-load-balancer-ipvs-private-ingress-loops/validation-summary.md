# Validation Summary: How to Fix Hetzner Load Balancer IPVS Loops with Private Ingress Settings

## Status

validated

## Post Type

Private-network and IPVS troubleshooting guide

## Technologies Covered

- Hetzner HCCM v1.36.0 private target and ingress settings
- Kubernetes Service status, kube-proxy/IPVS and kube-router
- Linux iproute2, IPVS health checks and cloud targets

## Sources Consulted

- [HCCM v1.36.0 explicit IPVS private-address loop warning](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/guides/load-balancer/private-networks.md)
- [HCCM v1.36.0 public-network, private-ingress and target annotations](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/reference/load_balancer_annotations.md)
- [HCCM v1.36.0 Service ingress construction](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/hcloud/load_balancers.go)
- [HCCM v1.36.0 cluster-wide defaults](https://github.com/hetznercloud/hcloud-cloud-controller-manager/blob/v1.36.0/docs/guides/load-balancer/configuration.md)
- [iproute2 ip-address manual source](https://github.com/iproute2/iproute2/blob/main/man/man8/ip-address.8.in)
- [iproute2 ip-route manual source](https://github.com/iproute2/iproute2/blob/main/man/man8/ip-route.8.in)
- [Kubernetes external traffic policy](https://kubernetes.io/docs/concepts/services-networking/service/#external-traffic-policy)
- [kubectl get output and resource syntax](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found

No technical issues found.

## Review Notes

- The pinned private-network guide explicitly links the dummy-interface/IPVS cycle to failing health checks and prescribes disable-private-ingress for affected installations.
- Traced status construction: private addresses are appended only when private ingress is enabled; target use-private-ip and public-network enablement are separate settings. The manifest and both cluster environment-variable names are valid.
- Read the status ipMode handling as well: the release uses Proxy mode when PROXY protocol is enabled. This reinforces the article’s requirement to inspect the actual networking implementation and observed routing instead of assuming every private-target failure is the documented loop.
- Checked command syntax, jq field selection, and conditional Local-policy endpoint reasoning. Private-only discovery is correctly identified as requiring its own plan when advertised addresses are suppressed.
- Reviewed on 2026-09-10. All 4 shell examples passed `bash -n`; all 1 YAML examples parsed with PyYAML. These are syntax checks plus documentation/source review, not execution against a live Kubernetes cluster or cloud account. Cloud resource state, permissions, API actions, traffic, DNS propagation and certificate issuance were not runtime-verified.
