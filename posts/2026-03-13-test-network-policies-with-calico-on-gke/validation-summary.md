# Validation Summary: How to Test Network Policies with Calico on GKE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Kubernetes Engine (GKE)
- GKE Standard network policy enforcement with Calico
- Kubernetes NetworkPolicy
- kubectl
- BusyBox and nginx test pods
- Google Cloud VPC-native networking

## Sources Consulted
- GKE network policy documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/network-policy
- GKE Dataplane V2 documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/dataplane-v2
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Calico network policy documentation: https://docs.tigera.io/calico/latest/about/about-network-policy
- Calico Kubernetes network policy tutorial: https://docs.tigera.io/calico-cloud/tutorials/kubernetes-tutorials/kubernetes-network-policy

## Issues Found
- The introduction described Calico as disabling a GKE native policy controller and made broad statements about all GKE clusters being VPC-native. Updated the wording to match GKE's current model: Calico applies to GKE Standard clusters that do not use GKE Dataplane V2, while Dataplane V2 uses Cilium/eBPF and has NetworkPolicy built in.
- The prerequisites listed `calicoctl`, but the tutorial uses only Kubernetes NetworkPolicy resources and `kubectl`; removed the unused prerequisite.
- The nginx pod was declared and exposed on port 8080, but the default nginx container listens on port 80. Updated the pod port, Service port, NetworkPolicy ports, and wget URLs to port 80.
- BusyBox wget examples used `--timeout=5`, which is less portable for the BusyBox applet. Replaced those invocations with `-T 5`.
- The DNS egress policies allowed only UDP port 53. Added TCP port 53 as well, which is needed for DNS fallback and is a safer DNS allowance.
- Step 5 was titled as verifying both clients were blocked but only tested one client. Added the denied-client verification command and updated the expected result wording.
- The cross-zone example hard-coded a specific GKE zone. Added a `ZONE` variable and a note to set it to a zone where the cluster has nodes.
- The conclusion overstated VPC-native behavior as universal. Updated it to apply specifically to VPC-native clusters.

## Review Notes
The NetworkPolicy manifests use the current `networking.k8s.io/v1` API and valid `policyTypes`, `podSelector`, ingress, and egress fields. A live GKE cluster was not available in this environment, so validation was performed against official documentation and command references rather than by executing the tutorial end to end.
