# Validation Summary: How to Use Ambient Mode with Kubernetes NetworkPolicy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Istio ambient mode
- Istio AuthorizationPolicy
- Istio ztunnel and HBONE
- Calico
- Cilium
- Amazon VPC CNI / EKS Network Policy Agent

## Sources Consulted
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Istio Ambient and Kubernetes NetworkPolicy: https://istio.io/latest/docs/ambient/usage/networkpolicy/
- Istio ztunnel traffic redirection: https://istio.io/latest/docs/ambient/architecture/traffic-redirection/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio NetworkPolicy setup: https://istio.io/latest/docs/setup/additional-setup/network-policy/
- Cilium troubleshooting and monitor command reference: https://docs.cilium.io/en/stable/operations/troubleshooting/ and https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Amazon EKS VPC CNI NetworkPolicy documentation: https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy.html and https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy-configure.html
- Calico NetworkPolicy documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy

## Issues Found
- The post described ambient mode primarily as a source IP change where NetworkPolicy may see ztunnel or node IPs. Istio's current ambient documentation frames the NetworkPolicy interaction around secured HBONE traffic entering destination pods on port 15008, with NetworkPolicy enforced outside the pod before ambient redirects traffic to the original application port. Updated the explanation and examples accordingly.
- The same-node and cross-node traffic sections implied different source-IP behavior depending on CNI and node placement. Istio documents that traffic traverses ztunnel even on the same node, and NetworkPolicy must account for port 15008. Updated those sections.
- The "allow ztunnel" NetworkPolicy example selected ztunnel pods in `istio-system`, which is not the recommended way to keep workload NetworkPolicies compatible with ambient traffic. Replaced it with a port 15008 HBONE allow example.
- The IP block example used a broad cluster CIDR for mesh traffic. Kubernetes documentation says `ipBlock` should generally represent cluster-external ranges because pod IPs are ephemeral, and Istio documents explicit port 15008 handling plus health probe link-local addresses. Replaced the example with a port-based policy and documented the ambient health probe IP blocks.
- The "what must be allowed" checklist over-specified ztunnel-to-workload and ztunnel-to-ztunnel paths. Updated it to distinguish HBONE on port 15008, workload egress to port 15008, application ports, ztunnel-to-istiod on port 15012, waypoint traffic, and ambient health probe link-local addresses.
- The AWS VPC CNI section claimed NetworkPolicy enforcement happens "at the ENI level" before Istio interception. EKS documentation describes enforcement for pods on their primary interface and calls out standard/strict startup behavior and unsupported Fargate or Windows nodes. Updated the wording.
- The Cilium troubleshooting command used `cilium monitor --type drop`. Current Cilium docs use `cilium-dbg monitor --type drop`; updated the command and added a pod lookup.

## Review Notes
The Kubernetes and Istio YAML snippets use current API versions (`networking.k8s.io/v1` and `security.istio.io/v1`). `kubectl` was not installed in the local environment, so CLI validation was performed against official command examples and documentation rather than local `--help` output.
