# How to Create EKS Clusters with CloudFormation Custom Resources and Add-Ons

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, EKS, CloudFormation

Description: Learn how to deploy Amazon EKS clusters using CloudFormation templates with custom resources for advanced configuration and built-in add-ons for essential cluster functionality like VPC CNI, CoreDNS, and kube-proxy.

---

AWS CloudFormation provides declarative infrastructure management for EKS clusters. While basic cluster creation is straightforward, production deployments need advanced features like add-on management, custom node configurations, and integration with other AWS services. CloudFormation custom resources and EKS add-ons make this possible.

This guide shows you how to build complete EKS infrastructure using CloudFormation templates with proper add-on configuration and custom resources for advanced scenarios.

## Understanding EKS Add-Ons

EKS add-ons are Kubernetes components managed by AWS. They include VPC CNI for networking, CoreDNS for service discovery, and kube-proxy for service routing. Managing these through CloudFormation ensures version compatibility and automated updates.

Add-ons integrate with EKS cluster lifecycle, so CloudFormation can update them when you upgrade Kubernetes versions.

## Creating a Basic EKS Cluster

Start with a CloudFormation template for a basic cluster:

```yaml
# eks-basic.yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: 'EKS cluster with CloudFormation'

Parameters:
  ClusterName:
    Type: String
    Default: my-eks-cluster
    Description: Name of the EKS cluster

  KubernetesVersion:
    Type: String
    Default: '1.28'
    Description: Kubernetes version

Resources:
  # IAM role for EKS cluster
  EKSClusterRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: eks.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonEKSClusterPolicy

  # VPC for EKS
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: !Sub '${ClusterName}-vpc'

  # Internet Gateway
  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: !Sub '${ClusterName}-igw'

  AttachGateway:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  # Public subnets
  PublicSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${ClusterName}-public-1'
        - Key: kubernetes.io/role/elb
          Value: '1'

  PublicSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.2.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub '${ClusterName}-public-2'
        - Key: kubernetes.io/role/elb
          Value: '1'

  # Private subnets
  PrivateSubnet1:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.11.0/24
      AvailabilityZone: !Select [0, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub '${ClusterName}-private-1'
        - Key: kubernetes.io/role/internal-elb
          Value: '1'

  PrivateSubnet2:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.12.0/24
      AvailabilityZone: !Select [1, !GetAZs '']
      Tags:
        - Key: Name
          Value: !Sub '${ClusterName}-private-2'
        - Key: kubernetes.io/role/internal-elb
          Value: '1'

  # NAT Gateway for private subnets
  NATGatewayEIP:
    Type: AWS::EC2::EIP
    DependsOn: AttachGateway
    Properties:
      Domain: vpc

  NATGateway:
    Type: AWS::EC2::NatGateway
    Properties:
      AllocationId: !GetAtt NATGatewayEIP.AllocationId
      SubnetId: !Ref PublicSubnet1

  # Route tables
  PublicRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '${ClusterName}-public-rt'

  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: AttachGateway
    Properties:
      RouteTableId: !Ref PublicRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  PublicSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet1
      RouteTableId: !Ref PublicRouteTable

  PublicSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet2
      RouteTableId: !Ref PublicRouteTable

  PrivateRouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: !Sub '${ClusterName}-private-rt'

  PrivateRoute:
    Type: AWS::EC2::Route
    Properties:
      RouteTableId: !Ref PrivateRouteTable
      DestinationCidrBlock: 0.0.0.0/0
      NatGatewayId: !Ref NATGateway

  PrivateSubnet1RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PrivateSubnet1
      RouteTableId: !Ref PrivateRouteTable

  PrivateSubnet2RouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PrivateSubnet2
      RouteTableId: !Ref PrivateRouteTable

  # Security group for cluster
  ClusterSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Security group for EKS cluster
      VpcId: !Ref VPC
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0

  # EKS cluster
  EKSCluster:
    Type: AWS::EKS::Cluster
    Properties:
      Name: !Ref ClusterName
      Version: !Ref KubernetesVersion
      RoleArn: !GetAtt EKSClusterRole.Arn
      ResourcesVpcConfig:
        SecurityGroupIds:
          - !Ref ClusterSecurityGroup
        SubnetIds:
          - !Ref PrivateSubnet1
          - !Ref PrivateSubnet2
          - !Ref PublicSubnet1
          - !Ref PublicSubnet2
        EndpointPrivateAccess: true
        EndpointPublicAccess: true

Outputs:
  ClusterName:
    Value: !Ref EKSCluster
    Description: EKS cluster name

  ClusterEndpoint:
    Value: !GetAtt EKSCluster.Endpoint
    Description: EKS cluster endpoint

  ClusterArn:
    Value: !GetAtt EKSCluster.Arn
    Description: EKS cluster ARN
```

