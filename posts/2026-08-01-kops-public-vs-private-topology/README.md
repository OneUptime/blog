# Public vs Private Topology in kOps: API Access, Bastions, NAT Gateways, and Cost

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, AWS, Network Topology, NAT Gateway, Bastion

Description: Compare kOps public and private AWS topologies across node exposure, API access, administration paths, egress design, and recurring cost.

---

kOps topology answers where cluster instances are placed and whether their subnets accept routes from the internet. It does not, by itself, completely define Kubernetes API exposure or administrative access.

On AWS:

- `public` topology launches nodes in public subnets;
- `private` topology launches nodes in subnets with no internet ingress and normally uses utility subnets for public load balancers and NAT gateways;
- a newly created private-topology cluster can still have a **public** Kubernetes API load balancer;
- a bastion is optional and solves SSH reachability, not every private API-access requirement.

Choose topology, API load-balancer type, egress, and operator connectivity as four related but separate decisions.

## Topology Comparison

| Concern | Public topology | Private topology |
| --- | --- | --- |
| Node placement | Public subnets | Private subnets |
| Internet route to nodes | Routable when public IPs/routes exist; security groups still filter traffic | No direct internet ingress route |
| Outbound internet | Typically direct through an Internet Gateway | Typically through NAT per AZ, centralized egress, proxy, or VPC endpoints |
| API endpoint | Can be public or separately configured | Public by default for newly created clusters unless changed to internal |
| SSH | Directly reachable only if routing, public IP, security groups, and credentials permit | Usually through a bastion, SSM, VPN, or private network |
| Extra network resources | Fewer NAT resources | Utility subnets and often NAT gateways/EIPs; possibly bastion load balancer |
| Cost tendency | Lower fixed networking cost | Higher fixed and data-processing cost when NAT/LBs are used |
| Security posture | More publicly routable interfaces to constrain | Smaller direct-ingress surface, with more egress and access-path design |

“Public subnet” does not mean “all ports are open.” Route tables create reachability; security groups and network ACLs control allowed traffic. A public node with no permissive inbound rule is still less exposed than one with SSH open to the world, but it retains a public routing surface that private topology avoids.

## Create a Public-Topology Cluster

The topology is explicit at creation:

```bash
export KOPS_STATE_STORE=s3://example-kops-state
export CLUSTER_NAME=prod.example.com

kops create cluster \
  --name "$CLUSTER_NAME" \
  --cloud aws \
  --zones eu-west-2a,eu-west-2b,eu-west-2c \
  --topology public
```

Public topology is reasonable for some development clusters and tightly controlled environments. Restrict API and SSH source CIDRs, minimize security-group ingress, use IMDSv2, and do not assume a public node must expose application ports directly. Kubernetes Services and Ingress should remain the intentional traffic entry points.

## Create a Private-Topology Cluster

A typical private cluster uses private node subnets and utility subnets:

```bash
kops create cluster \
  --name "$CLUSTER_NAME" \
  --cloud aws \
  --zones eu-west-2a,eu-west-2b,eu-west-2c \
  --topology private \
  --bastion
```

When kOps creates the network, private topology normally creates a NAT gateway per Availability Zone. Per-AZ egress avoids depending on another AZ and avoids cross-AZ routing for normal outbound traffic, but each NAT gateway has an hourly charge and a data-processing charge.

If a central network already provides NAT, transit, inspection, or a proxy, reference those existing resources in the subnet `egress` fields or use `egress: External` as documented. Do not let each cluster create parallel NAT gateways accidentally.

## Private Nodes Do Not Imply a Private API

kOps documentation states that newly created private-topology clusters have public access to the Kubernetes API through a load balancer by default. This is often useful: nodes remain private while authorized operators reach the API over a restricted public endpoint.

Treat API access as its own control:

- restrict administrative source CIDRs;
- use strong Kubernetes authentication and short-lived credentials;
- audit authorization and API requests;
- consider an internal API load balancer when operators and automation have private connectivity.

To request an internal API load balancer in the cluster spec:

```yaml
spec:
  api:
    loadBalancer:
      type: Internal
```

An internal API requires a path from every administrator and CI/CD runner through VPN, Direct Connect, transit networking, a peered VPC, or an equivalent private access system. An SSH bastion does not automatically make local `kubectl` traffic reach the API; configure a supported tunnel or private route explicitly.

Changing an existing AWS API load balancer from public to internal is not an in-place property update. The kOps topology documentation describes deleting and recreating the load balancer and performing a cloud-only forced control-plane rolling update because the API is temporarily unavailable. Treat that as a planned migration with outage and recovery procedures, not a routine edit.

## What the Bastion Does

