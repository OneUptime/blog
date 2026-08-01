# Run kOps in an Existing AWS VPC Without Recreating Network Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, AWS, VPC, Networking, Shared Infrastructure

Description: Point kOps at explicit existing VPC, subnet, and egress IDs so shared networking remains externally owned and unchanged.

---

`--network-id` tells kOps to reuse an existing VPC, but it does not by itself mean “reuse every network resource.” By default, kOps can still create cluster subnets and route tables inside that VPC. To preserve an established network, provide the existing subnet IDs as well and declare how private-subnet egress is owned.

The ownership boundary should be visible in the cluster spec:

- `networkID` identifies a shared VPC;
- a subnet `id` identifies a shared subnet;
- `egress: nat-...` identifies a shared NAT gateway;
- `egress: External` says routing is managed outside kOps.

## Inventory the VPC Before Creating the Cluster

Collect and verify:

- VPC ID and all associated IPv4/IPv6 CIDRs;
- private, public, and utility subnet IDs, CIDRs, and Availability Zones;
- route-table associations and default routes;
- Internet Gateway, NAT gateway, NAT instance, transit gateway, or proxy path;
- DNS support and DNS hostnames settings;
- available IP addresses per subnet;
- network ACLs, security requirements, VPC endpoints, and outbound dependencies;
- which system owns tags and route changes.

Example AWS queries:

```bash
aws ec2 describe-vpcs --vpc-ids vpc-0123456789abcdef0

aws ec2 describe-subnets \
  --filters Name=vpc-id,Values=vpc-0123456789abcdef0

aws ec2 describe-route-tables \
  --filters Name=vpc-id,Values=vpc-0123456789abcdef0
```

Ensure DNS resolution is enabled in the VPC. Current kOps checks `enableDnsSupport` and refuses to enable it automatically for a shared VPC; the existing-VPC guide also instructs operators to enable DNS hostnames. Have the VPC owner review and set both AWS attributes deliberately.

```bash
aws ec2 describe-vpc-attribute \
  --vpc-id vpc-0123456789abcdef0 \
  --attribute enableDnsSupport

aws ec2 describe-vpc-attribute \
  --vpc-id vpc-0123456789abcdef0 \
  --attribute enableDnsHostnames
```

## Choose Public or Private Topology First

For public topology, nodes use public subnets. For private topology, nodes use private subnets, while utility subnets host public-facing load balancers and kOps-managed NAT resources when those are requested.

When reusing all network components in a private topology, supply both the existing private subnets and appropriate utility subnets at cluster creation:

```bash
export KOPS_STATE_STORE=s3://example-kops-state
export CLUSTER_NAME=prod.example.com
export VPC_ID=vpc-0123456789abcdef0

kops create cluster \
  --name "$CLUSTER_NAME" \
  --cloud aws \
  --topology private \
  --network-id "$VPC_ID" \
  --zones eu-west-2a,eu-west-2b,eu-west-2c \
  --subnets subnet-private-a,subnet-private-b,subnet-private-c \
  --utility-subnets subnet-public-a,subnet-public-b,subnet-public-c
```

Use real AWS subnet IDs for the arguments. `--network-id` is optional when kOps can infer the VPC from the supplied subnet IDs, but keeping the intended VPC explicit makes review easier.

Do not apply the cluster yet. First inspect its stored spec:

```bash
kops edit cluster "$CLUSTER_NAME"
```

## Verify Every Shared Subnet Has an ID

A private-topology spec might contain:

```yaml
spec:
  networkCIDR: 10.20.0.0/16
  networkID: vpc-0123456789abcdef0
  subnets:
    - name: private-eu-west-2a
      id: subnet-0aaa1111
      cidr: 10.20.0.0/20
      zone: eu-west-2a
      type: Private
      egress: nat-0aaa9999
    - name: private-eu-west-2b
      id: subnet-0bbb2222
      cidr: 10.20.16.0/20
      zone: eu-west-2b
      type: Private
      egress: nat-0bbb9999
    - name: private-eu-west-2c
      id: subnet-0ccc3333
      cidr: 10.20.32.0/20
      zone: eu-west-2c
      type: Private
      egress: nat-0ccc9999
    - name: utility-eu-west-2a
      id: subnet-0ddd4444
      cidr: 10.20.128.0/24
      zone: eu-west-2a
      type: Utility
    - name: utility-eu-west-2b
      id: subnet-0eee5555
      cidr: 10.20.129.0/24
      zone: eu-west-2b
      type: Utility
    - name: utility-eu-west-2c
      id: subnet-0fff6666
      cidr: 10.20.130.0/24
      zone: eu-west-2c
      type: Utility
```

The `id` is the ownership signal. Without it, kOps interprets the entry as a subnet it should create.

kOps requires either all subnets to be pre-created or none of them in this shared-subnet workflow. It does not create route tables when it is not creating subnets, and it does not repair the route-table setup of shared subnets. Existing public/utility subnets must already route to an Internet Gateway; existing private subnets must already have the intended egress.

