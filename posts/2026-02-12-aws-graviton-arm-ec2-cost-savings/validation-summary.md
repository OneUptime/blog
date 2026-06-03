# Validation Summary: How to Use AWS Graviton (ARM) EC2 Instances for Cost Savings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Graviton
- Amazon EC2
- AWS CLI
- AWS Price List API
- Amazon Linux 2023
- Docker and Docker Buildx
- Terraform AWS provider
- Amazon Corretto and Java
- Python, NumPy, SciPy, and pandas
- Elastic Load Balancing

## Sources Consulted
- AWS Graviton product page: https://aws.amazon.com/ec2/graviton/
- AWS Graviton getting started guide: https://aws.amazon.com/ec2/graviton/getting-started/
- Amazon EC2 instance types documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-types.html
- AWS CLI pricing get-products reference: https://docs.aws.amazon.com/cli/latest/reference/pricing/get-products.html
- AWS CLI EC2 describe-images reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-images.html
- AWS CLI EC2 run-instances reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI ELBv2 register-targets reference: https://docs.aws.amazon.com/cli/latest/reference/elbv2/register-targets.html
- AWS public EC2 price list for us-east-1: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonEC2/current/us-east-1/index.json
- Docker manifest inspect reference: https://docs.docker.com/reference/cli/docker/manifest/inspect/
- Docker Buildx build reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- Terraform AWS provider aws_ami data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Amazon Corretto 17 documentation: https://docs.aws.amazon.com/corretto/latest/corretto-17-ug/what-is-corretto-17.html

## Issues Found
- The post described Graviton as delivering "20-40% cost savings" for most workloads. AWS documents up to 40% better price-performance, while direct hourly cost savings vary, so the wording was changed to "20-40% better price-performance" and "many workloads."
- The instance-family naming explanation said any "g" in an instance type means Graviton. This was too broad, so it was narrowed to a lowercase "g" after the generation number usually indicating Graviton.
- The pricing discussion said per-hour pricing differences are consistently around 20%. Current public EC2 On-Demand Linux pricing in us-east-1 shows the examples are closer to roughly 15-20%, so the wording was corrected.
- The AWS Pricing CLI example only showed the x86 query and printed raw terms. It was replaced with a reusable function that queries both instance types and extracts the On-Demand hourly price.
- The Amazon Linux 2023 AMI lookup relied on the AMI name pattern alone. An explicit `architecture=arm64` filter was added to both the AWS CLI and Terraform examples.
- The Java section overstated specific Corretto Graviton optimizations and included an incorrect cache-line comment. The wording was corrected to AWS-tested and tuned Corretto support, and the large-pages example now says to test it with workload and OS settings.
- The Python section said NumPy would automatically use ARM-optimized BLAS. This was narrowed to recent ARM64 wheels and tuned BLAS libraries being able to provide a performance boost.
- The monthly cost table used outdated or incorrect values. It was updated using current us-east-1 public EC2 On-Demand Linux rates and now states the 730-hours-per-month assumption.
- The "When Not to Use Graviton" section said Graviton supports some macOS workloads. Graviton EC2 instances support Linux, not macOS or Windows, so this was corrected.
- The wrap-up described a "20-40% improvement" generally. It was changed to "up to 40% better price-performance" to match AWS's documented claim.

## Review Notes
The local environment did not have the AWS CLI installed, so AWS CLI command flags were validated against the official AWS CLI command reference instead of local `aws --help` output. Docker command availability was checked locally where possible and against Docker documentation.
