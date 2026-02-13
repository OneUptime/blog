# How to Automate EC2 Provisioning with CloudFormation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, CloudFormation, Infrastructure as Code

Description: Learn how to automate EC2 instance provisioning using AWS CloudFormation templates with networking, security groups, and production-ready configurations.

---

AWS CloudFormation is the native infrastructure-as-code service for AWS. If you're already deep in the AWS ecosystem and don't want to introduce third-party tools, CloudFormation is the natural choice for automating your EC2 provisioning. It uses JSON or YAML templates to define resources, and AWS handles the orchestration of creating, updating, and deleting everything in the right order.

Let's build up a CloudFormation template from scratch, starting simple and adding complexity as we go.

## A Minimal Template

The simplest possible CloudFormation template for an EC2 instance looks like this.

This template creates a single EC2 instance:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Simple EC2 instance

Resources:
  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-0abc123def456
      InstanceType: t3.micro
      Tags:
        - Key: Name
          Value: simple-instance
```

Deploy it with the AWS CLI:

```bash
# Create the stack
aws cloudformation create-stack \
  --stack-name simple-ec2 \
  --template-body file://template.yaml

# Watch the stack creation progress
aws cloudformation wait stack-create-complete \
  --stack-name simple-ec2

# Check the stack status
aws cloudformation describe-stacks \
  --stack-name simple-ec2
```

## Using Parameters

Hard-coding AMI IDs and instance types makes templates inflexible. Parameters let users customize deployments without editing the template.

Add parameters for common configuration options:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: EC2 instance with parameters

Parameters:
  InstanceType:
    Type: String
    Default: t3.micro
    AllowedValues:
      - t3.micro
      - t3.small
      - t3.medium
      - m5.large
    Description: EC2 instance type

  KeyName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: Name of an existing EC2 key pair

  Environment:
    Type: String
    Default: development
    AllowedValues:
      - development
      - staging
      - production

  LatestAmiId:
    Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>
    Default: /aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64

Resources:
  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: !Ref LatestAmiId
      InstanceType: !Ref InstanceType
      KeyName: !Ref KeyName
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-server'
        - Key: Environment
          Value: !Ref Environment
```

Notice the `AWS::SSM::Parameter::Value` type for the AMI - this automatically resolves to the latest Amazon Linux 2023 AMI, so you never have to update AMI IDs manually.

Deploy with parameter overrides:

```bash
# Create stack with custom parameters
aws cloudformation create-stack \
  --stack-name staging-ec2 \
  --template-body file://template.yaml \
  --parameters \
    ParameterKey=InstanceType,ParameterValue=t3.small \
    ParameterKey=KeyName,ParameterValue=my-key \
    ParameterKey=Environment,ParameterValue=staging
```

## Adding Network Infrastructure

A production template needs a proper VPC setup. Here's a complete networking stack with public and private subnets.

Define the VPC, subnets, and routing:

```yaml
Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsSupport: true
      EnableDnsHostnames: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-vpc'

  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-igw'

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-public-subnet'

  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-public-rt'

  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: AttachGateway
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnetRouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet
      RouteTableId: !Ref PublicRouteTable
```

## Security Group Configuration

Security groups in CloudFormation are straightforward but verbose.

Define a security group with SSH, HTTP, and HTTPS rules:

```yaml
  WebSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Allow web and SSH traffic
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0
          Description: SSH access
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
          Description: HTTP access
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
          Description: HTTPS access
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-web-sg'
```

## EC2 Instance with UserData

UserData in CloudFormation lets you bootstrap instances on launch. CloudFormation also has a helper system called cfn-init that provides a more structured approach than raw bash scripts.

Instance with cfn-init for structured configuration:

