# How to Organize Large CloudFormation Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Infrastructure as Code, DevOps

Description: Practical strategies for organizing large CloudFormation projects using nested stacks, cross-stack references, and modular template design patterns.

---

A single CloudFormation template works fine when you're deploying a handful of resources. But as your infrastructure grows, that one-file approach turns into a maintenance nightmare. Templates balloon to thousands of lines, deployments take forever, and a small change in one section risks breaking something completely unrelated.

I've seen teams struggle with 5,000-line templates that nobody wants to touch. The fix isn't complicated, but it does require some upfront thinking about project structure. Let's walk through the strategies that actually work for organizing large CloudFormation projects.

## The Monolith Problem

Before we get into solutions, let's understand why monolithic templates cause headaches. CloudFormation has a hard limit of 500 resources per stack. But you'll hit practical limits long before that - deployment times grow linearly with resource count, rollbacks take longer, and the blast radius of any change is the entire stack.

There's also a 1MB template body limit for S3-hosted templates (51,200 bytes for direct uploads). When you hit these limits, you know it's time to split things up.

## Project Directory Structure

Here's a directory structure that scales well for large projects.

```
infrastructure/
  cloudformation/
    main/
      vpc.yaml
      security-groups.yaml
      iam-roles.yaml
    compute/
      ecs-cluster.yaml
      autoscaling.yaml
      load-balancer.yaml
    data/
      rds.yaml
      elasticache.yaml
      s3-buckets.yaml
    monitoring/
      alarms.yaml
      dashboards.yaml
    shared/
      parameters.yaml
      mappings.yaml
    scripts/
      deploy.sh
      validate.sh
    config/
      dev.json
      staging.json
      production.json
    master.yaml
```

Each subdirectory corresponds to a domain or layer in your architecture. Templates within each directory handle a specific piece of infrastructure.

## Nested Stacks

Nested stacks are the most common way to break up large templates. A parent template references child templates, and CloudFormation manages the relationships.

Here's a parent template that pulls together nested stacks for a typical web application.

```yaml
# master.yaml - Parent template orchestrating nested stacks
AWSTemplateFormatVersion: "2010-09-09"
Description: Master stack for web application infrastructure

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, production]
  TemplateBucketUrl:
    Type: String
    Description: S3 URL where child templates are stored

Resources:
  # Network layer
  VpcStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: !Sub "${TemplateBucketUrl}/main/vpc.yaml"
      Parameters:
        Environment: !Ref Environment
      Tags:
        - Key: Layer
          Value: network

  # Data layer - depends on VPC being ready
  DatabaseStack:
    Type: AWS::CloudFormation::Stack
    DependsOn: VpcStack
    Properties:
      TemplateURL: !Sub "${TemplateBucketUrl}/data/rds.yaml"
      Parameters:
        Environment: !Ref Environment
        VpcId: !GetAtt VpcStack.Outputs.VpcId
        PrivateSubnetIds: !GetAtt VpcStack.Outputs.PrivateSubnetIds
      Tags:
        - Key: Layer
          Value: data

  # Compute layer - depends on VPC and data
  ComputeStack:
    Type: AWS::CloudFormation::Stack
    DependsOn:
      - VpcStack
      - DatabaseStack
    Properties:
      TemplateURL: !Sub "${TemplateBucketUrl}/compute/ecs-cluster.yaml"
      Parameters:
        Environment: !Ref Environment
        VpcId: !GetAtt VpcStack.Outputs.VpcId
        PublicSubnetIds: !GetAtt VpcStack.Outputs.PublicSubnetIds
        DatabaseEndpoint: !GetAtt DatabaseStack.Outputs.DatabaseEndpoint
```

The child VPC template exports the values that other stacks need.

```yaml
# main/vpc.yaml - VPC child template
AWSTemplateFormatVersion: "2010-09-09"
Description: VPC and networking resources

Parameters:
  Environment:
    Type: String

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub "${Environment}-vpc"

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs ""]

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs ""]

  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.10.0/24
      AvailabilityZone: !Select [0, !GetAZs ""]

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.11.0/24
      AvailabilityZone: !Select [1, !GetAZs ""]

# Outputs make values available to the parent stack
Outputs:
  VpcId:
    Value: !Ref VPC
  PublicSubnetIds:
    Value: !Join [",", [!Ref PublicSubnet1, !Ref PublicSubnet2]]
  PrivateSubnetIds:
    Value: !Join [",", [!Ref PrivateSubnet1, !Ref PrivateSubnet2]]
```

## Cross-Stack References

For resources that don't have a parent-child relationship, cross-stack references let stacks share values through CloudFormation exports.

```yaml
# Stack A exports a value
Outputs:
  SharedVpcId:
    Value: !Ref VPC
    Export:
      Name: !Sub "${Environment}-vpc-id"

# Stack B imports the value
Resources:
  MySecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      VpcId: !ImportValue
        Fn::Sub: "${Environment}-vpc-id"
```

