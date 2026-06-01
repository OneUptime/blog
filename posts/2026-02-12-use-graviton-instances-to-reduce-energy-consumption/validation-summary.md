# Validation Summary: How to Use Graviton Instances to Reduce Energy Consumption

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Graviton
- Amazon EC2
- Amazon RDS
- Amazon ElastiCache
- Amazon OpenSearch Service
- AWS Lambda
- Amazon EKS
- Amazon ECS
- Docker and Buildx
- Kubernetes node affinity
- Python packaging
- Node.js native add-ons
- Java JNI
- Terraform
- CloudFormation
- Amazon CloudWatch
- AWS Customer Carbon Footprint Tool

## Sources Consulted
- AWS Graviton performance testing whitepaper: https://docs.aws.amazon.com/whitepapers/latest/aws-graviton-performance-testing/what-is-aws-graviton.html
- AWS News Blog, Amazon EC2 C7g instances powered by AWS Graviton3: https://aws.amazon.com/blogs/aws/new-amazon-ec2-c7g-instances-powered-by-aws-graviton3-processors/
- AWS Lambda pricing: https://aws.amazon.com/lambda/pricing/
- AWS Lambda Graviton2 launch post: https://aws.amazon.com/blogs/aws/aws-lambda-functions-powered-by-aws-graviton2-processor-run-your-functions-on-arm-and-get-up-to-34-better-price-performance/
- AWS CLI `ec2 run-instances` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI `eks create-nodegroup` reference: https://docs.aws.amazon.com/cli/latest/reference/eks/create-nodegroup.html
- Amazon EKS optimized AMI documentation: https://docs.aws.amazon.com/eks/latest/userguide/eks-optimized-ami.html
- Amazon EKS AL2 AMI deprecation FAQ: https://docs.aws.amazon.com/eks/latest/userguide/eks-ami-deprecation-faqs.html
- AWS Customer Carbon Footprint Tool overview: https://aws.amazon.com/aws-cost-management/aws-customer-carbon-footprint-tool/
- AWS Billing documentation for Customer Carbon Footprint Tool: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ccft-overview.html
- Docker Build variables documentation: https://docs.docker.com/build/building/variables/
- Kubernetes node labels documentation: https://kubernetes.io/docs/reference/labels-annotations-taints/
- pip install documentation: https://pip.pypa.io/en/stable/cli/pip_install/
- TensorFlow pip installation documentation: https://www.tensorflow.org/install/pip
- PyTorch installation documentation: https://pytorch.org/get-started/locally/
- Terraform AWS provider `aws_ssm_parameter` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- Boto3 CloudWatch `put_dashboard` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch/client/put_dashboard.html

## Issues Found
- The post said Arm inherently requires fewer transistors to execute instructions than x86 and that this directly translates to lower power consumption. This was too broad and architecture-theoretical rather than an AWS-documented claim, so it was changed to AWS Graviton being purpose-built for cloud workloads and energy efficiency.
- The post said Graviton energy savings show up in AWS Customer Carbon Footprint Tool data when workloads are migrated. AWS documents CCFT as estimated emissions by service and Region, not per-instance energy measurement, so the wording was corrected to reflect that granularity.
- The post said the "g" in an instance name indicates Graviton. This is not universally true across all EC2 families, so it was narrowed to the listed family suffixes such as `g`, `gd`, and `gn`.
- The TensorFlow and PyTorch ARM version claims were outdated or imprecise. TensorFlow Linux AArch64 CPU builds are documented for TensorFlow 2.10 and later through AWS-maintained packages, and PyTorch Linux AArch64 wheels are available for current releases, so those bullets were updated.
- The EKS managed node group command used `AL2_ARM_64`. Amazon EKS stopped publishing EKS-optimized AL2 AMIs after November 26, 2025, and current managed node groups should use AL2023 or Bottlerocket for supported Kubernetes versions. The command was updated to `AL2023_ARM_64_STANDARD`.
- The Docker troubleshooting note said to always specify `--platform linux/arm64` in the Dockerfile `FROM` line. That advice is too absolute for multi-architecture builds, so it was changed to distinguish single-architecture ARM builds from multi-architecture images that use `$TARGETPLATFORM` and a multi-arch manifest.

## Review Notes
The remaining examples are illustrative and omit environment-specific prerequisites such as IAM permissions, VPC details, launch templates, and actual account resource IDs. The AWS CLI was not installed in the local environment, so AWS CLI syntax was verified against official AWS CLI documentation rather than local `aws --help` output.