## Declare Existing NAT or External Egress

For an existing zonal public NAT gateway, put its ID in the corresponding **private** subnet's `egress` field:

```yaml
spec:
  subnets:
    - name: private-eu-west-2a
      id: subnet-0aaa1111
      cidr: 10.20.0.0/20
      zone: eu-west-2a
      type: Private
      egress: nat-0aaa9999
```

Although a zonal public NAT gateway lives in a public subnet, `egress` describes the default path used by the private subnet.

kOps also recognizes an existing NAT instance ID and, in current documentation, an existing transit gateway ID. Validate the supported forms against the kOps release that operates the cluster.

If route management is entirely external-for example through centralized inspection, a virtual appliance, or another unsupported design-set `egress: External` on every subnet whose egress kOps should ignore, including utility subnets:

```yaml
spec:
  subnets:
    - name: private-eu-west-2a
      id: subnet-0aaa1111
      cidr: 10.20.0.0/20
      zone: eu-west-2a
      type: Private
      egress: External
    - name: utility-eu-west-2a
      id: subnet-0ddd4444
      cidr: 10.20.128.0/24
      zone: eu-west-2a
      type: Utility
      egress: External
```

`External` means kOps should ignore egress for that subnet. It does not make a disconnected network functional. Before bootstrap, ensure nodes can reach every required endpoint through NAT, proxies, or VPC endpoints, including the state/discovery stores, image registries, AWS APIs, and the Kubernetes API path.

## Decide Who Owns Subnet Tags

By default, kOps tags existing subnets for cluster association and load-balancer discovery. Its documented tags include:

```text
kubernetes.io/cluster/<cluster-name> = shared
kubernetes.io/role/elb = 1
kubernetes.io/role/internal-elb = 1
```

The role tag depends on subnet type. These tags help Kubernetes and AWS load-balancer controllers choose public versus private subnets.

If central infrastructure owns shared-subnet tags, create the cluster with `--disable-subnet-tags` and have that owner apply an equivalent, reviewed tagging scheme. Omitting required discovery tags can prevent Services or Ingresses from creating load balancers; allowing every cluster to rewrite shared tags can also create cross-cluster ambiguity.

Tag values of `shared` are essential for shared resources. Do not mark an externally owned VPC or subnet `owned` by one cluster.

## Preview the Full Resource Plan

Run a dry run:

```bash
kops update cluster "$CLUSTER_NAME"
```

The plan may legitimately create cluster-owned resources such as:

- control-plane and worker Auto Scaling groups and launch templates;
- cluster-specific security groups and IAM resources;
- API load balancers and DNS records;
- etcd volumes and bootstrap objects.

It should not propose creating or replacing the listed shared VPC, subnets, NAT gateways, Internet Gateway, or their route tables.

Stop if the preview contains an unexpected network create, route association, default route, CIDR, or ownership-tag change. Correct the cluster spec instead of applying and attempting to repair the VPC afterward.

After review:

```bash
kops update cluster "$CLUSTER_NAME" --yes
```

## Validate Network Capacity and Reachability

An existing subnet can be correctly referenced yet unsuitable for Kubernetes. Validate:

- free IP space for nodes, load balancers, and the selected CNI's Pod-address model;
- DNS resolution from private subnets;
- control-plane-to-node and node-to-control-plane paths;
- outbound access or the complete set of VPC endpoints;
- load-balancer subnet discovery;
- security-group and NACL return traffic;
- zone alignment for nodes and persistent volumes.

Then validate the cluster:

```bash
kops validate cluster "$CLUSTER_NAME" --wait 15m
kubectl get nodes -o wide
kubectl get pods --all-namespaces -o wide
```

## Deletion Safety Is Part of Creation

Before production use, run a deletion preview from an expendable environment built with the same ownership pattern:

```bash
kops delete cluster "$CLUSTER_NAME"
```

Without `--yes`, review what kOps identifies for deletion. Shared VPC, subnet, and egress resources should remain outside the deletion set; cluster-specific resources should be removable.

Keep VPC infrastructure in its own IaC stack and protect critical shared resources with AWS permissions and change review. kOps resource classification is one safeguard, not the only safeguard.

The core rule is simple: IDs mean reuse. Reference the VPC, every subnet, and every egress resource explicitly, then insist that the kOps dry run contains no surprise network ownership.

## Official Documentation

- [kOps: Run in an existing VPC](https://kops.sigs.k8s.io/run_in_existing_vpc/)
- [kOps: Cluster resource subnet and egress fields](https://kops.sigs.k8s.io/cluster_spec/#clusterspec-subnet-keys)
- [kOps: Supported network topologies](https://kops.sigs.k8s.io/topology/)
- [kOps: Deploying to AWS](https://kops.sigs.k8s.io/getting_started/aws/)
- [AWS: VPC DNS attributes](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-dns.html)
- [AWS: NAT gateways](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)
- [AWS: Route tables](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html)
