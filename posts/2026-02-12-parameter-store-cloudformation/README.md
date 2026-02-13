# How to Reference Parameter Store Values in CloudFormation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Systems Manager, Parameter Store, CloudFormation

Description: Learn how to reference AWS Systems Manager Parameter Store values in CloudFormation templates using dynamic references and SSM parameter types.

---

Hardcoding values in CloudFormation templates is a bad habit that catches up with you. You end up with different templates for each environment, secrets in plain text inside version-controlled files, and a maintenance headache when anything changes.

CloudFormation has built-in support for reading values from Parameter Store. You can reference parameters dynamically so your templates stay environment-agnostic, and your secrets never touch source control.

There are two main approaches: SSM parameter types (resolved at deploy time) and dynamic references (resolved at create/update time). Let me show you both.

## Approach 1: SSM Parameter Types

CloudFormation parameter types let you reference Parameter Store values as stack parameters. The value is resolved when you create or update the stack.

```yaml
# template.yml - Using SSM parameter types
AWSTemplateFormatVersion: '2010-09-09'
Description: Application stack with Parameter Store references

Parameters:
  # This resolves to the value stored in Parameter Store
  DatabaseHost:
    Type: AWS::SSM::Parameter::Value<String>
    Default: /myapp/production/database/host

  DatabasePort:
    Type: AWS::SSM::Parameter::Value<String>
    Default: /myapp/production/database/port

  # Reference a specific version of a parameter
  ApiKeyVersion:
    Type: AWS::SSM::Parameter::Value<String>
    Default: /myapp/production/api-key:3

  # For AMI IDs - uses the special AWS parameter type
  LatestAmiId:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2

  # For VPC IDs
  VpcId:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::VPC::Id>
    Default: /myapp/infrastructure/vpc-id

  # For subnet lists
  SubnetIds:
    Type: AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>
    Default: /myapp/infrastructure/private-subnet-ids

Resources:
  AppInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: !Ref LatestAmiId
      InstanceType: t3.medium
      SubnetId: !Select [0, !Ref SubnetIds]
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash
          echo "DB_HOST=${DatabaseHost}" >> /etc/environment
          echo "DB_PORT=${DatabasePort}" >> /etc/environment
```

The `Default` value is the Parameter Store path. When CloudFormation deploys, it reads the current value from Parameter Store and uses it.

### Supported SSM Parameter Types

| Type | Usage |
|---|---|
| `AWS::SSM::Parameter::Value<String>` | Any string parameter |
| `AWS::SSM::Parameter::Value<List<String>>` | StringList parameters |
| `AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>` | AMI IDs |
| `AWS::SSM::Parameter::Value<AWS::EC2::VPC::Id>` | VPC IDs |
| `AWS::SSM::Parameter::Value<AWS::EC2::Subnet::Id>` | Subnet IDs |
| `AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>` | List of subnet IDs |
| `AWS::SSM::Parameter::Value<AWS::EC2::SecurityGroup::Id>` | Security group IDs |

### Making Templates Environment-Agnostic

Pass the parameter path as a stack parameter to reuse the same template across environments:

```yaml
Parameters:
  Environment:
    Type: String
    AllowedValues: [development, staging, production]

  DatabaseHost:
    Type: AWS::SSM::Parameter::Value<String>
    # Override this when creating the stack
    Default: /myapp/production/database/host
```

When creating the stack, override the default with the environment-specific path:

```bash
# Deploy to staging
aws cloudformation create-stack \
  --stack-name myapp-staging \
  --template-body file://template.yml \
  --parameters \
    ParameterKey=Environment,ParameterValue=staging \
    ParameterKey=DatabaseHost,ParameterValue=/myapp/staging/database/host \
    ParameterKey=DatabasePort,ParameterValue=/myapp/staging/database/port
```

## Approach 2: Dynamic References

Dynamic references are resolved inline in the template without defining them as parameters. They're especially useful for secrets because they support SecureString.

```yaml
# template.yml - Using dynamic references
AWSTemplateFormatVersion: '2010-09-09'

Resources:
  AppDatabase:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: db.t3.medium
      Engine: postgres
      # Resolve plain string parameters
      MasterUsername: !Sub '{{resolve:ssm:/myapp/production/database/admin-user}}'
      # Resolve SecureString parameters (decrypted automatically)
      MasterUserPassword: !Sub '{{resolve:ssm-secure:/myapp/production/database/admin-password}}'
      DBName: !Sub '{{resolve:ssm:/myapp/production/database/name}}'

  AppTaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      ContainerDefinitions:
        - Name: myapp
          Image: !Sub '{{resolve:ssm:/myapp/production/container/image}}'
          Environment:
            - Name: DB_HOST
              Value: !Sub '{{resolve:ssm:/myapp/production/database/host}}'
          Secrets:
            - Name: DB_PASSWORD
              ValueFrom: !Sub 'arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/myapp/production/database/password'
```

