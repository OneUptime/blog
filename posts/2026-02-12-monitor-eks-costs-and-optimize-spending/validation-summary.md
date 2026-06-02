# Validation Summary: How to Monitor EKS Costs and Optimize Spending

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon EKS
- AWS Cost Explorer and AWS Budgets
- AWS Cost Allocation Tags
- Amazon EC2 Spot Instances and eksctl managed node groups
- Kubecost
- Kubernetes HPA, VPA, Services, pod affinity, and topology-aware routing
- Karpenter NodePools
- Amazon VPC NAT gateways and VPC endpoints
- Amazon ECR and Amazon S3 gateway endpoints
- AWS Savings Plans

## Sources Consulted
- Amazon EKS pricing FAQ: https://aws.amazon.com/eks/faqs/
- AWS Cost Explorer `update-cost-allocation-tags-status` CLI reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ce/update-cost-allocation-tags-status.html
- AWS Cost Allocation Tags API announcement: https://aws.amazon.com/about-aws/whats-new/2022/06/aws-cost-allocation-tag-api/
- Kubecost Helm chart repository index: https://kubecost.github.io/cost-analyzer/index.yaml
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes topology-aware routing documentation: https://kubernetes.io/docs/concepts/services-networking/topology-aware-hints/
- eksctl Spot instances documentation: https://docs.aws.amazon.com/eks/latest/eksctl/spot-instances.html
- Karpenter NodePools documentation: https://karpenter.sh/v1.7/concepts/nodepools/
- Amazon ECR VPC endpoints documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- Amazon VPC NAT gateway pricing guidance: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- AWS CLI `create-budget` reference: https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html
- AWS CLI `get-savings-plans-purchase-recommendation` reference: https://docs.aws.amazon.com/cli/latest/reference/ce/get-savings-plans-purchase-recommendation.html

## Issues Found
- The cost allocation tag activation command repeated `--cost-allocation-tags-status` for each tag. The AWS CLI option is a list of `TagKey,Status` entries, so the command was changed to pass both entries under a single `--cost-allocation-tags-status` argument.
- The post said tags "flow through" to Cost Explorer reports. This was tightened to say activated cost allocation tags appear in Cost Explorer reports, matching AWS cost allocation tag behavior.
- The NAT gateway data processing price was presented as universal. This was changed to clarify that $0.045/GB is example pricing for many US regions and that NAT gateway pricing is region dependent.
- The ECR VPC endpoint example only created the `ecr.dkr` interface endpoint and S3 gateway endpoint. Amazon ECR private image pulls also need the `ecr.api` interface endpoint, so the missing endpoint command was added.

## Review Notes
The Kubernetes HPA, VPA, topology-aware routing, pod affinity, eksctl Spot node group, Karpenter capacity type, AWS Budget, Savings Plans recommendation, and cleanup commands are technically plausible against current documentation. The `kubectl get pods` custom-columns example only inspects the first container in each pod; that is acceptable for a simple example but should be expanded in a future revision for multi-container workloads.
