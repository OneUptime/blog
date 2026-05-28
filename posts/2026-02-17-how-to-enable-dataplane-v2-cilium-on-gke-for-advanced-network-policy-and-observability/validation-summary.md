# Validation Summary: How to Enable Dataplane V2 Cilium on GKE for Advanced Network Policy

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Dataplane V2
- Kubernetes NetworkPolicy
- GKE FQDNNetworkPolicy
- CiliumClusterwideNetworkPolicy
- Hubble / GKE Dataplane V2 observability
- Google Cloud CLI
- Cloud Logging

## Sources Consulted
- Google Cloud: GKE Dataplane V2 overview: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Google Cloud: Using GKE Dataplane V2: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/dataplane-v2
- Google Cloud: Set up GKE Dataplane V2 observability: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/configure-dpv2-observability
- Google Cloud: Observe your traffic using GKE Dataplane V2 observability: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/observe-your-traffic
- Google Cloud: Use network policy logging: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/network-policy-logging
- Google Cloud: Control Pod egress traffic using FQDN network policies: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/fqdn-network-policies
- Google Cloud: Control cluster-wide communication using network policies: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/configure-cilium-network-policy
- Cilium documentation: Inspecting Network Flows with the Hubble CLI: https://docs.cilium.io/en/stable/observability/hubble/hubble-cli/

## Issues Found
- The post described GKE Dataplane V2 as supporting namespaced `CiliumNetworkPolicy` examples with `toFQDNs`, `egressDeny`, and L7 HTTP rules. Current GKE documentation says GKE Dataplane V2 does not support the generic `CiliumNetworkPolicy` CRD, and GKE's Cilium cluster-wide policy support is limited to L3/L4 rules. Replaced those examples with supported `FQDNNetworkPolicy` and `CiliumClusterwideNetworkPolicy` examples, and changed the L7 section into a caveat.
- The observability enablement flag was incorrect. Replaced `--enable-dataplane-v2-observability` with the documented `--enable-dataplane-v2-flow-observability`.
- The Hubble access instructions used an upstream Hubble install and `kube-system` port-forward pattern. Replaced this with GKE's managed `hubble-cli` container in the `gke-managed-dpv2-observability` namespace.
- The policy logging section only used a policy annotation. Added the required `NetworkLogging` configuration and replaced the Cloud Logging query with the documented `policy-action` log query shape.
- The verification section used a Cilium status command that is not documented for GKE's managed Dataplane V2. Replaced it with checks for the `anetd` DaemonSet and the cluster `networkConfig.datapathProvider`.
- The iperf example attempted to connect to a Pod name without creating a Service. Added `kubectl expose pod iperf-server --port 5201` and specified the port in the client command.
- The migration section exported live Kubernetes objects directly, which can include generated fields and immutable service fields. Replaced that with applying source manifests to the new cluster.
- Added `--enable-ip-alias` to Standard cluster creation examples to align with GKE Dataplane V2 requirements and documented examples.

## Review Notes
GKE Dataplane V2 observability and FQDNNetworkPolicy have version and feature-gate requirements. The post now avoids unsupported upstream Cilium policy examples, but readers should still verify their target GKE version and Google Cloud CLI version before using these features.
