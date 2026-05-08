# Validation Summary: Securing Manual Testing for Cilium Network Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- Kubernetes
- Hubble
- Envoy/L7 proxy
- Cilium L7 parser policy

## Sources Consulted
- Cilium Layer 7 Policies: https://docs.cilium.io/en/latest/security/policy/layer7/
- Cilium Layer 7 Protocol Visibility: https://docs.cilium.io/en/stable/observability/visibility/
- Cilium Layer 3 Policies and entities: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Envoy proxy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium command reference for cilium-dbg policy and BPF policy commands: https://docs.cilium.io/en/stable/cmdref/

## Issues Found
- The namespace isolation policy only defined egress rules while describing strict namespace isolation. I added an ingress rule allowing traffic only from endpoints in the same test namespace so inbound traffic from other namespaces is not implicitly unrestricted.
- The DNS egress rule allowed UDP/53 to `0.0.0.0/0`, which was broader than the stated isolated test setup. I changed it to allow DNS only to the `kube-dns` endpoints in `kube-system`, with a DNS L7 rule permitting queries.
- The YAML section said it deployed both test server and client, but only the server and Service were defined. I added a minimal `test-client` Deployment with the `role: client` label required by the L7 policy and later `kubectl exec deploy/test-client` commands.
- The denied L7 request expectation said an error response would always come from the proxy. Cilium documents L7 deny responses as protocol-specific and only generated when possible, so I changed the expected result to allow either a protocol-specific deny response or failed request.
- The Hubble example used `--type l7`; Cilium documentation consistently shows `-t l7` for L7 flow filtering, so I updated the command to the documented form.
- The verification and troubleshooting commands used older `cilium` agent CLI forms. I updated them to current `cilium-dbg` commands documented for Cilium agent pods.

## Review Notes
The post uses a placeholder custom protocol (`myprotocol`) and placeholder images (`myprotocol-server:test`, `myprotocol-client:test`). Those are acceptable for a guide about parser testing, but readers must replace them with real parser-aware test images and a registered Cilium proxylib parser for the L7 policy to work.
