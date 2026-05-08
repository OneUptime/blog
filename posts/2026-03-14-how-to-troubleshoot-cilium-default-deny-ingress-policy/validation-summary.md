# Validation Summary: Troubleshooting Cilium Default Deny Ingress Policy Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes network policy enforcement
- Hubble CLI
- Kubernetes DNS and health probes
- kubectl
- jq

## Sources Consulted
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Kubernetes policy examples: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Layer 3 policy entities: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Hubble CLI flow inspection: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Hubble CLI observe flags reference from the Cilium Hubble project: https://github.com/cilium/hubble/issues/1280
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/

## Issues Found
- The post framed DNS failures as a default deny ingress problem. Cilium policy enforcement is directional: ingress rules put selected endpoints into ingress default deny, while egress rules put them into egress default deny. DNS lookup traffic from an application pod is egress, so I clarified that DNS failures apply when egress is also default denied.
- The prerequisites only mentioned default deny ingress, but the DNS and external service troubleshooting steps require egress policy context. I updated the prerequisite to mention default deny egress when troubleshooting DNS or external traffic.
- The health check policy used `fromEntities: health`, but Cilium's `health` entity represents Cilium health endpoints, not kubelet HTTP/TCP probes. For Hubble drops from `reserved:host`, the relevant Cilium entity is `host`, so I changed the example policy and troubleshooting text to use the host entity.
- The conclusion described a default deny ingress-only workflow while including egress DNS recovery. I updated it to refer to default deny policies and to qualify DNS recovery as an egress-deny concern.

## Review Notes
- The Hubble commands use valid flags including `--verdict`, `--last`, `-n/--namespace`, `--to-pod`, and `-o json`.
- The CiliumNetworkPolicy API version and core fields used in the snippets are current.
- The DNS allow policy is syntactically valid and follows the documented Cilium pattern for allowing pod egress to kube-dns/CoreDNS. Clusters with different DNS labels may need to adjust the `toEndpoints.matchLabels` selector.