```yaml
  WebServer:
    Type: AWS::EC2::Instance
    Metadata:
      AWS::CloudFormation::Init:
        configSets:
          full_install:
            - install_packages
            - configure_app
        install_packages:
          packages:
            yum:
              nginx: []
              git: []
          services:
            sysvinit:
              nginx:
                enabled: true
                ensureRunning: true
        configure_app:
          files:
            /usr/share/nginx/html/index.html:
              content: !Sub |
                <html>
                <body>
                <h1>Hello from ${Environment}</h1>
                <p>Instance: ${AWS::StackName}</p>
                </body>
                </html>
              mode: '000644'
              owner: root
              group: root
    Properties:
      ImageId: !Ref LatestAmiId
      InstanceType: !Ref InstanceType
      KeyName: !Ref KeyName
      SubnetId: !Ref PublicSubnet
      SecurityGroupIds:
        - !Ref WebSecurityGroup
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash -xe
          yum update -y aws-cfn-bootstrap
          /opt/aws/bin/cfn-init -v \
            --stack ${AWS::StackName} \
            --resource WebServer \
            --configsets full_install \
            --region ${AWS::Region}
          /opt/aws/bin/cfn-signal -e $? \
            --stack ${AWS::StackName} \
            --resource WebServer \
            --region ${AWS::Region}
      Tags:
        - Key: Name
          Value: !Sub '${Environment}-web-server'
    CreationPolicy:
      ResourceSignal:
        Timeout: PT10M
```

The `CreationPolicy` with `ResourceSignal` tells CloudFormation to wait for cfn-signal before marking the resource as complete. If the bootstrap fails, the stack creation fails too - no more silently broken instances.

## Outputs

Outputs expose important values from your stack.

Add outputs for the instance details:

```yaml
Outputs:
  InstanceId:
    Description: Instance ID
    Value: !Ref WebServer

  PublicIP:
    Description: Public IP address
    Value: !GetAtt WebServer.PublicIp

  PublicDNS:
    Description: Public DNS name
    Value: !GetAtt WebServer.PublicDnsName

  WebURL:
    Description: URL to access the web server
    Value: !Sub 'http://${WebServer.PublicDnsName}'

  SSHCommand:
    Description: SSH command to connect
    Value: !Sub 'ssh -i ${KeyName}.pem ec2-user@${WebServer.PublicIp}'
```

View outputs after deployment:

```bash
# Get stack outputs
aws cloudformation describe-stacks \
  --stack-name staging-ec2 \
  --query 'Stacks[0].Outputs'
```

## Updating Stacks

One of CloudFormation's strengths is managing updates. Change your template and run an update:

```bash
# Update an existing stack
aws cloudformation update-stack \
  --stack-name staging-ec2 \
  --template-body file://template.yaml \
  --parameters \
    ParameterKey=InstanceType,ParameterValue=t3.medium

# Or preview changes with a change set first
aws cloudformation create-change-set \
  --stack-name staging-ec2 \
  --change-set-name upgrade-instance-type \
  --template-body file://template.yaml \
  --parameters \
    ParameterKey=InstanceType,ParameterValue=t3.medium

# Review the change set
aws cloudformation describe-change-set \
  --stack-name staging-ec2 \
  --change-set-name upgrade-instance-type

# Execute if the changes look good
aws cloudformation execute-change-set \
  --stack-name staging-ec2 \
  --change-set-name upgrade-instance-type
```

Change sets are valuable because they show you exactly what CloudFormation will modify, replace, or delete before making any changes.

## Drift Detection

Over time, people make manual changes through the console that don't match the template. CloudFormation's drift detection catches these.

Check for drift:

```bash
# Initiate drift detection
aws cloudformation detect-stack-drift \
  --stack-name staging-ec2

# Check drift results
aws cloudformation describe-stack-drift-detection-status \
  --stack-drift-detection-id <drift-detection-id>

# See detailed drift for each resource
aws cloudformation describe-stack-resource-drifts \
  --stack-name staging-ec2
```

## Cleanup

Deleting a stack removes all resources it created:

```bash
# Delete the stack and all its resources
aws cloudformation delete-stack --stack-name staging-ec2

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name staging-ec2
```

If you want to keep certain resources when a stack is deleted, add a `DeletionPolicy: Retain` to those resources in your template.

For more infrastructure-as-code approaches, check out our posts on [creating EC2 instances with Terraform](https://oneuptime.com/blog/post/2026-02-12-create-ec2-instance-terraform/view) and [using AWS CDK](https://oneuptime.com/blog/post/2026-02-12-create-ec2-instances-aws-cdk/view).

## Wrapping Up

CloudFormation gives you native AWS infrastructure-as-code without any third-party dependencies. It handles resource dependencies automatically, supports rollback on failure, and integrates deeply with every AWS service. The YAML templates are verbose compared to some alternatives, but the trade-off is tight integration with AWS features like drift detection, change sets, and stack policies. For teams that are all-in on AWS, it's a solid choice for managing EC2 infrastructure.