With private topology, `--bastion` creates a Bastion-role InstanceGroup. Its purpose is controlled SSH access into the private network. kOps normally fronts it with a load balancer and DNS name.

The bastion does not:

- make the Kubernetes API internal by itself;
- replace VPN or private routing for applications and automation;
- eliminate the need to restrict SSH source networks;
- provide workload ingress;
- make private nodes independent of outbound bootstrap access.

Inspect the group:

```bash
kops get ig --name "$CLUSTER_NAME"
kops edit ig bastions --name "$CLUSTER_NAME"
```

A Bastion InstanceGroup can be set to zero minimum and maximum when not needed, as documented by kOps, but confirm how operators will recover access before disabling the only path. AWS Systems Manager Session Manager is another design option when installed, authorized, and reachable through internet egress or VPC endpoints; it is not enabled merely by choosing private topology.

## Model Private Egress Explicitly

Private nodes still need to reach services during bootstrap and operation. Depending on the cluster, these can include:

- the kOps state and discovery stores;
- container registries and image layers;
- EC2, Auto Scaling, STS, KMS, ELB, and Route 53 APIs;
- time, package, certificate, and observability endpoints;
- external application dependencies.

Three common patterns are:

### NAT gateway per Availability Zone

Simple and highly compatible. It adds one hourly NAT charge per zone, data-processing charges, public IPv4 resources, and normal internet data-transfer considerations.

### Centralized egress

Clusters route through a transit gateway or inspection VPC. This can consolidate controls but may add transit, appliance, and cross-AZ data charges and a shared failure domain. kOps must be told that egress is existing or externally managed.

### VPC endpoints plus restricted proxy or NAT

Gateway and interface endpoints keep supported AWS service traffic private. They have their own hourly/data costs and do not cover arbitrary internet endpoints. Build a complete dependency list; one missing registry, STS, or state-store path can prevent nodes from joining.

## Understand the Cost Difference

Avoid hard-coding a dollar estimate because prices vary by Region and change over time. Instead inventory billable resources and expected bytes.

Private topology can add:

- NAT gateway hourly charges per AZ;
- NAT data processing for each byte traversing it;
- Elastic IPv4 address charges;
- public or internal load-balancer hours and LCUs/NLCUs;
- bastion EC2 and load-balancer cost;
- interface VPC endpoint hours and data processing;
- transit gateway and cross-AZ processing.

Public topology can avoid NAT for node egress, but still incurs EC2 public IPv4, load balancer, and data-transfer charges. It may also carry a higher operational cost for exposure management.

Use AWS Cost Explorer and cost allocation tags to measure the real design. For large image pulls or telemetry streams, data path often matters more than the hourly NAT line item.

## Apply Security Controls in Either Topology

For both designs:

- restrict `adminAccess` and SSH access to known networks;
- use separate security groups for intentional traffic paths;
- keep control-plane and worker access least-privileged;
- use private registries or endpoints where practical;
- monitor route, security-group, NACL, and endpoint changes;
- test node bootstrap without relying on an engineer's workstation path;
- maintain at least two independent recovery access methods for production.

Private topology improves network isolation but does not make the cluster private if the API, ingress load balancers, bastion, or egress policy remain broadly exposed.

## Validate the Chosen Data Paths

Before applying, preview:

```bash
kops update cluster "$CLUSTER_NAME"
```

Confirm the intended subnet types, API load-balancer type, NAT/egress ownership, bastion resources, and source CIDRs. Then apply and validate:

```bash
kops update cluster "$CLUSTER_NAME" --yes
kops validate cluster "$CLUSTER_NAME" --wait 15m
```

Test from every real operator and automation location:

```bash
kubectl get --raw='/readyz?verbose'
kubectl get nodes -o wide
```

Also test a fresh node launch, image pull, external DNS resolution, workload ingress, private service connectivity, and failure of one Availability Zone's egress path.

Choose public topology when its simpler egress and lower fixed cost fit the risk boundary. Choose private topology when eliminating direct node ingress is worth the additional access and egress architecture. In both cases, decide API and administrator reachability explicitly.

## Official Documentation

- [kOps: Supported network topologies](https://kops.sigs.k8s.io/topology/)
- [kOps: Bastion setup](https://kops.sigs.k8s.io/bastion/)
- [kOps: Run in an existing VPC and reuse egress](https://kops.sigs.k8s.io/run_in_existing_vpc/)
- [kOps: Cluster API load-balancer configuration](https://kops.sigs.k8s.io/cluster_spec/#load-balancer-for-the-kubernetes-api)
- [AWS: NAT gateways](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html)
- [AWS: Compare NAT gateways and NAT instances](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-comparison.html)
- [AWS: NAT gateway pricing](https://aws.amazon.com/vpc/pricing/)
- [AWS: VPC endpoints](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html)
