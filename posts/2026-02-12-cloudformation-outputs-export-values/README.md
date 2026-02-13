# How to Use CloudFormation Outputs and Export Values

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Infrastructure as Code, DevOps

Description: Learn how to use CloudFormation Outputs to expose stack values and Export to share resources across stacks for modular infrastructure.

---

When you split your infrastructure across multiple CloudFormation stacks - and you should for any non-trivial setup - those stacks need to talk to each other. The networking stack creates a VPC, and the application stack needs that VPC ID. Outputs and Exports are how you wire things together.

## What Are Outputs?

Outputs are values that a stack exposes after it's created. They appear in the Console's Outputs tab, get returned by CLI commands, and can be referenced by other stacks.

Basic syntax:

```yaml
# Simple output that exposes the VPC ID
Outputs:
  VpcId:
    Description: The ID of the created VPC
    Value: !Ref MyVPC
```

Every output has:

- **Logical ID** (like `VpcId`) - the name you reference it by
- **Value** - what gets returned (required)
- **Description** - what it is (optional but recommended)
- **Export** - makes it available to other stacks (optional)
- **Condition** - only output if condition is true (optional)

## Reading Outputs

From the CLI:

```bash
# Get all outputs from a stack
aws cloudformation describe-stacks \
  --stack-name my-network-stack \
  --query 'Stacks[0].Outputs'

# Get a specific output value
aws cloudformation describe-stacks \
  --stack-name my-network-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`VpcId`].OutputValue' \
  --output text
```

Outputs are useful even without exports. You can pipe them into scripts:

```bash
# Use an output value in a script
VPC_ID=$(aws cloudformation describe-stacks \
  --stack-name my-network-stack \
  --query 'Stacks[0].Outputs[?OutputKey==`VpcId`].OutputValue' \
  --output text)

echo "VPC ID is: $VPC_ID"
```

## Exporting Values

To make an output available to other stacks, add the `Export` property:

```yaml
# Export values so other stacks can import them
Outputs:
  VpcId:
    Description: VPC ID for the shared network
    Value: !Ref MyVPC
    Export:
      Name: !Sub '${AWS::StackName}-VpcId'

  PublicSubnet1:
    Description: First public subnet
    Value: !Ref PublicSubnet1
    Export:
      Name: !Sub '${AWS::StackName}-PublicSubnet1'

  PrivateSubnet1:
    Description: First private subnet
    Value: !Ref PrivateSubnet1
    Export:
      Name: !Sub '${AWS::StackName}-PrivateSubnet1'
```

The export name must be unique within your AWS account and region. Using `${AWS::StackName}` as a prefix is a common pattern to avoid collisions.

## Importing Exported Values

In another stack, use `Fn::ImportValue` to reference an exported value:

```yaml
# Import VPC and subnet from the network stack
Resources:
  AppSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Application security group
      VpcId: !ImportValue network-stack-VpcId

  AppInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.micro
      SubnetId: !ImportValue network-stack-PrivateSubnet1
      SecurityGroupIds:
        - !Ref AppSecurityGroup
```

The string passed to `!ImportValue` must exactly match the export name from the source stack.

## A Full Cross-Stack Example

Let's build a two-stack setup: a network stack that creates the VPC and subnets, and an application stack that deploys into them.

The network stack:

```yaml
# network-stack.yaml - Creates VPC, subnets, and exports their IDs
AWSTemplateFormatVersion: '2010-09-09'
Description: Shared network infrastructure

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-vpc'

  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
      MapPublicIpOnLaunch: true

  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.10.0/24
      AvailabilityZone: !Select [0, !GetAZs '']

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.11.0/24
      AvailabilityZone: !Select [1, !GetAZs '']

Outputs:
  VpcId:
    Description: VPC ID
    Value: !Ref VPC
    Export:
      Name: !Sub '${AWS::StackName}-VpcId'

  PublicSubnets:
    Description: Public subnet IDs
    Value: !Join [',', [!Ref PublicSubnet1, !Ref PublicSubnet2]]
    Export:
      Name: !Sub '${AWS::StackName}-PublicSubnets'

  PrivateSubnets:
    Description: Private subnet IDs
    Value: !Join [',', [!Ref PrivateSubnet1, !Ref PrivateSubnet2]]
    Export:
      Name: !Sub '${AWS::StackName}-PrivateSubnets'
```

