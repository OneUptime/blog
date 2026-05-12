# Validation Summary: Secure Calico Networking on IBM Cloud

## Status
validated

## Post Type
Tutorial / Hardening guide

## Technologies Covered
- Calico (GlobalNetworkPolicy / NetworkPolicy v3 API)
- IBM Cloud Kubernetes Service (IKS)
- IBM Cloud VPC security groups
- IBM Cloud CLI (`ibmcloud`, `ibmcloud is`, `ibmcloud ks`)
- `calicoctl`
- IBM Cloud Security and Compliance Center Workload Protection (Sysdig Secure / Falco)

## Sources Consulted
- [Calico GlobalNetworkPolicy reference](https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy)
- [Calico NetworkPolicy reference](https://docs.tigera.io/calico/latest/reference/resources/networkpolicy)
- [Calico — Use namespace rules in policy](https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy)
- [IBM Cloud Kubernetes Service CLI reference](https://cloud.ibm.com/docs/containers-cli-plugin?topic=containers-cli-plugin-kubernetes-service-cli)
- [IBM Cloud Docs — Changing service endpoints](https://cloud.ibm.com/docs/containers?topic=containers-cs_network_cluster)
- [IBM — security-advisor-network-insights (DEPRECATED)](https://github.com/ibm-cloud-security/security-advisor-network-insights)
- [IBM — Security and Compliance Center Workload Protection announcement](https://www.ibm.com/new/announcements/now-available-ibm-cloud-security-and-compliance-center-workload-protection)
- [IBM Cloud Catalog — Workload Protection service](https://cloud.ibm.com/catalog/services/security-and-compliance-center-workload-protection)

## Issues Found

1. **Invalid Calico selector syntax in Layer 4** — the namespace-isolation `GlobalNetworkPolicy` used `namespaceSelector: same as destination`, which is not a real Calico expression; the selector grammar accepts only label-selector operators (`==`, `!=`, `has()`, `in`, `not in`, `contains`) and the special `global()` scope modifier. There is no built-in "same namespace as the workload" template. Rewrote the example as a per-namespace `NetworkPolicy` that selects the namespace explicitly via `projectcalico.org/name == "my-app"`, which is the documented Calico pattern for intra-namespace isolation.

2. **Wrong protocol field in the egress rule** — the original used `destination.protocols: [UDP]`. In the Calico v3 rule schema, the field is `protocol` (singular), at the rule level (a sibling of `action`/`destination`), and takes a single value. Corrected to `protocol: UDP` at the rule level.

3. **Invalid `source` block on an egress rule** — the original had an egress rule with `source: namespaceSelector: ...`. While Calico does technically permit a `source` clause on egress rules, the intent here was clearly "allow egress to the same namespace," which belongs in `destination`. Reworked to `destination.namespaceSelector` for the intra-namespace egress allow.

4. **Deprecated service in Layer 5** — `ibmcloud security-advisor network-insights enable` references IBM Cloud Security Advisor Network Insights, which IBM deprecated on 2021-02-12 (the GitHub repo is archived/marked DEPRECATED). The current IBM service covering this capability is Security and Compliance Center Workload Protection (built on Sysdig Secure / Falco), GA on IBM Cloud. Replaced the section with the current service name and a provisioning command using `ibmcloud resource service-instance-create` against the `sysdig-secure` service.

5. **Wrong CLI command structure in Layer 6** — `ibmcloud ks cluster feature enable private-service-endpoint --cluster …` is not a valid IBM Cloud Kubernetes Service CLI command. The documented commands are `ibmcloud ks cluster master private-service-endpoint enable --cluster <CLUSTER>` and `ibmcloud ks cluster master public-service-endpoint disable --cluster <CLUSTER>`. Corrected both, and added the `ibmcloud ks cluster master refresh` step that is required for the endpoint change to take effect. Added a note that on VPC clusters these endpoint settings are fixed at cluster creation time, since the original wording implied the commands work uniformly.

## Review Notes

- The mermaid diagram in Layer 1 names IBM's managed policies (`allow-ibm-ports` at order 1000, `allow-all-outbound` at order 2000) and their order numbers as illustrative. The actual set of pre-installed policies in IKS evolves with the addon (e.g. `allow-all-outbound`, `allow-bigip-agent`, `allow-egress-only`, `allow-vrrp`, `allow-icmp`, `allow-node-port-dnat`), and order values vary across IKS versions. Readers should run `calicoctl get globalnetworkpolicies` against their own cluster to see the exact list and orders rather than treating the diagram as authoritative. Left as-is because the section is explicit that this is an order-space illustration.
- Layer 2 uses `order: 4900`, which is lower than the "5000+" guidance in the Layer 1 diagram. This is intentional and correct: the metadata-block deny must precede any user allow rules. Worth flagging in a future revision so readers don't view the "5000+" rule as absolute.
- The Layer 3 VPC security group rules use 10250/TCP (kubelet) and 4789/UDP (VXLAN). Both are correct for kubelet and Calico VXLAN-mode overlay, respectively. On IBM Cloud VPC clusters, the default Calico encapsulation is IP-in-IP rather than VXLAN; if a reader chose IP-in-IP, port 4789 would not be the right rule (they would need to allow IP protocol 4). The post does not call this out.
- The Workload Protection service catalog identifier is currently `sysdig-secure` on IBM Cloud (the service is co-branded). If IBM renames the catalog entry in the future, the `service-instance-create` argument will need updating.