### Dynamic Reference Syntax

```
{{resolve:ssm:parameter-name:version}}         # String/StringList
{{resolve:ssm-secure:parameter-name:version}}   # SecureString
```

The version number is optional. Without it, CloudFormation uses the latest version:

```yaml
# Latest version
Value: '{{resolve:ssm:/myapp/config/api-endpoint}}'

# Specific version
Value: '{{resolve:ssm:/myapp/config/api-endpoint:5}}'

# SecureString (always uses ssm-secure prefix)
Value: '{{resolve:ssm-secure:/myapp/secrets/api-key}}'
```

### Important Limitations

Dynamic references have some restrictions:

- `ssm-secure` references only work in specific resource properties (like `AWS::RDS::DBInstance` MasterUserPassword)
- You can't use `ssm-secure` references in resource conditions or outputs
- Each template can have up to 200 dynamic references
- The resolved values are not visible in the CloudFormation console or API (for security)

## Combining Both Approaches

For complex stacks, use both approaches together:

```yaml
AWSTemplateFormatVersion: '2010-09-09'

Parameters:
  # SSM parameter types for infrastructure references
  VpcId:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::VPC::Id>
    Default: /infrastructure/vpc-id

  PrivateSubnets:
    Type: AWS::SSM::Parameter::Value<List<AWS::EC2::Subnet::Id>>
    Default: /infrastructure/private-subnet-ids

  Environment:
    Type: String
    Default: production

Resources:
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: db.t3.medium
      Engine: postgres
      # Dynamic reference for the secret password
      MasterUserPassword: !Sub '{{resolve:ssm-secure:/myapp/${Environment}/database/password}}'
      VPCSecurityGroups:
        - !Ref DBSecurityGroup
      DBSubnetGroupName: !Ref DBSubnetGroup

  DBSubnetGroup:
    Type: AWS::RDS::DBSubnetGroup
    Properties:
      Description: Database subnet group
      SubnetIds: !Ref PrivateSubnets

  DBSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Database security group
      VpcId: !Ref VpcId
```

## Storing CloudFormation Outputs in Parameter Store

After a stack creates resources, store important outputs back in Parameter Store for other stacks to reference:

```yaml
Resources:
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      # ... configuration

  # Store the database endpoint in Parameter Store
  DatabaseEndpointParameter:
    Type: AWS::SSM::Parameter
    Properties:
      Name: !Sub /myapp/${Environment}/database/endpoint
      Type: String
      Value: !GetAtt Database.Endpoint.Address
      Description: RDS database endpoint

  DatabasePortParameter:
    Type: AWS::SSM::Parameter
    Properties:
      Name: !Sub /myapp/${Environment}/database/port
      Type: String
      Value: !GetAtt Database.Endpoint.Port
      Description: RDS database port
```

This creates a nice feedback loop where infrastructure stacks write configuration that application stacks read.

## Using AWS Public Parameters

AWS publishes useful parameters that you can reference, like the latest AMI IDs:

```yaml
Parameters:
  # Latest Amazon Linux 2 AMI
  AmazonLinux2Ami:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2

  # Latest ECS-optimized AMI
  EcsOptimizedAmi:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/ecs/optimized-ami/amazon-linux-2/recommended/image_id

  # Latest EKS AMI for a specific Kubernetes version
  EksAmi:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/eks/optimized-ami/1.28/amazon-linux-2/recommended/image_id
```

```bash
# Browse available AWS public parameters
aws ssm get-parameters-by-path \
  --path /aws/service/ami-amazon-linux-latest \
  --query 'Parameters[*].{Name:Name,Value:Value}'
```

## Detecting Changes

When a Parameter Store value changes, CloudFormation doesn't automatically update the stack. You need to trigger an update:

```bash
# Force a stack update when parameter values change
aws cloudformation update-stack \
  --stack-name myapp-production \
  --use-previous-template \
  --parameters \
    ParameterKey=DatabaseHost,UsePreviousValue=true \
    ParameterKey=DatabasePort,UsePreviousValue=true
```

For dynamic references, you can force resolution by making a no-op change to the template.

For monitoring your infrastructure and applications after configuration changes, [OneUptime](https://oneuptime.com) can track the impact of parameter changes on application behavior. Also see our guide on [Parameter Store hierarchies](https://oneuptime.com/blog/post/2026-02-12-parameter-store-hierarchies-paths/view) for organizing your parameters effectively.
