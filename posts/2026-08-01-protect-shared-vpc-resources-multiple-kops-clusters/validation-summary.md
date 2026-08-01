# Validation Summary: How to Keep Multiple kOps Clusters from Deleting Shared VPC Resources

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- kOps
- Kubernetes
- Amazon Web Services (AWS)
- Amazon VPC and VPC subnet sharing
- AWS IAM and AWS Organizations
- Amazon S3 state stores
- Terraform
- AWS Load Balancer Controller subnet discovery

## Sources Consulted

- [kOps v1.36.1 release](https://github.com/kubernetes/kops/releases/tag/v1.36.1)
- [kOps: Run in an existing VPC](https://kops.sigs.k8s.io/run_in_existing_vpc/)
- [kOps: Cluster resource and subnet keys](https://kops.sigs.k8s.io/cluster_spec/#clusterspec-subnet-keys)
- [kOps: Create cluster CLI](https://kops.sigs.k8s.io/cli/kops_create_cluster/)
- [kOps: Get clusters CLI](https://kops.sigs.k8s.io/cli/kops_get_clusters/)
- [kOps: Update cluster CLI](https://kops.sigs.k8s.io/cli/kops_update_cluster/)
- [kOps: Delete cluster CLI](https://kops.sigs.k8s.io/cli/kops_delete_cluster/)
- [kOps: State store](https://kops.sigs.k8s.io/state/)
- [kOps: Terraform target](https://kops.sigs.k8s.io/terraform/)
- [kOps v1.36.1 AWS network model source](https://github.com/kubernetes/kops/blob/v1.36.1/pkg/model/awsmodel/network.go)
- [AWS Load Balancer Controller: Subnet discovery](https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/deploy/subnet_discovery/)
- [AWS: Share VPC subnets with other accounts](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-sharing.html)
- [AWS: Tag Amazon EC2 resources](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Using_Tags.html)
- [AWS: Security best practices in IAM](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Organizations: Service control policy examples](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_examples.html)

## Issues Found

- The two complete-looking Cluster YAML examples omitted `spec.cloudProvider: aws`. kOps v1.36.1 rejects that input with an unknown-cloud-provider error, so `cloudProvider: aws` was added to both examples.
- The shared-subnet example placed existing NAT gateway IDs on subnets that also had `id` fields and attributed NAT ownership behavior to those egress values. In kOps v1.36.1, a subnet `id` marks the subnet as shared; kOps does not build NAT gateway or route-table tasks for that fully pre-created subnet. The NAT IDs were removed from the fully shared-subnet example, and the text now distinguishes externally routed pre-created subnets from the separate topology in which kOps creates the subnets and route tables but reuses an existing NAT gateway.
- The claim that omitting `egress` in a private topology can create a NAT gateway was too broad. It is true when kOps creates the private subnets, but not when every subnet has a pre-created `id`. The explanation and checklist were corrected accordingly, and the use of `egress: External` was clarified for externally managed routing.
- The post said kOps does not alter pre-created subnets, then later described automatic subnet tagging. The wording now says kOps does not alter their network configuration or create their route tables, while noting that the direct target can still add tags.
- Automatic tagging was described without distinguishing kOps targets. The guidance is now scoped to the direct target; generated Terraform treats shared subnet IDs as external values and does not manage those subnet resources or their tags.

## Review Notes

- Review was performed against kOps v1.36.1, the latest stable release on 2026-08-01. The `kops.k8s.io/v1alpha2` Cluster API, `networkID`, subnet `id`, `egress`, `--disable-subnet-tags`, `--state`, and preview-without-`--yes` usage remain valid.
- The `kops get cluster`, `kops update cluster`, and `kops delete cluster` forms and flags were also checked against the v1.36.1 binary help output.
- All YAML snippets parse successfully after correction. AWS resource IDs in the examples are placeholders and must be replaced with real IDs.
- All external links in the post returned successful HTTP responses during validation.
