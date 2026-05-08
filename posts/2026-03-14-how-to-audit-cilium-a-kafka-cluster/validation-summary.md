# Validation Summary: Auditing Kafka Cluster in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- CiliumNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Kubernetes
- Kafka L7 network policy
- Hubble
- jq
- Bash

## Sources Consulted
- Cilium Layer 7 Policies documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Securing a Kafka Cluster documentation: https://docs.cilium.io/en/latest/security/kafka/
- Cilium API Reference for endpoint policy status fields: https://docs.cilium.io/en/stable/api/
- Cilium Network Policy overview: https://docs.cilium.io/en/stable/security/policy/
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint/
- Cilium Hubble exporter documentation for dropped-flow filters and `drop_reason_desc`: https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium command cheatsheet for Kubernetes CRD policy and endpoint inspection: https://docs.cilium.io/en/stable/cheatsheet/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- jq manual: https://jqlang.org/manual/

## Issues Found
- The prerequisite stated only "Cilium (v1.14+) installed", but current Cilium documentation marks Kafka network policy support as deprecated and scheduled for removal. I changed the prerequisite to require a Cilium version that supports Kafka L7 policy and added the deprecation caveat.
- The policy inventory command only listed namespaced `CiliumNetworkPolicy` resources while describing a complete inventory of Cilium network policies. I added a `CiliumClusterwideNetworkPolicy` inventory command using `kubectl get ccnp`.
- The endpoint policy coverage command counted every endpoint with a realized policy object, which does not measure coverage because the realized policy object exists even when policy enforcement is `none`. I changed it to query the `CiliumEndpoint` CRD across all namespaces and count endpoints where `.status.policy.realized."policy-enabled"` is not `none`.
- The endpoint audit filter used non-existent JSON paths `.status.policy.realized."l4-ingress"` and `.status.policy.realized."l4-egress"`. Cilium's API reference documents these under `.status.policy.realized.l4.ingress` and `.status.policy.realized.l4.egress`, and documents `policy-enabled` as the enforcement summary. I updated the audit to use `policy-enabled`.
- The endpoint label output used `.status.labels.id`, which is not a documented endpoint field. I changed it to `.status.identity.labels`.
- The audit report script counted only ingress L4 policy, used an incorrect field path, and relied on local agent endpoint output for a cluster-level report. I changed the endpoint total and coverage count to use `kubectl get cep --all-namespaces` and the documented `policy-enabled` field so ingress-only, egress-only, and both-direction policies are counted consistently.
- The per-node configuration check executed `cilium config view` inside the Cilium agent container. Current Cilium agent-side command documentation uses `cilium-dbg`, so I changed that command to `cilium-dbg config`.
- The verification command used `cilium policy get`, which depends on direct local policy API behavior that Cilium documents as deprecated in favor of Kubernetes-distributed policy resources. I replaced it with `kubectl get cnp` and `kubectl get ccnp`.
- The endpoint identity verification used `cilium identity list`, which lists identities rather than endpoint-to-identity assignments and is local-agent oriented in current docs. I changed it to read identity IDs and labels from the `CiliumEndpoint` CRD.
- The troubleshooting note suggested grepping `kubectl describe cnp -A` for "Enforcement", which is not a reliable status field. I changed it to inspect `.status.conditions` from the CiliumNetworkPolicy resources.

## Review Notes
Cilium's Kafka L7 policy support is still documented but deprecated in current releases. Teams relying on Kafka-aware Cilium policy should pin their Cilium version, test upgrades carefully, and track Cilium release notes for the removal timeline.
