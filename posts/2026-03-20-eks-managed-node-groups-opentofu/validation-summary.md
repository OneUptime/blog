# Validation Summary: How to Configure EKS Managed Node Groups with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Identity and Access Management (IAM)
- Amazon EKS managed node groups
- Amazon EC2 launch templates
- Kubernetes labels and taints

## Sources Consulted
- Amazon EKS node IAM role: https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html
- Customize managed nodes with launch templates: https://docs.aws.amazon.com/eks/latest/userguide/launch-templates.html
- Simplify node lifecycle with managed node groups: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- Update a managed node group for your cluster: https://docs.aws.amazon.com/eks/latest/userguide/update-managed-node-group.html
- OpenTofu `init`: https://opentofu.org/docs/cli/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/
- `aws_eks_node_group` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_node_group.html.markdown

## Issues Found
- The introduction implied that AWS handles node patching automatically. I changed it to say Amazon EKS manages node updates when you initiate a node group update, which matches the current EKS update workflow.
- The prerequisites omitted IAM permissions even though the example creates IAM roles and policy attachments. I added IAM permissions to the prerequisite list.
- The IAM example used `AmazonEC2ContainerRegistryReadOnly`, but current EKS node role guidance calls for `AmazonEC2ContainerRegistryPullOnly`. I updated the policy ARN and the attachment name accordingly.
- The comment above the IAM attachments said the listed policies were required for all worker nodes. I narrowed that guidance to a simple IPv4 setup and marked the SSM policy as optional, because `AmazonSSMManagedInstanceCore` is not required for managed node groups.
- The `aws_eks_node_group` examples did not declare the explicit dependency on the IAM role policy attachments that the AWS provider documentation recommends. I added `depends_on` to both node groups so the example creates and destroys resources in a safe order.

## Review Notes
- The launch template example is technically valid: EKS supports setting `http_tokens = "required"` and a metadata response hop limit of `2`, and AWS documents hop limit `2` for workloads that need IMDSv2 access from containers.
- The managed node group example is also valid with a launch template plus multiple `instance_types`, because the launch template does not set an instance type. AWS documents that combination as supported.
- For production setups, AWS recommends assigning the VPC CNI permissions to a separate role used by the `aws-node` service account instead of attaching `AmazonEKS_CNI_Policy` to the node role. The post now scopes the example to a simple IPv4 setup, but that separation would still be a worthwhile future improvement.
