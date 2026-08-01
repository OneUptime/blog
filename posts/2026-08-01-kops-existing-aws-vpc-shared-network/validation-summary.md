# Validation Summary: Run kOps in an Existing AWS VPC Without Recreating Network Resources

## Status
validated

## Post Type
Technical guide / operational reference

## Technologies Covered
- kOps
- Kubernetes
- AWS VPC
- AWS CLI
- AWS subnets and route tables
- AWS Internet Gateways, NAT gateways, NAT instances, and Transit Gateways
- AWS VPC DNS attributes
- Kubernetes and AWS load-balancer subnet tags

## Sources Consulted
- kOps existing VPC guidance: https://kops.sigs.k8s.io/run_in_existing_vpc/
- kOps Cluster resource subnet and egress fields: https://kops.sigs.k8s.io/cluster_spec/#clusterspec-subnet-keys
- kOps network topology and subnet types: https://kops.sigs.k8s.io/topology/
- kOps `create cluster` CLI reference: https://kops.sigs.k8s.io/cli/kops_create_cluster/
- kOps `update cluster` CLI reference: https://kops.sigs.k8s.io/cli/kops_update_cluster/
- kOps `validate cluster` CLI reference: https://kops.sigs.k8s.io/cli/kops_validate_cluster/
- kOps `delete cluster` CLI reference: https://kops.sigs.k8s.io/cli/kops_delete_cluster/
- kOps v1.36.1 AWS network model source: https://github.com/kubernetes/kops/blob/v1.36.1/pkg/model/awsmodel/network.go
- kOps v1.36.1 AWS VPC task source: https://github.com/kubernetes/kops/blob/v1.36.1/upup/pkg/fi/cloudup/awstasks/vpc.go
- kOps v1.36.1 AWS NAT gateway task source: https://github.com/kubernetes/kops/blob/v1.36.1/upup/pkg/fi/cloudup/awstasks/natgateway.go
- AWS VPC DNS attributes: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-dns.html
- AWS CLI `describe-vpc-attribute`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpc-attribute.html
- AWS CLI `describe-vpcs`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpcs.html
- AWS CLI `describe-subnets`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-subnets.html
- AWS CLI `describe-route-tables`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- AWS VPC route tables: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html
- AWS NAT gateways: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- AWS regional NAT gateways: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- **The shared-VPC DNS requirement was attributed to the wrong attribute.** The post said kOps detects `enableDnsHostnames=false` and refuses to change it. Current kOps checks `enableDnsSupport` for shared VPCs and fails rather than enabling it automatically, while the existing-VPC guide separately continues to instruct operators to enable DNS hostnames. Updated the explanation to distinguish the implementation check from the guide and retained commands to inspect both attributes.
- **The externally managed egress example marked only a private subnet.** kOps treats `External` per subnet and skips its Internet Gateway model only when all applicable subnets are unmanaged. Added the utility subnet to the example and instructed readers to set `External` on every subnet whose egress kOps should ignore.
- **The NAT gateway explanation was no longer universally true after AWS introduced regional NAT gateways.** The kOps documentation and current NAT gateway task implement the traditional zonal NAT pattern. Qualified the example and explanation as applying to an existing zonal NAT gateway instead of claiming every NAT gateway lives in a public subnet.

## Review Notes
- The `--network-id`, `--topology`, `--subnets`, `--utility-subnets`, and `--disable-subnet-tags` flags are current and correctly used.
- The `networkID`, subnet `id`, subnet `type`, subnet `egress`, `networkCIDR`, `cidr`, and `zone` fields are valid kOps cluster-spec fields. Existing NAT gateway, NAT instance, Transit Gateway, and `External` egress values are supported forms; support should still be checked against the kOps release used to operate the cluster.
- kOps requires all subnets or no subnets to be pre-created in this workflow. When all subnet entries have IDs, kOps does not create route tables or repair existing subnet routing.
- The documented default subnet tags and the `shared` ownership value are correct. `--disable-subnet-tags` prevents kOps from applying them to existing subnets, leaving their management to the external infrastructure owner.
- `kops update cluster` and `kops delete cluster` without `--yes` are valid previews. The `kops validate cluster "$CLUSTER_NAME" --wait 15m` and `kubectl get` commands are also valid.
- All external links in the post resolved to the intended official kOps or AWS documentation during validation.
