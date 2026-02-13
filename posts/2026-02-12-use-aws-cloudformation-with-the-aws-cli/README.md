# How to Use AWS CloudFormation with the AWS CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, CLI, Infrastructure as Code

Description: Master AWS CloudFormation through the CLI with practical examples covering stack creation, updates, change sets, parameters, outputs, and troubleshooting failed deployments.

---

CloudFormation is AWS's native infrastructure-as-code tool. You define your infrastructure in YAML or JSON templates, and CloudFormation creates and manages the resources for you. While the console works for one-off stacks, the CLI is where CloudFormation becomes truly powerful - you can integrate it into scripts, CI/CD pipelines, and automated workflows.

Let's cover everything you need to work with CloudFormation effectively from the command line.

## Your First Stack

Start with a simple template that creates an S3 bucket. Save this as `template.yml`:

```yaml
# template.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: A simple S3 bucket with versioning enabled

Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub '${AWS::StackName}-storage-${AWS::AccountId}'
      VersioningConfiguration:
        Status: Enabled
      Tags:
        - Key: Environment
          Value: production

Outputs:
  BucketName:
    Description: Name of the created S3 bucket
    Value: !Ref MyBucket
    Export:
      Name: !Sub '${AWS::StackName}-BucketName'

  BucketArn:
    Description: ARN of the created S3 bucket
    Value: !GetAtt MyBucket.Arn
```

Create the stack using the CLI:

```bash
# Create a new stack
aws cloudformation create-stack \
  --stack-name my-storage-stack \
  --template-body file://template.yml \
  --region us-east-1

# Wait for the stack creation to complete
aws cloudformation wait stack-create-complete \
  --stack-name my-storage-stack

# Check the stack status
aws cloudformation describe-stacks \
  --stack-name my-storage-stack \
  --query 'Stacks[0].StackStatus' \
  --output text
```

## Using Parameters

Most real-world templates use parameters to make them reusable across environments. Here's a more practical template:

```yaml
# vpc-template.yml
AWSTemplateFormatVersion: '2010-09-09'
Description: VPC with public and private subnets

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues:
      - dev
      - staging
      - production
    Description: Deployment environment

  VpcCidr:
    Type: String
    Default: 10.0.0.0/16
    Description: CIDR block for the VPC

  EnableNatGateway:
    Type: String
    Default: 'false'
    AllowedValues:
      - 'true'
      - 'false'
    Description: Whether to create a NAT Gateway

Conditions:
  CreateNatGateway: !Equals [!Ref EnableNatGateway, 'true']

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCidr
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-vpc'
        - Key: Environment
          Value: !Ref Environment

  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [0, !Cidr [!Ref VpcCidr, 4, 8]]
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-public-subnet-1'

  PrivateSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [1, !Cidr [!Ref VpcCidr, 4, 8]]
      AvailabilityZone: !Select [0, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-private-subnet-1'

Outputs:
  VpcId:
    Value: !Ref VPC
    Export:
      Name: !Sub '${AWS::StackName}-VpcId'
  PublicSubnetId:
    Value: !Ref PublicSubnet
  PrivateSubnetId:
    Value: !Ref PrivateSubnet
```

Pass parameters when creating the stack:

```bash
# Create stack with parameters
aws cloudformation create-stack \
  --stack-name production-vpc \
  --template-body file://vpc-template.yml \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=VpcCidr,ParameterValue=10.0.0.0/16 \
    ParameterKey=EnableNatGateway,ParameterValue=true

# Or use a parameters file for cleaner commands
aws cloudformation create-stack \
  --stack-name production-vpc \
  --template-body file://vpc-template.yml \
  --parameters file://params-production.json
```

The parameters file format:

```json
[
  {
    "ParameterKey": "Environment",
    "ParameterValue": "production"
  },
  {
    "ParameterKey": "VpcCidr",
    "ParameterValue": "10.0.0.0/16"
  },
  {
    "ParameterKey": "EnableNatGateway",
    "ParameterValue": "true"
  }
]
```

## Updating Stacks with Change Sets

Never update a production stack directly. Use change sets to preview what will change first.

Create a change set:

```bash
# Create a change set
aws cloudformation create-change-set \
  --stack-name production-vpc \
  --change-set-name update-vpc-cidr \
  --template-body file://vpc-template.yml \
  --parameters \
    ParameterKey=Environment,ParameterValue=production \
    ParameterKey=VpcCidr,ParameterValue=10.1.0.0/16

# Review the changes before applying
aws cloudformation describe-change-set \
  --stack-name production-vpc \
  --change-set-name update-vpc-cidr \
  --query 'Changes[].ResourceChange.{Action:Action,ResourceType:ResourceType,LogicalId:LogicalResourceId,Replacement:Replacement}' \
  --output table
```

The output shows what will be added, modified, or replaced. Pay close attention to the "Replacement" column - if it says "True", that resource will be destroyed and recreated.

Apply or delete the change set:

```bash
# Apply the change set if the changes look good
aws cloudformation execute-change-set \
  --stack-name production-vpc \
  --change-set-name update-vpc-cidr

# Or delete it if you changed your mind
aws cloudformation delete-change-set \
  --stack-name production-vpc \
  --change-set-name update-vpc-cidr
```

## Querying Stack Information

Get information about your stacks:

```bash
# List all stacks
aws cloudformation list-stacks \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query 'StackSummaries[].{Name:StackName,Status:StackStatus,Created:CreationTime}' \
  --output table

# Get stack outputs (useful for cross-stack references)
aws cloudformation describe-stacks \
  --stack-name production-vpc \
  --query 'Stacks[0].Outputs' \
  --output table

# Get a specific output value
aws cloudformation describe-stacks \
  --stack-name production-vpc \
  --query 'Stacks[0].Outputs[?OutputKey==`VpcId`].OutputValue' \
  --output text

# List all resources in a stack
aws cloudformation list-stack-resources \
  --stack-name production-vpc \
  --query 'StackResourceSummaries[].{Type:ResourceType,LogicalId:LogicalResourceId,Status:ResourceStatus}' \
  --output table
```

## Troubleshooting Failed Stacks

When a stack fails, the first thing to check is the events:

```bash
# Get stack events to see what went wrong
aws cloudformation describe-stack-events \
  --stack-name my-failed-stack \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].{Resource:LogicalResourceId,Status:ResourceStatus,Reason:ResourceStatusReason}' \
  --output table
```

Common issues and how to fix them:

- **Resource already exists**: Add a unique suffix using `!Sub` with `AWS::StackName` or `AWS::AccountId`
- **Insufficient permissions**: Make sure your IAM user/role has permissions for all resource types in the template
- **Dependency errors**: Use `DependsOn` to explicitly order resource creation

## Validating Templates

Always validate your templates before deploying:

```bash
# Validate template syntax
aws cloudformation validate-template \
  --template-body file://template.yml

# For S3-hosted templates
aws cloudformation validate-template \
  --template-url https://s3.amazonaws.com/my-bucket/template.yml
```

## Deleting Stacks

Clean up stacks you no longer need:

```bash
# Delete a stack
aws cloudformation delete-stack \
  --stack-name my-old-stack

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete \
  --stack-name my-old-stack
```

If a stack gets stuck in DELETE_FAILED, you can skip certain resources:

```bash
# Delete stack while skipping problematic resources
aws cloudformation delete-stack \
  --stack-name my-stuck-stack \
  --retain-resources MyS3Bucket MyDynamoTable
```

## Using Templates with IAM Resources

If your template creates IAM roles or policies, you need the `--capabilities` flag:

```bash
# Deploy a template that creates IAM resources
aws cloudformation create-stack \
  --stack-name my-iam-stack \
  --template-body file://iam-template.yml \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

## Summary

CloudFormation through the CLI gives you repeatable, version-controlled infrastructure management. The key practices to remember: always use change sets for production updates, validate templates before deploying, use parameters to make templates reusable across environments, and check stack events when things go wrong. Once you've got the basics down, you can integrate these commands into CI/CD pipelines for fully automated infrastructure deployment. If you're looking for a more developer-friendly alternative, check out our guide on [using AWS CDK](https://oneuptime.com/blog/post/2026-02-12-use-aws-cdk-with-the-cli/view) which lets you define infrastructure with programming languages.
