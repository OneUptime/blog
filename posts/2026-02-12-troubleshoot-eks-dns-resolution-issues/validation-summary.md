# Validation Summary: How to Troubleshoot EKS DNS Resolution Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon EKS
- Kubernetes DNS
- CoreDNS
- AWS VPC DNS / AmazonProvidedDNS
- Route 53 Resolver
- Horizontal Pod Autoscaler
- NodeLocal DNSCache
- kubectl
- AWS CLI

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes DNS debugging guide: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes v1.33 Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Amazon EKS CoreDNS add-on documentation: https://docs.aws.amazon.com/eks/latest/userguide/managing-coredns.html
- Amazon VPC DNS concepts: https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- Amazon VPC DNS attributes: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-dns.html
- Amazon EKS private clusters documentation: https://docs.aws.amazon.com/eks/latest/userguide/private-clusters.html
- AWS PrivateLink private DNS documentation: https://docs.aws.amazon.com/vpc/latest/privatelink/interface-endpoints.html
- CoreDNS loop plugin documentation: https://coredns.io/plugins/loop/

## Issues Found
- The introduction said "pods can't pull images." Kubernetes image pulls are performed by the node/kubelet, not by pods themselves. Changed this to "image pulls fail."
- The DNS flow diagram used `10.0.0.2` as if it were the fixed VPC DNS resolver address. AWS documents AmazonProvidedDNS as the primary VPC CIDR base address plus two, so the post now says `VPC CIDR + 2` and keeps `10.0.0.2` only as an example for a `10.0.0.0/16` VPC.
- The service backend check used `kubectl get endpoints`. The Kubernetes Endpoints API is deprecated as of Kubernetes 1.33, so the check now uses EndpointSlices with the `kubernetes.io/service-name=kube-dns` label.
- The CoreDNS HPA example described autoscaling "based on cluster size," but the shown HPA scales on CPU utilization. Updated the wording and comment to match the configuration.
- The NodeLocal DNSCache install command applied the upstream manifest directly. The official manifest contains placeholder values that must be substituted before use, so the example now downloads the template, fills in the kube-dns service IP, cluster domain, and local DNS address, then creates the resources.

## Review Notes
- `kubectl`, `aws`, and cluster connectivity were not available in the local environment, so CLI behavior was verified against official documentation rather than live command output.
- The CoreDNS ClusterIP (`10.100.0.10`) and cluster domain (`cluster.local`) examples are valid common defaults but can vary by EKS cluster configuration.
- The BusyBox DNS test image and the Kubernetes `autoscaling/v2` HPA example are syntactically appropriate for current Kubernetes releases.
