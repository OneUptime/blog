# Validation Summary: How to Migrate Existing Workloads to Calico on IBM Kubernetes Service

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- IBM Kubernetes Service
- Calico and calicoctl
- Kubernetes network policies
- Calico NetworkPolicy, GlobalNetworkPolicy, and HostEndpoint resources
- IBM Cloud CLI

## Sources Consulted
- IBM Cloud Docs: Controlling traffic with network policies: https://cloud.ibm.com/docs/containers?topic=containers-network_policies
- IBM Cloud Docs: IBM Cloud Kubernetes Service CLI reference: https://cloud.ibm.com/docs/containers?topic=containers-kubernetes-service-cli
- IBM Cloud Docs: Service limitations: https://cloud.ibm.com/docs/containers?topic=containers-limitations
- IBM Cloud Docs: Understanding secure by default Cluster VPC Networking: https://cloud.ibm.com/docs/containers?topic=containers-vpc-security-group-reference
- Calico Docs: Get started with Calico network policy: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico Docs: GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Docs: calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Docs: Install calicoctl: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Kubernetes Docs: API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks

## Issues Found
- The introduction overstated that IKS exposes Calico's "complete feature set" including Calico IPAM without caveats. IBM documents that changing the managed Calico plug-in, components, default IPPool resources, or Calico nodes is not supported, so the wording now focuses on Calico policy functionality and notes the managed-component limitation.
- The post described IKS HostEndpoint protection as universal. IBM's detailed HostEndpoint network policy documentation is scoped to classic clusters, while VPC clusters use secure-by-default VPC networking and managed security groups. The post now distinguishes classic and VPC behavior.
- The `calicoctl` setup omitted `DATASTORE_TYPE=kubernetes`, which IBM documents for Kubernetes 1.19 and later clusters. The setup now exports that value.
- The prerequisites pinned `calicoctl` to v3.27+ without tying it to the cluster's Calico version. Calico documents that `calicoctl` should match the Calico version running in the cluster, so the prerequisite now states that requirement.
- The policy review example referenced a specific `allow-ibm-ports` GlobalNetworkPolicy name that is not a current default policy name in IBM's docs. The command now retrieves all global network policies in YAML for review.
- The example used `kubectl get componentstatuses`, which relies on the deprecated ComponentStatus API. It now uses `kubectl get --raw='/readyz?verbose'`, matching Kubernetes API health endpoint guidance.
- The best-practices section referred to enabling Calico flow logs on IKS, which IBM documents instead as Calico log policies for denied traffic. The wording now reflects Calico log policies.
- The Calico policy example specified ports without `protocol`. Calico examples use `protocol: TCP` when matching TCP ports, so the sample now includes it for both ingress and egress rules.

## Review Notes
The post is technically relevant and includes implementation commands and configuration snippets. The remaining migration steps are intentionally generic because workload manifests, namespace names, pod labels, and service names vary by application.
