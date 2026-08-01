# How to Keep Multiple kOps Clusters from Deleting Shared VPC Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: kOps, Kubernetes, AWS, Shared VPC, Resource Ownership, Multi-Cluster

Description: Separate shared-network and per-cluster ownership so deleting one kOps cluster cannot remove common VPC, subnet, route, or NAT infrastructure.

---

The safe multi-cluster pattern is to make shared network resources explicit inputs, not resources inferred and created independently by each kOps cluster. In kOps, an existing resource ID is more important than a naming convention: `networkID` and subnet `id` tell kOps that the VPC and subnets already exist and are shared. Egress IDs have a narrower role when kOps creates the subnets and route tables but reuses an existing egress resource.

Tags help discovery, but a `shared` tag alone is not a complete ownership contract. Keep the VPC in a separate infrastructure stack, pass immutable IDs into each cluster spec, centralize mutations to shared route and tag state, and preview deletion before approving it.

## Build an Ownership Matrix

Define the owner before creating the first cluster:

| Resource | Recommended owner | Shared? |
| --- | --- | --- |
| VPC and CIDR associations | Network stack/team | Yes |
| Internet/transit gateways | Network stack/team | Yes |
| Public, private, utility subnets | Network stack/team | Yes |
| Route tables and associations | Network stack/team | Yes |
| NAT gateways or egress appliances | Network stack/team | Yes |
| Cluster API load balancer | Individual kOps cluster | No |
| Cluster node/control-plane security groups | Individual kOps cluster | No |
| Auto Scaling groups and launch templates | Individual kOps cluster | No |
| etcd volumes | Individual kOps cluster | No |
| Kubernetes-created workload load balancers | Individual workload/cluster | No |

Sharing the durable network foundation is useful. Sharing mutable cluster security groups, API load balancers, or Auto Scaling groups creates ambiguous lifecycle and should be avoided.

## Reference the Existing VPC in Every Cluster

Each cluster should have a unique name and its own Cluster/InstanceGroup state, even when several clusters use one state-store bucket.

Example cluster A:

```yaml
apiVersion: kops.k8s.io/v1alpha2
kind: Cluster
metadata:
  name: payments.prod.example.com
spec:
  cloudProvider: aws
  networkCIDR: 10.20.0.0/16
  networkID: vpc-0123456789abcdef0
```

Cluster B uses the same VPC ID but a different cluster identity:

```yaml
apiVersion: kops.k8s.io/v1alpha2
kind: Cluster
metadata:
  name: analytics.prod.example.com
spec:
  cloudProvider: aws
  networkCIDR: 10.20.0.0/16
  networkID: vpc-0123456789abcdef0
```

If `networkID` is omitted, kOps may plan a cluster-owned VPC. A similar name or matching CIDR does not make an existing VPC shared.

## Put IDs on Every Shared Subnet

For each cluster, list shared subnets with their AWS IDs:

```yaml
spec:
  subnets:
    - name: private-eu-west-2a
      id: subnet-0aaa1111
      cidr: 10.20.0.0/20
      type: Private
      zone: eu-west-2a
    - name: private-eu-west-2b
      id: subnet-0bbb2222
      cidr: 10.20.16.0/20
      type: Private
      zone: eu-west-2b
    - name: utility-eu-west-2a
      id: subnet-0ccc3333
      cidr: 10.20.128.0/24
      type: Utility
      zone: eu-west-2a
    - name: utility-eu-west-2b
      id: subnet-0ddd4444
      cidr: 10.20.129.0/24
      type: Utility
      zone: eu-west-2b
```

The kOps existing-VPC documentation says that when all subnets are pre-created, kOps does not alter their network configuration and does not create their route tables. With the direct target, kOps can still add tags unless subnet tagging is disabled. A subnet entry without `id` is a request for kOps to create and own a subnet.

Do not mix “existing” and “to be created” casually. The documented shared-subnet workflow requires pre-created IDs for all subnets or for none of them.

## Make Egress Ownership Explicit

For the fully pre-created subnets shown above, the network stack owns the route tables and default routes. Leaving `egress` unset does not make kOps create a NAT gateway because kOps is not creating those subnets or their route tables.

An existing NAT gateway ID is useful in a different topology: kOps creates and owns the private and utility subnets and their route tables in an existing VPC, but reuses the externally owned NAT gateway. Reference it from the private subnet, which has no `id` in that design:

```yaml
egress: nat-0aaa9999
```

For a route design that kOps must not manage, set this on each affected subnet:

```yaml
egress: External
```

If the VPC has neither an Internet Gateway nor a NAT gateway, mark every subnet entry whose egress is external, including utility subnets, so kOps does not try to discover an Internet Gateway. Neither form validates that the external route is usable; the network owner must supply working DNS, return routes, inspection rules, endpoints, and internet access where required.

If kOps creates the private subnets and egress is unspecified, each cluster can create its own NAT and related route resources. That increases cost and makes deletion ownership harder to reason about. This does not happen merely because `egress` is omitted from a fully pre-created subnet entry with an `id`.

## Centralize Shared-Subnet Tags

With the direct target, kOps can add cluster association and load-balancer role tags to shared subnets by default. With multiple clusters, a subnet can legitimately have a separate association key for each cluster:

```text
kubernetes.io/cluster/payments.prod.example.com = shared
kubernetes.io/cluster/analytics.prod.example.com = shared
kubernetes.io/role/internal-elb = 1
```

