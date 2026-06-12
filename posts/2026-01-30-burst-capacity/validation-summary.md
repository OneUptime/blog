# Validation Summary: How to Implement Burst Capacity

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- AWS Auto Scaling
- Amazon EC2 burstable and Spot Instances
- Terraform AWS provider
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Cluster Autoscaler
- AWS Node Termination Handler
- Amazon CloudFront
- Amazon SQS
- AWS SDK for JavaScript v3
- AWS Budgets and Amazon SNS

## Sources Consulted
- Terraform AWS provider documentation for `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider documentation for `aws_autoscaling_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_policy
- Amazon EC2 burstable performance instances documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances-unlimited-mode.html
- Amazon EKS managed node group capacity type documentation: https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html
- Kubernetes Horizontal Pod Autoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Cluster Autoscaler AWS cloud provider documentation: https://github.com/kubernetes/autoscaler/blob/master/cluster-autoscaler/cloudprovider/aws/README.md
- AWS Node Termination Handler documentation: https://github.com/aws/aws-node-termination-handler
- Amazon SQS FIFO message deduplication documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html
- Amazon SQS message group ID documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagegroupid-property.html
- Amazon CloudFront cache policy documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html
- AWS CloudFormation `AWS::Budgets::Budget` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-budgets-budget.html
- AWS Budgets SNS topic policy documentation: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-sns-policy.html

## Issues Found
- The Cluster Autoscaler example used a ConfigMap with autoscaler settings, but Cluster Autoscaler uses command-line flags for these options. Changed the snippet to a Deployment-style example with container args and removed the unsupported `scale-up-from-zero` entry.
- The Cluster Autoscaler Deployment snippet needed the required `spec.selector` and matching pod template labels for `apps/v1`. Added those fields.
- The Spot interruption handler used the old Docker Hub image and a non-EKS spot node label. Updated the image to the current public ECR repository and changed the selector/toleration to the EKS managed node group capacity label.
- The CloudFront default cache behavior mixed `forwarded_values` and `cache_policy_id`, which Terraform treats as mutually exclusive configuration paths. Removed the legacy forwarding/TTL fields from the behavior and left TTL/cache-key settings in the cache policy.
- The CloudFront cache policy explicitly whitelisted `Accept-Encoding` while also enabling gzip and Brotli cache handling. Removed `Accept-Encoding` from the explicit header list because CloudFront handles normalized `Accept-Encoding` automatically when those settings are enabled.
- The SQS TypeScript example imported and initialized SNS client code that was unused. Removed the unused import and member.
- The SQS example used FIFO queue deduplication fields without making the FIFO requirement clear. Updated the comment and ensured `MessageDeduplicationId` has a fallback value.
- The Budgets/SNS CloudFormation snippet referenced an undefined Lambda function subscription and lacked the SNS topic policy required for AWS Budgets to publish to the topic. Removed the undefined Lambda subscription and added an `AWS::SNS::TopicPolicy` allowing `budgets.amazonaws.com` to publish from the same account.

## Review Notes
- Several snippets remain intentionally abbreviated and require environment-specific values such as cluster name, IAM/RBAC, VPC subnet IDs, AMI ID, and load balancer wiring before production use.
- The AWS Node Termination Handler documentation notes that EKS managed node groups already handle Spot interruption draining; NTH is still relevant for self-managed node groups or queue-processor scenarios.