A word of caution - cross-stack references create implicit dependencies. You can't delete or modify an exported value if another stack is importing it. This can make stack updates tricky. For this reason, I prefer passing values through parameters in nested stacks when possible.

## Environment-Specific Configuration

Use parameter files to manage environment differences. CloudFormation supports JSON parameter files that you pass at deploy time.

```json
// config/production.json
[
  {
    "ParameterKey": "Environment",
    "ParameterValue": "production"
  },
  {
    "ParameterKey": "InstanceType",
    "ParameterValue": "r5.xlarge"
  },
  {
    "ParameterKey": "MinCapacity",
    "ParameterValue": "3"
  },
  {
    "ParameterKey": "MaxCapacity",
    "ParameterValue": "20"
  }
]
```

```json
// config/dev.json
[
  {
    "ParameterKey": "Environment",
    "ParameterValue": "dev"
  },
  {
    "ParameterKey": "InstanceType",
    "ParameterValue": "t3.small"
  },
  {
    "ParameterKey": "MinCapacity",
    "ParameterValue": "1"
  },
  {
    "ParameterKey": "MaxCapacity",
    "ParameterValue": "2"
  }
]
```

Deploy with the appropriate config file.

```bash
# Deploy to production using the production config
aws cloudformation deploy \
  --template-file master.yaml \
  --stack-name myapp-production \
  --parameter-overrides file://config/production.json \
  --capabilities CAPABILITY_IAM
```

## Template Packaging and Upload

Before deploying nested stacks, child templates need to be uploaded to S3. The `aws cloudformation package` command handles this automatically.

```bash
# Package templates - uploads nested templates to S3 and rewrites URLs
aws cloudformation package \
  --template-file master.yaml \
  --s3-bucket my-cfn-templates-bucket \
  --s3-prefix cloudformation/v1.2.3 \
  --output-template-file packaged.yaml

# Deploy the packaged template
aws cloudformation deploy \
  --template-file packaged.yaml \
  --stack-name myapp-production \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

## Deployment Script

A deployment script ties everything together and ensures consistent deployments across environments.

```bash
#!/bin/bash
# scripts/deploy.sh - Deploy the full infrastructure stack
set -euo pipefail

ENVIRONMENT=${1:?Usage: deploy.sh <environment>}
STACK_NAME="myapp-${ENVIRONMENT}"
TEMPLATE_BUCKET="mycompany-cfn-templates"
VERSION=$(git rev-parse --short HEAD)

echo "Deploying ${STACK_NAME} (version: ${VERSION})"

# Validate all templates first
echo "Validating templates..."
cfn-lint cloudformation/**/*.yaml

# Package and upload nested templates
echo "Packaging templates..."
aws cloudformation package \
  --template-file cloudformation/master.yaml \
  --s3-bucket "${TEMPLATE_BUCKET}" \
  --s3-prefix "${STACK_NAME}/${VERSION}" \
  --output-template-file /tmp/packaged.yaml

# Deploy with environment-specific parameters
echo "Deploying stack..."
aws cloudformation deploy \
  --template-file /tmp/packaged.yaml \
  --stack-name "${STACK_NAME}" \
  --parameter-overrides file://cloudformation/config/${ENVIRONMENT}.json \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
  --tags Environment="${ENVIRONMENT}" Version="${VERSION}"

echo "Deployment complete!"
```

## Shared Mappings and Conditions

Extract common mappings (like AMI IDs per region) into shared files that you include via nested stacks or copy into templates at build time.

```yaml
# shared/mappings.yaml - Centralized AMI mappings
Mappings:
  RegionAMI:
    us-east-1:
      HVM64: ami-0abcdef1234567890
    us-west-2:
      HVM64: ami-0fedcba0987654321
    eu-west-1:
      HVM64: ami-0123456789abcdef0
  EnvironmentConfig:
    dev:
      LogLevel: DEBUG
      RetentionDays: 7
    staging:
      LogLevel: INFO
      RetentionDays: 30
    production:
      LogLevel: WARN
      RetentionDays: 365
```

## When to Split vs. When to Keep Together

Not everything should be in its own stack. Here's a practical guideline. Resources that change together should live together. Your ECS task definition and its associated IAM role probably belong in the same template. But your VPC and your application code definitely don't.

Resources that have different lifecycles should be in separate stacks. Your network infrastructure might change once a quarter, but your application deployment might happen multiple times a day. Separating them means faster deployments and smaller blast radius.

If you're looking to validate that everything is working after deploying these organized stacks, consider using [cfn-lint](https://oneuptime.com/blog/post/cloudformation-linter-cfn-lint/view) to catch problems before deployment, and set up monitoring to catch issues after deployment.

The bottom line is this: start splitting templates early. It's much easier to organize a project from the beginning than to untangle a monolithic template later. Even if your infrastructure is small today, setting up a clean structure now will save you hours of refactoring down the road.