The application stack:

```yaml
# app-stack.yaml - Deploys into the network from the network stack
AWSTemplateFormatVersion: '2010-09-09'
Description: Application stack using shared network

Parameters:
  NetworkStackName:
    Type: String
    Default: network-stack
    Description: Name of the network stack to import from

Resources:
  ALB:
    Type: AWS::ElasticLoadBalancingV2::LoadBalancer
    Properties:
      Subnets: !Split
        - ','
        - !ImportValue
            !Sub '${NetworkStackName}-PublicSubnets'
      SecurityGroups:
        - !Ref ALBSecurityGroup

  ALBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: ALB Security Group
      VpcId: !ImportValue
        !Sub '${NetworkStackName}-VpcId'
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0

  AppSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Application Security Group
      VpcId: !ImportValue
        !Sub '${NetworkStackName}-VpcId'
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 8080
          ToPort: 8080
          SourceSecurityGroupId: !Ref ALBSecurityGroup
```

Deploy them in order:

```bash
# Deploy the network stack first
aws cloudformation deploy \
  --stack-name network-stack \
  --template-file network-stack.yaml \
  --parameter-overrides Environment=prod

# Then deploy the app stack that imports from it
aws cloudformation deploy \
  --stack-name app-stack \
  --template-file app-stack.yaml \
  --parameter-overrides NetworkStackName=network-stack
```

## Listing All Exports

You can see all exports in your account:

```bash
# List all CloudFormation exports in the current region
aws cloudformation list-exports \
  --query 'Exports[*].{Name:Name,Value:Value,Stack:ExportingStackId}' \
  --output table
```

And check what's importing a specific export:

```bash
# See which stacks import a given export
aws cloudformation list-imports \
  --export-name network-stack-VpcId
```

## The Dependency Lock

Here's the important thing about exports: once another stack imports an export, you can't delete or modify that export until you remove all the imports first. CloudFormation enforces this to prevent breaking dependent stacks.

This means you can't:
- Delete the exporting stack
- Remove the output that has the export
- Change the exported value

Until you first update or delete all importing stacks. This creates a strict dependency chain. It's a safety feature, but it can be frustrating when you need to restructure things.

For a looser coupling approach, check out [Fn::ImportValue alternatives](https://oneuptime.com/blog/post/2026-02-12-cloudformation-fn-importvalue-stack-dependencies/view) and SSM Parameter Store patterns.

## Conditional Outputs

You can conditionally include outputs:

```yaml
# Output only exists when condition is true
Conditions:
  IsProduction: !Equals [!Ref Environment, prod]

Outputs:
  AlarmTopicArn:
    Condition: IsProduction
    Description: SNS topic ARN for production alarms
    Value: !Ref AlarmTopic
    Export:
      Name: !Sub '${AWS::StackName}-AlarmTopicArn'
```

## Best Practices

**Prefix export names with the stack name.** This prevents collisions and makes it clear where a value comes from.

**Export the minimum necessary.** Only export values that other stacks actually need. Over-exporting creates unnecessary coupling.

**Document your exports.** Always include a meaningful `Description`. Other teams need to know what the value represents.

**Use consistent naming conventions.** Pick a pattern like `{StackName}-{ResourceType}-{Identifier}` and stick with it.

**Be aware of the dependency lock.** Plan your stack update order carefully. Network stacks with many exports are hard to modify.

**Consider SSM Parameter Store for loose coupling.** If the dependency lock is too restrictive, write values to SSM instead of using exports. Other stacks can read from SSM without the hard dependency.

Outputs and exports form the backbone of multi-stack CloudFormation architectures. Pair them with [nested stacks](https://oneuptime.com/blog/post/2026-02-12-cloudformation-nested-stacks/view) for organizing within a deployment, and cross-stack references for sharing between independent deployments.
