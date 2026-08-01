# Validation Summary: Public vs Private Topology in kOps: API Access, Bastions, NAT Gateways, and Cost

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- kOps 1.37 cluster topology and CLI
- Kubernetes and `kubectl`
- Amazon Web Services (AWS)
- Amazon VPC public, private, utility, and dual-stack subnets
- Internet gateways, NAT gateways, and route tables
- Network Load Balancers and bastion hosts
- VPC endpoints, AWS PrivateLink, and centralized egress
- AWS Systems Manager Session Manager

## Sources Consulted
- [kOps: Supported network topologies](https://kops.sigs.k8s.io/topology/) — verified public/private subnet behavior, utility subnets, the default public API load balancer for private topology, and the documented API load-balancer migration procedure
- [kOps: `kops create cluster`](https://kops.sigs.k8s.io/cli/kops_create_cluster/) — verified `--cloud`, `--zones`, `--topology`, `--bastion`, and API load-balancer flags
- [kOps: Cluster Resource](https://kops.sigs.k8s.io/cluster_spec/#api) — verified `spec.api.loadBalancer.type: Internal`, NLB behavior, load-balancer subnet selection, `kubernetesApiAccess`, and `sshAccess`
- [kOps: Cluster validation source](https://github.com/kubernetes/kops/blob/9ff72bcc87f03d53dec213cd3f6617f9998a8214/pkg/apis/kops/validation/validation.go#L282-L291) — verified that an internal API load balancer requires at least one subnet of type `Private`
- [kOps: Bastion setup](https://kops.sigs.k8s.io/bastion/) — verified bastion InstanceGroup behavior, the `bastions` name, load balancer and DNS behavior, edit commands, and zero-sized InstanceGroups
- [kOps: Run in an existing VPC](https://kops.sigs.k8s.io/run_in_existing_vpc/) — verified one NAT gateway per AZ for private topology, existing NAT IDs in subnet `egress`, and `egress: External`
- [kOps: `kops update cluster`](https://kops.sigs.k8s.io/cli/kops_update_cluster/) — verified preview and `--yes` behavior
- [kOps: `kops validate cluster`](https://kops.sigs.k8s.io/cli/kops_validate_cluster/) — verified the cluster argument and `--wait 15m` duration syntax
- [Kubernetes: API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/) — verified `kubectl get --raw='/readyz?verbose'`
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — verified `kubectl get nodes -o wide`
- [AWS: Internet gateways](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html) — verified public-subnet routing and the distinction between route reachability and instance addressing
- [AWS: NAT gateway basics](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html) — verified AZ-scoped resiliency and the recommendation to route each AZ through a same-AZ NAT gateway
- [AWS: NAT gateway pricing](https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html) — verified hourly and per-GB processing charges and cross-AZ cost guidance
- [AWS: Gateway endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html) — verified that S3 and DynamoDB gateway endpoints have no additional charge
- [AWS: Interface VPC endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html) — verified hourly and data-processing charges for interface endpoints
- [AWS: Systems Manager VPC endpoints](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html) — verified the outbound internet or VPC endpoint requirements for Session Manager
- [AWS: VPC IP addressing](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html) — verified that AWS charges for public IPv4 addresses, including Elastic IP addresses

## Issues Found

1. **Public topology understated the internal API subnet requirement**: The comparison implied that API load-balancer exposure could be configured independently without a topology constraint. Current kOps validation requires at least one subnet of type `Private` for an internal API load balancer. Updated the comparison to state that requirement.

2. **Gateway endpoint pricing was incorrect**: The post grouped gateway and interface endpoints together as having hourly and data-processing charges. AWS charges interface endpoints that way, but S3 and DynamoDB gateway endpoints have no additional charge. Corrected the cost explanation and retained the limitation that endpoints do not provide arbitrary internet access.

3. **The access-control field name was not current**: `adminAccess` is not the documented current cluster-spec field. Replaced it with the current v1alpha2 fields `kubernetesApiAccess` and `sshAccess`.

4. **Public IPv4 cost terminology was imprecise**: Replaced “Elastic IPv4 address charges” with AWS's current terminology, “public IPv4 address charges, including Elastic IP addresses.”

5. **The kOps API configuration link used a stale fragment**: Updated the link from the removed `#load-balancer-for-the-kubernetes-api` fragment to the current `#api` section.

## Review Notes
- The examples use the default IPv4 cluster mode. For IPv6 private topology, kOps documents egress-only internet gateways and NAT64-related routing rather than the IPv4 NAT-only pattern emphasized here.
- kOps 1.37 uses Network Load Balancers for the Kubernetes API; support for Classic Load Balancers was removed. The post uses generic load-balancer terminology and remains correct.