Deploy the stack:

```bash
aws cloudformation create-stack \
  --stack-name eks-cluster \
  --template-body file://eks-basic.yaml \
  --parameters ParameterKey=ClusterName,ParameterValue=production-eks \
  --capabilities CAPABILITY_IAM
```

## Adding EKS Add-Ons

Extend the template with managed add-ons:

```yaml
# Add to Resources section

  # VPC CNI add-on
  VPCCNIAddon:
    Type: AWS::EKS::Addon
    DependsOn: EKSCluster
    Properties:
      AddonName: vpc-cni
      ClusterName: !Ref ClusterName
      AddonVersion: v1.15.1-eksbuild.1
      ResolveConflicts: OVERWRITE
      ConfigurationValues: |
        {
          "env": {
            "ENABLE_PREFIX_DELEGATION": "true",
            "ENABLE_POD_ENI": "true",
            "POD_SECURITY_GROUP_ENFORCING_MODE": "standard"
          }
        }

  # CoreDNS add-on
  CoreDNSAddon:
    Type: AWS::EKS::Addon
    DependsOn:
      - EKSCluster
      - NodeGroup
    Properties:
      AddonName: coredns
      ClusterName: !Ref ClusterName
      AddonVersion: v1.10.1-eksbuild.4
      ResolveConflicts: OVERWRITE

  # kube-proxy add-on
  KubeProxyAddon:
    Type: AWS::EKS::Addon
    DependsOn: EKSCluster
    Properties:
      AddonName: kube-proxy
      ClusterName: !Ref ClusterName
      AddonVersion: v1.28.2-eksbuild.2
      ResolveConflicts: OVERWRITE

  # EBS CSI driver add-on
  EBSCSIDriverAddon:
    Type: AWS::EKS::Addon
    DependsOn: EKSCluster
    Properties:
      AddonName: aws-ebs-csi-driver
      ClusterName: !Ref ClusterName
      AddonVersion: v1.25.0-eksbuild.1
      ServiceAccountRoleArn: !GetAtt EBSCSIDriverRole.Arn
      ResolveConflicts: OVERWRITE

  # IAM role for EBS CSI driver
  EBSCSIDriverRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Federated: !Sub 'arn:aws:iam::${AWS::AccountId}:oidc-provider/${OIDCProvider}'
            Action: sts:AssumeRoleWithWebIdentity
            Condition:
              StringEquals:
                !Sub '${OIDCProvider}:sub': 'system:serviceaccount:kube-system:ebs-csi-controller-sa'
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy

  # OIDC provider for IRSA
  OIDCProvider:
    Type: AWS::IAM::OIDCProvider
    Properties:
      Url: !GetAtt EKSCluster.OpenIdConnectIssuerUrl
      ClientIdList:
        - sts.amazonaws.com
      ThumbprintList:
        - 9e99a48a9960b14926bb7f3b02e22da2b0ab7280
```

This adds essential add-ons with specific versions and configuration. The EBS CSI driver uses IRSA (IAM Roles for Service Accounts) for secure AWS API access.

## Creating Node Groups

Add managed node groups:

```yaml
  # IAM role for node group
  NodeInstanceRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: ec2.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy
        - arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy
        - arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
        - arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore

  # Node group
  NodeGroup:
    Type: AWS::EKS::Nodegroup
    DependsOn: EKSCluster
    Properties:
      ClusterName: !Ref ClusterName
      NodegroupName: !Sub '${ClusterName}-nodes'
      NodeRole: !GetAtt NodeInstanceRole.Arn
      Subnets:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      ScalingConfig:
        MinSize: 2
        MaxSize: 10
        DesiredSize: 3
      InstanceTypes:
        - t3.medium
      AmiType: AL2_x86_64
      UpdateConfig:
        MaxUnavailablePercentage: 33
      Labels:
        role: worker
        environment: production
      Tags:
        Name: !Sub '${ClusterName}-node'
        Environment: production
```

## Implementing Custom Resources for Advanced Configuration

Use CloudFormation custom resources for features not supported by native resources:

```yaml
  # Lambda execution role
  CustomResourceLambdaRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
      Policies:
        - PolicyName: EKSAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - eks:DescribeCluster
                  - eks:ListClusters
                Resource: '*'

  # Lambda function for custom resource
  KubeConfigLambda:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub '${ClusterName}-kubeconfig-generator'
      Runtime: python3.11
      Handler: index.handler
      Role: !GetAtt CustomResourceLambdaRole.Arn
      Timeout: 60
      Code:
        ZipFile: |
          import json
          import boto3
          import cfnresponse

          def handler(event, context):
              try:
                  eks = boto3.client('eks')
                  cluster_name = event['ResourceProperties']['ClusterName']

                  if event['RequestType'] == 'Delete':
                      cfnresponse.send(event, context, cfnresponse.SUCCESS, {})
                      return

                  response = eks.describe_cluster(name=cluster_name)
                  cluster = response['cluster']

                  kubeconfig = {
                      'apiVersion': 'v1',
                      'kind': 'Config',
                      'clusters': [{
                          'cluster': {
                              'certificate-authority-data': cluster['certificateAuthority']['data'],
                              'server': cluster['endpoint']
                          },
                          'name': 'kubernetes'
                      }],
                      'contexts': [{
                          'context': {
                              'cluster': 'kubernetes',
                              'user': 'aws'
                          },
                          'name': 'aws'
                      }],
                      'current-context': 'aws',
                      'users': [{
                          'name': 'aws',
                          'user': {
                              'exec': {
                                  'apiVersion': 'client.authentication.k8s.io/v1beta1',
                                  'command': 'aws',
                                  'args': [
                                      'eks',
                                      'get-token',
                                      '--cluster-name',
                                      cluster_name
                                  ]
                              }
                          }
                      }]
                  }

                  output = {
                      'Kubeconfig': json.dumps(kubeconfig),
                      'Endpoint': cluster['endpoint'],
                      'CA': cluster['certificateAuthority']['data']
                  }

                  cfnresponse.send(event, context, cfnresponse.SUCCESS, output)
              except Exception as e:
                  print(f"Error: {str(e)}")
                  cfnresponse.send(event, context, cfnresponse.FAILED, {})

  # Custom resource to generate kubeconfig
  KubeconfigGenerator:
    Type: Custom::KubeconfigGenerator
    DependsOn: EKSCluster
    Properties:
      ServiceToken: !GetAtt KubeConfigLambda.Arn
      ClusterName: !Ref ClusterName
```

This custom resource generates a kubeconfig that other resources can use.

## Creating a Complete Production Template

Combine everything into a production-ready template:

```yaml
Parameters:
  Environment:
    Type: String
    AllowedValues:
      - development
      - staging
      - production
    Default: production

Mappings:
  EnvironmentConfig:
    development:
      NodeInstanceType: t3.medium
      MinNodes: 1
      MaxNodes: 3
      DesiredNodes: 2
    staging:
      NodeInstanceType: t3.large
      MinNodes: 2
      MaxNodes: 5
      DesiredNodes: 3
    production:
      NodeInstanceType: m5.xlarge
      MinNodes: 3
      MaxNodes: 10
      DesiredNodes: 5

Resources:
  # All previous resources plus environment-specific configuration

  NodeGroup:
    Type: AWS::EKS::Nodegroup
    Properties:
      # ... other properties ...
      InstanceTypes:
        - !FindInMap [EnvironmentConfig, !Ref Environment, NodeInstanceType]
      ScalingConfig:
        MinSize: !FindInMap [EnvironmentConfig, !Ref Environment, MinNodes]
        MaxSize: !FindInMap [EnvironmentConfig, !Ref Environment, MaxNodes]
        DesiredSize: !FindInMap [EnvironmentConfig, !Ref Environment, DesiredNodes]
```

Deploy for different environments:

```bash
# Production
aws cloudformation create-stack \
  --stack-name eks-production \
  --template-body file://eks-complete.yaml \
  --parameters ParameterKey=Environment,ParameterValue=production \
  --capabilities CAPABILITY_IAM

# Staging
aws cloudformation create-stack \
  --stack-name eks-staging \
  --template-body file://eks-complete.yaml \
  --parameters ParameterKey=Environment,ParameterValue=staging \
  --capabilities CAPABILITY_IAM
```

## Summary

CloudFormation provides complete lifecycle management for EKS clusters with declarative templates. Native support for add-ons ensures compatibility and simplifies upgrades. Custom resources extend CloudFormation capabilities for advanced scenarios like kubeconfig generation. Combined with parameter mappings and environment-specific configuration, you can manage multiple EKS clusters with consistent infrastructure code that follows AWS best practices.
