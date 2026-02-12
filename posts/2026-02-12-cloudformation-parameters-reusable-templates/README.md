# How to Use CloudFormation Parameters for Reusable Templates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFormation, Infrastructure as Code, DevOps

Description: Master CloudFormation parameters to build flexible, reusable templates that work across multiple environments without code duplication.

---

A CloudFormation template with hard-coded values is a one-trick pony. It works for exactly one scenario and nothing else. Parameters change that - they turn a rigid template into a flexible tool that you can deploy to dev, staging, and production without changing a single line.

This guide covers everything about CloudFormation parameters: the types available, validation options, defaults, and real patterns for building truly reusable templates.

## Why Parameters Matter

Consider this template:

```yaml
# Hard-coded template - only works for one environment
Resources:
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: db.t3.micro
      AllocatedStorage: 20
      Engine: mysql
      MasterUsername: admin
      MasterUserPassword: my-secret-password-123
```

This creates a tiny MySQL instance with a hard-coded password. You can't reuse it for production (you'd need a bigger instance), and the password is sitting right there in plain text. Parameters fix both problems.

## Parameter Syntax

Here's the basic structure:

```yaml
# Parameter definition with type, default, and constraints
Parameters:
  EnvironmentName:
    Type: String
    Default: dev
    AllowedValues:
      - dev
      - staging
      - prod
    Description: The target deployment environment
    ConstraintDescription: Must be dev, staging, or prod
```

Each parameter can have these properties:

| Property | Required | Description |
|---|---|---|
| `Type` | Yes | The data type |
| `Default` | No | Value used if none provided |
| `AllowedValues` | No | Whitelist of valid values |
| `AllowedPattern` | No | Regex the value must match |
| `MinLength` / `MaxLength` | No | String length constraints |
| `MinValue` / `MaxValue` | No | Numeric range constraints |
| `Description` | No | Shown in the Console UI |
| `ConstraintDescription` | No | Custom error message |
| `NoEcho` | No | Mask the value (for passwords) |

## Parameter Types

CloudFormation supports several parameter types.

**String** is the most common:

```yaml
# String parameter with regex validation
Parameters:
  ProjectName:
    Type: String
    MinLength: 3
    MaxLength: 20
    AllowedPattern: '[a-zA-Z][a-zA-Z0-9]*'
    Description: Project name (alphanumeric, starts with letter)
```

**Number** for numeric values:

```yaml
# Number parameter with range constraints
Parameters:
  InstanceCount:
    Type: Number
    Default: 2
    MinValue: 1
    MaxValue: 10
    Description: Number of EC2 instances to launch
```

**CommaDelimitedList** for multiple values:

```yaml
# Comma-separated list that becomes an array
Parameters:
  SubnetIds:
    Type: CommaDelimitedList
    Description: Comma-separated list of subnet IDs
```

**AWS-Specific Parameter Types** are the real power tools. They validate against your actual AWS account:

```yaml
# AWS-specific types that validate against your account
Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: Select a VPC (dropdown in Console)

  SubnetId:
    Type: AWS::EC2::Subnet::Id
    Description: Select a subnet

  KeyPair:
    Type: AWS::EC2::KeyPair::KeyName
    Description: Select an EC2 key pair

  SecurityGroupId:
    Type: AWS::EC2::SecurityGroup::Id
    Description: Select a security group

  AmiId:
    Type: AWS::EC2::Image::Id
    Description: AMI ID for the EC2 instance

  HostedZoneId:
    Type: AWS::Route53::HostedZone::Id
    Description: Route53 hosted zone
```

When you deploy through the Console, these render as dropdown menus populated with actual resources from your account. That alone saves a ton of typing errors.

**SSM Parameter Types** let you reference values stored in AWS Systems Manager Parameter Store:

```yaml
# Pull values from SSM Parameter Store at deploy time
Parameters:
  LatestAmi:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2
    Description: Latest Amazon Linux 2 AMI
```

This is incredibly useful. Instead of hard-coding AMI IDs that change per region, you reference the SSM parameter path and CloudFormation resolves the current value at deploy time.

## Using Parameters in Resources

Reference parameters with `!Ref` or embed them in strings with `!Sub`:

```yaml
# Using parameters in resource properties
Parameters:
  Environment:
    Type: String
    Default: dev
  InstanceType:
    Type: String
    Default: t3.micro

Resources:
  WebServer:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !Ref InstanceType
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-web-server'
        - Key: Environment
          Value: !Ref Environment
```

## A Real-World Parameterized Template

Here's a template that deploys differently based on the environment:

```yaml
# Multi-environment template using parameters and conditions
AWSTemplateFormatVersion: '2010-09-09'
Description: Parameterized web application infrastructure

Parameters:
  Environment:
    Type: String
    AllowedValues: [dev, staging, prod]
    Description: Deployment environment

  InstanceType:
    Type: String
    Default: t3.micro
    AllowedValues:
      - t3.micro
      - t3.small
      - t3.medium
      - t3.large
    Description: EC2 instance size

  DatabasePassword:
    Type: String
    NoEcho: true
    MinLength: 12
    AllowedPattern: '[a-zA-Z0-9!@#$%]*'
    Description: Database admin password (min 12 chars)

  EnableMultiAZ:
    Type: String
    Default: 'false'
    AllowedValues: ['true', 'false']
    Description: Enable Multi-AZ for the database

  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: VPC to deploy into

  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
    Description: Subnets for the application

Conditions:
  IsProduction: !Equals [!Ref Environment, prod]
  UseMultiAZ: !Equals [!Ref EnableMultiAZ, 'true']

Resources:
  AppSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: !Sub '${Environment} application security group'
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0

  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: !If [IsProduction, db.r5.large, db.t3.micro]
      AllocatedStorage: !If [IsProduction, 100, 20]
      Engine: mysql
      MasterUsername: admin
      MasterUserPassword: !Ref DatabasePassword
      MultiAZ: !Ref EnableMultiAZ
      StorageEncrypted: !If [IsProduction, true, false]
      Tags:
        - Key: Environment
          Value: !Ref Environment

Outputs:
  SecurityGroupId:
    Description: Security group ID
    Value: !Ref AppSecurityGroup

  DatabaseEndpoint:
    Description: Database connection endpoint
    Value: !GetAtt Database.Endpoint.Address
```

## Passing Parameters

From the CLI, you pass parameters like this:

```bash
# Pass parameters via the CLI during deployment
aws cloudformation deploy \
  --stack-name myapp-prod \
  --template-file template.yaml \
  --parameter-overrides \
    Environment=prod \
    InstanceType=t3.large \
    DatabasePassword=SuperSecret123 \
    EnableMultiAZ=true \
    VpcId=vpc-0abc123 \
    SubnetIds=subnet-111,subnet-222
```

For many parameters, use a parameter file:

```json
[
  { "ParameterKey": "Environment", "ParameterValue": "prod" },
  { "ParameterKey": "InstanceType", "ParameterValue": "t3.large" },
  { "ParameterKey": "EnableMultiAZ", "ParameterValue": "true" }
]
```

```bash
# Deploy using a parameter file
aws cloudformation create-stack \
  --stack-name myapp-prod \
  --template-body file://template.yaml \
  --parameters file://params-prod.json
```

## Best Practices

**Use NoEcho for secrets.** Any parameter containing passwords, API keys, or tokens should set `NoEcho: true`. Better yet, use SSM SecureString parameters or Secrets Manager instead of passing secrets directly.

**Set sensible defaults.** If 90% of deployments use `t3.micro`, make that the default. People should only need to override parameters when they're doing something non-standard.

**Validate aggressively.** Use `AllowedValues`, `AllowedPattern`, `MinLength`, and `MinValue` to catch bad inputs before they cause deployment failures.

**Use AWS-specific types when possible.** They provide automatic validation and nice dropdown menus in the Console.

**Keep the parameter count manageable.** If your template has 30 parameters, it's probably doing too much. Split it into [nested stacks](https://oneuptime.com/blog/post/cloudformation-nested-stacks/view) instead.

**Document with Description.** Always add descriptions - they show up in the Console and help anyone deploying the template understand what each parameter does.

Parameters are the first step toward reusable infrastructure. Combined with [conditions](https://oneuptime.com/blog/post/cloudformation-conditions-conditional-resources/view) and [mappings](https://oneuptime.com/blog/post/cloudformation-mappings-region-specific-values/view), they let you build templates that adapt to any environment or region without duplication.
