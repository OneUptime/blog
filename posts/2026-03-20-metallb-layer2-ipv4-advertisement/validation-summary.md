# Validation Summary: How to Configure MetalLB Layer 2 Mode for IPv4 Address Advertisement

## Status
validated

## Post Type
Guide

## Technologies Covered
- MetalLB
- Kubernetes
- `kubectl`
- IPv4
- ARP
- Layer 2 networking

## Sources Consulted
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB configuration: https://metallb.io/configuration/
- MetalLB advanced Layer 2 configuration: https://metallb.io/configuration/_advanced_l2_configuration/index.html
- MetalLB troubleshooting: https://metallb.io/troubleshooting/
- MetalLB FAQ: https://metallb.io/faq/
- MetalLB API reference: https://metallb.io/apis/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl create deployment` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes Service protocols reference: https://kubernetes.io/docs/reference/networking/service-protocols/

## Issues Found
- The post described the Layer 2 failover update as a gratuitous ARP that updates switches. I changed this to unsolicited Layer 2 packets updating the MAC association on clients, which matches MetalLB's Layer 2 behavior documentation more closely.
- The IP pool comment said the advertised addresses must be on the same subnet as the nodes. I corrected this to the same L2 network, which is the relevant requirement called out by MetalLB's Layer 2 documentation.
- The verification steps used `ping` against the LoadBalancer IP. MetalLB's troubleshooting guide explicitly notes that pinging the service IP will not work as a validation step, so I replaced that flow with `arping` for ARP verification and `curl` for actual service validation.
- The example service creation commands were underspecified for a generic copy-paste flow. I added `--port=80` to `kubectl create deployment` and `--target-port=80` to `kubectl expose` so the Service wiring is explicit and consistent with the Kubernetes CLI references.
- The monitoring section used `kubectl describe ipaddresspool` to identify the announcing node, which does not expose current Layer 2 announcer status. I replaced it with `kubectl get servicel2statuses -n metallb-system`, `kubectl describe svc test-app`, and a current `kubectl logs` invocation for the speaker DaemonSet.
- The failover limitation claimed 10-30 second failover due to ARP cache expiry and re-election. I corrected this to reflect MetalLB's documented behavior: modern clients usually converge within a few seconds, while buggy clients can take longer.

## Review Notes
The post now aligns with current MetalLB CRD-based configuration using `IPAddressPool` and `L2Advertisement` with `metallb.io/v1beta1`. The optional `interfaces` selector remains valid, but in real deployments it must match an interface name that actually exists on the announcing nodes.
