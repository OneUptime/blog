# Validation Summary: Auditing DNS Egress Policies in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- CiliumEndpoint CRDs
- Hubble CLI
- jq
- Bash

## Sources Consulted
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/stable/security/dns.html
- Cilium Kubernetes network policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium policy enforcement modes documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium command reference for `cilium` and `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/
- Cilium API reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api.html
- Hubble CLI and flow protocol documentation: https://docs.cilium.io/en/stable/observability/hubble/ and https://docs.cilium.io/en/stable/_api/v1/flow/README.html

## Issues Found
- The policy coverage commands used `cilium endpoint list` as a cluster-wide source and referenced outdated policy fields such as `l4-ingress` and `l4-egress`. I changed them to query `CiliumEndpoint` CRDs with `kubectl get ciliumendpoints --all-namespaces` and to use the documented `status.policy.realized.policy-enabled` and identity fields.
- The sample DNS policy matched CoreDNS endpoints without Cilium's Kubernetes label source prefixes. I updated the selector labels to `k8s:io.kubernetes.pod.namespace` and `k8s:k8s-app`, matching the official Cilium DNS policy examples.
- The audit report counted endpoints with `cilium endpoint list`, which is agent-local and not the best cluster-wide audit source. I updated the script to count `CiliumEndpoint` CRDs and use the same `policy-enabled` coverage check.
- The verification section used `cilium policy get`, which is part of the agent-local policy interface and is deprecated for direct policy management in current Cilium documentation. I changed it to inspect `CiliumNetworkPolicy` and `CiliumClusterwideNetworkPolicy` Kubernetes resources.
- The endpoint identity verification used `cilium identity list`, which is agent-local via `cilium-dbg`. I changed it to report identities from the cluster-wide `CiliumEndpoint` CRDs.
- The per-node configuration check attempted to run `cilium config view` inside Cilium agent pods. I changed the agent-local commands to `cilium-dbg config get` for the relevant Cilium agent configuration keys.

## Review Notes
The article is technically relevant and salvageable. The remaining examples assume the Cilium CRDs and Hubble are installed and accessible from the operator's Kubernetes context. The audit annotations example is a governance convention rather than a Cilium-required field.