Use `shared`, not `owned`, for resources that must survive deletion of either cluster.

The role tags are not cluster-specific, and controllers can use them for subnet discovery. If clusters must provision load balancers into different subnets, separate the subnet sets or configure explicit controller selection instead of relying on overlapping global role tags.

For centrally governed networks that use the direct target, create clusters with `--disable-subnet-tags` and manage the complete required tag set in the network stack. This prevents two cluster workflows from racing to add or remove shared tags. It also transfers responsibility: missing `kubernetes.io/role/elb` or `kubernetes.io/role/internal-elb` tags can stop load balancer provisioning. With the Terraform target, kOps emits shared subnet IDs as values rather than managing those subnet resources, so the network stack must manage their tags regardless.

## Keep State Stores and Names Unambiguous

kOps can store multiple clusters in one S3 state store, but cluster names remain the key identity boundary. Use:

- globally unique cluster names;
- separate automation variables and approval scopes;
- S3 versioning and restrictive state-store IAM;
- an explicit cluster name on every destructive command;
- no reliance on whichever kubeconfig context happens to be current.

For example:

```bash
kops get cluster payments.prod.example.com \
  --state s3://company-kops-state

kops delete cluster payments.prod.example.com \
  --state s3://company-kops-state
```

The second command is only a preview until `--yes` is supplied. Always use the preview in production procedures.

## Separate IAM Permissions by Lifecycle

The network provisioning identity should create and delete VPCs, subnets, route tables, gateways, and NAT resources. The routine cluster identity should be able to describe and use those resources without broad permission to delete them.

Use AWS IAM and, where appropriate, Organizations controls so a compromised or mistaken cluster pipeline cannot delete the shared network even if its plan is wrong. Grant only the tag mutations the chosen ownership model requires.

Permission separation is a backstop, not an excuse to keep incorrect kOps state. A cluster update that repeatedly attempts a forbidden shared-network mutation will still fail and obscure legitimate operations.

## Keep Infrastructure-as-Code States Separate

The shared VPC should live in one network stack/state. Cluster stacks consume its outputs as IDs.

Do not import the same VPC, subnet, NAT, or route table as an owned resource into every cluster's Terraform state. Multiple Terraform states that each believe they own one AWS object can plan conflicting updates and deletion.

For kOps Terraform output, keep kOps state as the source of desired cluster configuration and represent shared network objects as externally provided IDs. Do not edit generated Terraform to convert ownership ad hoc; the next kOps generation can overwrite the edit.

## Preview Updates for Ownership Drift

Before every apply:

```bash
kops update cluster payments.prod.example.com \
  --state s3://company-kops-state
```

Investigate any proposal involving:

- VPC or subnet creation;
- route tables or route-table associations;
- Internet or NAT gateway creation/deletion;
- changed subnet IDs or CIDRs;
- a shared-to-owned tag transition;
- another cluster's security groups or load balancers.

If Terraform applies the cloud resources, regenerate and inspect `terraform plan` instead of using direct `--yes`.

## Preview Deletion Before Every Approval

Use the exact cluster and state store:

```bash
kops delete cluster payments.prod.example.com \
  --state s3://company-kops-state
```

The preview should include cluster-specific ASGs, launch templates, IAM objects, load balancers, security groups, DNS records, and etcd storage as appropriate. It should exclude the shared VPC, subnets, route tables, Internet Gateway, NAT gateways, and egress appliances.

Also inspect workload-created resources. Kubernetes controllers can create load balancers, target groups, security-group rules, and volumes that kOps did not create directly. Decommission workloads cleanly and decide which retained data volumes need manual lifecycle handling.

Practice the full deletion workflow using disposable clusters in the same shared VPC before relying on it for production. A successful creation test does not prove deletion boundaries.

## Multi-Cluster Safety Checklist

- Does each Cluster spec contain the existing `networkID`?
- Does every shared subnet entry contain its exact `id`?
- If subnet IDs are supplied, are the external routes already configured; otherwise, is egress intentionally kOps-created, referenced by ID, or declared `External`?
- Are shared tags `shared`, never `owned` by one cluster?
- Is one system responsible for common subnet role tags?
- Does each cluster have a unique name and explicit state-store argument?
- Are cluster-specific security groups, LBs, ASGs, and etcd volumes not shared?
- Are network deletion permissions absent from routine cluster automation?
- Does every update and deletion run begin with a reviewed preview?
- Has deletion been rehearsed in a disposable cluster?

The strongest boundary combines declarative IDs, independent IaC states, restricted IAM, and deletion previews. No single tag should carry the entire safety case for a shared VPC.

## Official Documentation

- [kOps: Run in an existing VPC](https://kops.sigs.k8s.io/run_in_existing_vpc/)
- [kOps: Cluster resource subnet keys](https://kops.sigs.k8s.io/cluster_spec/#clusterspec-subnet-keys)
- [kOps: State store](https://kops.sigs.k8s.io/state/)
- [kOps: Delete cluster CLI](https://kops.sigs.k8s.io/cli/kops_delete_cluster/)
- [kOps: Terraform target](https://kops.sigs.k8s.io/terraform/)
- [AWS: Sharing VPC subnets](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-sharing.html)
- [AWS: Tagging Amazon EC2 resources](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html)
- [AWS: Security best practices in IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
