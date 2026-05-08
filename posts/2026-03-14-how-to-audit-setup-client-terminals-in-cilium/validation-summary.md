# Validation Summary: Auditing Client Terminal Setup in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- CiliumEndpoint CRDs
- Hubble CLI
- kubectl
- jq
- Bash

## Sources Consulted
- Cilium command reference for `cilium` and `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium command reference for `cilium-dbg endpoint list`, `policy get`, and `identity list`: https://docs.cilium.io/en/stable/cmdref/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium API reference for endpoint policy JSON fields: https://docs.cilium.io/en/stable/api.html
- Cilium policy enforcement modes documentation: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium DNS and Layer 4 policy documentation: https://docs.cilium.io/en/latest/security/dns/
- Cilium Hubble CLI and dropped verdict examples: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup.html
- jq manual: https://jqlang.github.io/jq/manual/

## Issues Found
- The post used `cilium endpoint list` and JSON paths such as `.status.policy.realized."l4-ingress"`. Current Cilium documentation exposes endpoint inspection through `cilium-dbg endpoint list` or the `CiliumEndpoint` CRD, and the realized policy fields use nested paths such as `.status.policy.realized.l4.ingress` plus `policy-enabled`. I changed the audit examples to use `kubectl get ciliumendpoints --all-namespaces -o json` and `policy-enabled`.
- The policy inventory claimed to inventory all Cilium network policies but only listed namespace-scoped `CiliumNetworkPolicy` resources. I added a `CiliumClusterwideNetworkPolicy` (`ccnp`) inventory command.
- The per-node configuration check executed `cilium config view` inside Cilium agent pods and grepped for `policy-enforcement` and `enable-l7`. Inside agent pods, current docs expose the local agent CLI as `cilium-dbg`, and the relevant configuration keys are `enable-policy` and `enable-l7-proxy`. I updated the command accordingly.
- The example kube-dns selector used unprefixed Kubernetes labels. Cilium's official policy examples use source-prefixed labels such as `k8s:io.kubernetes.pod.namespace` and `k8s:k8s-app` for Kubernetes labels. I updated the selector.
- The report-generation script used `cilium endpoint list`, which is not part of the current Kubernetes-facing Cilium CLI. I changed it to gather endpoint data from the `CiliumEndpoint` CRD.
- The verification section attempted to print policy names from `cilium policy get -o json` using `.[].metadata.name`, but agent-local policy output is not Kubernetes resource metadata. I changed this to summarize policy names with `kubectl get cnp` and `kubectl get ccnp`.
- The identity verification command used `cilium identity list`. Current command references expose this as `cilium-dbg identity list` for local agent inspection, so I updated the example to run it through `kubectl exec` in a Cilium agent pod.

## Review Notes
The Hubble dropped-flow command and the CiliumNetworkPolicy `toPorts` syntax are consistent with current Cilium documentation. The guide remains a practical audit checklist, but large clusters may need batching or label selectors because querying all `CiliumEndpoint` objects can produce large JSON responses.
