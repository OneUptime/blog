# Validation Summary: How to Configure Flux with Cilium Network Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux
- Cilium
- CiliumNetworkPolicy
- Kubernetes NetworkPolicy
- DNS-based egress policy
- Layer 7 HTTP policy
- Hubble
- kubectl

## Sources Consulted
- Cilium Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Cilium policy enforcement modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Layer 3 policy examples: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium DNS/FQDN policy documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation and command help: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux notification Receiver API documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux official install manifests: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml

## Issues Found
- The default-deny CiliumNetworkPolicy example was inverted. The post said `ingress: - {}` and `egress: - {}` would allow all traffic and recommended `ingress: []` and `egress: []`; Cilium documents empty rule items as the default-deny pattern, while empty or omitted directions do not apply that direction. Updated the section to use `ingress: - {}` and `egress: - {}` as the applied policy and explain why empty lists are not correct for this purpose.
- The post described direct use of Cilium identities in policy rules. Cilium policies select endpoints by labels, entities, services, CIDRs, and FQDNs, while Cilium derives identities for enforcement. Updated the wording to avoid implying users normally reference numeric Cilium identities in these policies.
- The introduction mentioned CiliumClusterwideNetworkPolicy resources even though the guide only uses namespaced CiliumNetworkPolicy resources. Updated the wording to match the actual examples.
- DNS and ingress-nginx namespace selectors used namespace-label based Cilium labels. Replaced them with the documented `k8s:io.kubernetes.pod.namespace` selector used in Cilium examples.
- The Flux controller policies enabled egress to source-controller and notification-controller but did not include the matching ingress rules required after applying default-deny ingress. Added source-controller ingress on port 9090 and notification-controller event ingress on port 9090.
- The controller-to-notification event port was shown as 9292. Flux uses 9292 for webhook receivers and 9090 for the notification event server; updated internal event traffic to port 9090.
- The source-controller policy did not allow source-controller to send events to notification-controller. Added egress to notification-controller on port 9090.
- The Hubble section claimed that `hubble observe ... -o json` exports Prometheus metrics. Updated the wording to say it prints JSON for ad hoc analysis.
- The Hubble setup comment said `cilium hubble enable` installs the Hubble CLI. Updated it to say the command enables Hubble.
- The kube-apiserver troubleshooting command used a non-documented `cilium status | grep KubeApiServer` check. Replaced it with a Hubble dropped-flow inspection using the reserved kube-apiserver label.

## Review Notes
The examples are still environment-specific. Real Flux installations may include image-reflector-controller, image-automation-controller, source-watcher, additional Git/OCI/Helm registries, or different ingress controller labels, and those environments will need matching allow rules.
