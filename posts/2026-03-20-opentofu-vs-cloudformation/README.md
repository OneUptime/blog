# OpenTofu vs CloudFormation: Which Should You Use?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, CloudFormation, AWS, Comparison, Infrastructure as Code, DevOps

Description: Compare OpenTofu and AWS CloudFormation - their syntax, multi-cloud support, drift detection, and team fit - to choose the right IaC tool for AWS infrastructure.

## Introduction

For AWS infrastructure, both OpenTofu and CloudFormation are viable choices. CloudFormation is AWS-native and deeply integrated with the AWS control plane. OpenTofu is multi-cloud and uses the Terraform provider ecosystem. Understanding the tradeoffs helps you choose the right tool for your workload.

## Syntax Comparison

OpenTofu (HCL):

```hcl
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name        = "prod-vpc"
    Environment = "production"
  }
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"

  tags = { Name = "prod-public-subnet" }
}
```

CloudFormation (YAML):

```yaml
Resources:
  MainVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: prod-vpc
        - Key: Environment
          Value: production

  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref MainVPC
      CidrBlock: 10.0.1.0/24
      Tags:
        - Key: Name
          Value: prod-public-subnet
```

## Comparison Matrix

| Feature | OpenTofu | CloudFormation |
|---------|----------|---------------|
| Language | HCL | JSON/YAML |
| Multi-cloud | Yes | No (AWS only) |
| Provider coverage | 3,000+ providers | AWS only |
| State management | .tfstate files | Managed by AWS |
| Drift detection | Manual (`tofu plan`) | Automatic (CloudFormation drift) |
| Rollback | Manual state operations | Automatic stack rollback |
| Resource coverage | All AWS resources via provider | All AWS resources natively |
| Custom resources | Provider plugins | Lambda-backed custom resources |
| Cost | Free | Free |
| License | MPL 2.0 | Proprietary (AWS) |
| StackSets | Terragrunt/multi-dir | CloudFormation StackSets |

## When OpenTofu Wins

**Multi-cloud requirements** - If you need to manage AWS alongside Azure, GCP, or other providers, OpenTofu manages everything from one tool.

**Richer HCL syntax** - HCL is more readable and concise than CloudFormation YAML/JSON, especially for complex resources.

**Module ecosystem** - The Terraform Registry has thousands of pre-built, tested modules for common AWS patterns.

**Community tooling** - Checkov, tfsec, tflint, Infracost all work with OpenTofu.

## When CloudFormation Wins

**AWS-native integration** - CloudFormation stacks integrate deeply with AWS services: Service Catalog, Organizations, Control Tower, and CodePipeline.

**Automatic rollback** - CloudFormation automatically rolls back failed deployments. OpenTofu requires manual intervention on failure.

**No state file management** - CloudFormation manages state internally. With OpenTofu, you must manage the state backend (S3, DynamoDB).

**StackSets** - CloudFormation StackSets deploy the same template across multiple accounts and regions natively. OpenTofu requires Terragrunt or custom orchestration.

**AWS-only shops** - If you'll never leave AWS, CloudFormation's native integration reduces operational overhead.

## Importing Existing CloudFormation Resources into OpenTofu

```bash
# Import a CloudFormation-managed VPC into OpenTofu

tofu import aws_vpc.main vpc-12345678

# After import, tofu plan should show no changes
tofu plan
```

## Migrating from CloudFormation to OpenTofu

```bash
# Use former2 to generate OpenTofu from existing AWS resources
npm install -g former2  # or use the web interface at former2.com

# Export resources to OpenTofu HCL
former2 generate --services EC2 --output-terraform output.tf
```

## Conclusion

OpenTofu is the better choice for multi-cloud environments, teams that value a rich module ecosystem, and organizations that prefer HCL's concise syntax. CloudFormation is the better choice for AWS-only environments that need deep AWS service integration, automatic rollback, and StackSets for multi-account deployments. Many AWS-native organizations use CloudFormation for account vending and control plane setup, with OpenTofu managing application infrastructure.
