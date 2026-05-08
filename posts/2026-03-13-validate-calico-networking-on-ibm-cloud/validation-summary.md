# Validation Summary: Validate Calico Networking on IBM Cloud

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IBM Cloud Kubernetes Service
- IBM Cloud VPC security groups
- Kubernetes
- Calico
- calicoctl
- kubectl

## Sources Consulted
- IBM Cloud Docs: Debugging network connections between pods, including IKS Calico and CoreDNS pod health checks: https://cloud.ibm.com/docs/containers?topic=containers-debug_pods
- IBM Cloud Docs: Debugging Calico components, including Calico namespaces by IKS version: https://cloud.ibm.com/docs/containers?topic=containers-calico_log_level
- IBM Cloud Docs: Network policies and default Calico host policies: https://cloud.ibm.com/docs/containers?topic=containers-network_policies
- IBM Cloud Docs: VPC security group CLI reference: https://cloud.ibm.com/docs/vpc?topic=vpc-vpc-reference
- IBM Cloud Docs: VPC security group behavior and rule model: https://cloud.ibm.com/docs/vpc?topic=vpc-using-security-groups
- Calico Docs: Kubernetes system requirements and Calico network ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Docs: calicoctl node status: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Docs: calicoctl get command: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Docs: IP pool block-size validation commands: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Kubernetes Docs: kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Docs: NetworkPolicy concept and behavior: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The Calico pod health check used `ibm-system`, which is not the documented namespace for Calico components. Updated the command to inspect all namespaces for Calico/CoreDNS pods and added the documented IKS namespace distinction: `calico-system` for IKS 1.29 and later, `kube-system` for IKS 1.28 and earlier.
- The `calicoctl node status` expected BGP output implied that "No peers established" was the normal IKS result. Updated it to distinguish overlay-only clusters, where no IPv4 peers can be expected, from BGP-enabled clusters, where peers should be `Established`.
- The VPC security group section assumed VXLAN only. Updated it to note that VXLAN requires UDP 4789, while BGP and IP-in-IP use different rules, matching Calico's official network requirements and IBM VPC protocol names.
- The cross-zone test used backgrounded `kubectl run` commands followed by a fixed sleep. Replaced that with `kubectl wait` so the test only continues after both pods are Ready.
- The managed Calico policy check grepped only for `ibm`, which would miss documented default policies such as `allow-all-outbound`, `allow-all-private-default`, and `allow-sys-mgmt`. Updated the check and clarified that these are IKS classic Calico host policies.

## Review Notes
The guide is technically relevant and mostly accurate after the fixes. Future improvements could include adding a short note that IKS VPC clusters also use IBM-managed VPC security groups, so users should avoid changing managed cluster security groups unless following IBM's documented workflow.
