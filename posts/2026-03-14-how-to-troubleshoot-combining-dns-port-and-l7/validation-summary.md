# Validation Summary: Troubleshooting DNS, Port, and L7 Combined Rules in Cilium

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- CiliumEndpoint CRDs
- Hubble
- DNS, L4, and HTTP/L7 policy enforcement

## Sources Consulted
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium API reference for endpoint status and realized policy fields: https://docs.cilium.io/en/stable/api/
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/stable/security/dns.html
- Cilium policy language and HTTP L7 policy documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting.html
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium-dbg endpoint health` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_health/
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium `cilium-dbg policy wait` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_policy_wait.html
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Hubble CLI flow inspection documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html

## Issues Found
- The post used cluster-level `cilium endpoint` and `cilium identity` commands for local agent diagnostics. Current Cilium documentation uses `cilium-dbg` for in-agent endpoint, identity, and policy inspection, so affected commands were updated or replaced with Kubernetes CRD queries.
- The endpoint readiness and realized-policy examples used `cilium endpoint list` for cluster-wide data. They were changed to query `CiliumEndpoint` resources, which Cilium documents as containing the same status data while being fetchable across the cluster.
- The realized-policy jq paths used `status.policy.realized."l4-ingress"` and `"l4-egress"`, which do not match the documented endpoint status schema. They were corrected to `status.policy.realized.l4.ingress` and `status.policy.realized.l4.egress`.
- The kube-dns `toEndpoints` selector omitted Cilium's Kubernetes label source prefix. The selector keys were changed to `"k8s:io.kubernetes.pod.namespace"` and `"k8s:k8s-app"`, matching the official DNS policy examples.
- The verification command `cilium endpoint health` was incomplete because endpoint health requires an endpoint ID. It was changed to run `cilium-dbg endpoint health <ENDPOINT_ID>` inside a Cilium agent pod.
- The troubleshooting note recommended `cilium endpoint regenerate all`, which is not part of the current documented command references. It was replaced with documented policy revision inspection and `cilium-dbg policy wait <REVISION>`.

## Review Notes
Some commands assume Cilium is installed in `kube-system` and that `kubectl exec ds/cilium` selects the relevant Cilium agent pod. In clusters with custom namespaces, labels, or multi-node endpoint placement, operators may need to target the specific Cilium pod running on the node that owns the endpoint.
