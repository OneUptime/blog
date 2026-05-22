# How to Automate Istio Deployment with CloudFormation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CloudFormation, AWS, EKS, Automation

Description: Deploy and manage Istio service mesh on AWS EKS using CloudFormation templates with custom resources and Lambda functions.

---

If you run Kubernetes on AWS EKS, CloudFormation is likely already part of your infrastructure stack. While CloudFormation does not natively understand Kubernetes resources, you can use custom resources backed by Lambda functions to deploy Istio as part of your CloudFormation stack. This keeps your entire infrastructure, from the VPC to the service mesh, in a single CloudFormation template.

This guide shows how to set it up and what the trade-offs are.

## The Approach

CloudFormation manages AWS resources natively but needs help with Kubernetes resources. The strategy is:

1. Use CloudFormation to create the EKS cluster
2. Use a CloudFormation custom resource backed by Lambda to install Istio via Helm
3. Use additional custom resources for Istio-specific configuration

The `aws-cdk` and `AWSQS::Kubernetes::Helm` resource type make this much more practical than rolling your own Lambda functions.

## EKS Cluster with CloudFormation

Start with an EKS cluster template:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: EKS Cluster with Istio Service Mesh

Parameters:
  ClusterName:
    Type: String
    Default: istio-cluster
  KubernetesVersion:
    Type: String
    Default: "1.33"
  IstioVersion:
    Type: String
    Default: "1.29.2"
  NodeInstanceType:
    Type: String
    Default: m5.large
  NodeCount:
    Type: Number
    Default: 3

Resources:
  EKSCluster:
    Type: AWS::EKS::Cluster
    Properties:
      Name: !Ref ClusterName
      Version: !Ref KubernetesVersion
      RoleArn: !GetAtt EKSClusterRole.Arn
      AccessConfig:
        AuthenticationMode: API_AND_CONFIG_MAP
      ResourcesVpcConfig:
        SubnetIds:
          - !Ref PrivateSubnet1
          - !Ref PrivateSubnet2
        SecurityGroupIds:
          - !Ref ClusterSecurityGroup

  NodeGroup:
    Type: AWS::EKS::Nodegroup
    DependsOn: EKSCluster
    Properties:
      ClusterName: !Ref ClusterName
      NodeRole: !GetAtt NodeRole.Arn
      Subnets:
        - !Ref PrivateSubnet1
        - !Ref PrivateSubnet2
      ScalingConfig:
        MinSize: !Ref NodeCount
        MaxSize: !Ref NodeCount
        DesiredSize: !Ref NodeCount
      InstanceTypes:
        - !Ref NodeInstanceType
```

## Lambda Function for Helm Operations

Create a Lambda function that can execute Helm commands against the EKS cluster:

```yaml
  HelmLambdaRole:
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
                Resource: "*"
              - Effect: Allow
                Action:
                  - sts:AssumeRole
                Resource: "*"

  HelmClusterAccess:
    Type: AWS::EKS::AccessEntry
    DependsOn: EKSCluster
    Properties:
      ClusterName: !Ref ClusterName
      PrincipalArn: !GetAtt HelmLambdaRole.Arn
      Type: STANDARD
      AccessPolicies:
        - PolicyArn: arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy
          AccessScope:
            Type: cluster

  HelmLambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: istio-helm-installer
      Runtime: python3.12
      Handler: index.handler
      Timeout: 900
      MemorySize: 512
      Role: !GetAtt HelmLambdaRole.Arn
      Layers:
        - !Ref HelmToolsLayer
      Environment:
        Variables:
          CLUSTER_NAME: !Ref ClusterName
          KUBECONFIG: /tmp/kubeconfig
      Code:
        ZipFile: |
          import boto3
          import subprocess
          import cfnresponse
          import os
          import json

          def handler(event, context):
              cluster_name = os.environ['CLUSTER_NAME']
              request_type = event['RequestType']
              properties = event['ResourceProperties']

              try:
                  # Configure kubectl
                  subprocess.run([
                      'aws', 'eks', 'update-kubeconfig',
                      '--name', cluster_name,
                      '--region', os.environ['AWS_REGION'],
                      '--kubeconfig', os.environ['KUBECONFIG']
                  ], check=True)

                  chart = properties['Chart']
                  release = properties['ReleaseName']
                  namespace = properties['Namespace']
                  repo = properties.get('Repository', '')
                  version = properties.get('Version', '')
                  values = properties.get('Values', '{}')

                  if request_type in ['Create', 'Update']:
                      # Add repo
                      if repo:
                          subprocess.run([
                              'helm', 'repo', 'add', 'istio', repo
                          ], check=True)
                          subprocess.run(['helm', 'repo', 'update'], check=True)

                      # Install/upgrade
                      cmd = [
                          'helm', 'upgrade', '--install', release,
                          chart,
                          '--namespace', namespace,
                          '--create-namespace',
                          '--wait',
                          '--timeout', '10m'
                      ]
                      if version:
                          cmd.extend(['--version', version])
                      if values:
                          # Write values to temp file
                          with open('/tmp/values.yaml', 'w') as f:
                              f.write(json.dumps(json.loads(values)))
                          cmd.extend(['-f', '/tmp/values.yaml'])

                      subprocess.run(cmd, check=True)

                  elif request_type == 'Delete':
                      subprocess.run([
                          'helm', 'uninstall', release,
                          '--namespace', namespace
                      ], check=True)

                  cfnresponse.send(event, context, cfnresponse.SUCCESS, {})

              except Exception as e:
                  print(f"Error: {str(e)}")
                  cfnresponse.send(event, context, cfnresponse.FAILED, {
                      'Error': str(e)
                  })
```

The `HelmToolsLayer` in this example needs to provide the `aws`, `kubectl`, and `helm` executables. The Lambda role also needs Kubernetes authorization, which the `AWS::EKS::AccessEntry` resource above grants through the EKS access API.

## Installing Istio as Custom Resources

Now use the Lambda function to install each Istio chart:

```yaml
  IstioBase:
    Type: Custom::HelmRelease
    DependsOn:
      - NodeGroup
    Properties:
      ServiceToken: !GetAtt HelmLambdaFunction.Arn
      ReleaseName: istio-base
      Chart: istio/base
      Repository: https://istio-release.storage.googleapis.com/charts
      Version: !Ref IstioVersion
      Namespace: istio-system

  Istiod:
    Type: Custom::HelmRelease
    DependsOn:
      - IstioBase
    Properties:
      ServiceToken: !GetAtt HelmLambdaFunction.Arn
      ReleaseName: istiod
      Chart: istio/istiod
      Repository: https://istio-release.storage.googleapis.com/charts
      Version: !Ref IstioVersion
      Namespace: istio-system
      Values: !Sub |
        {
          "pilot": {
            "autoscaleEnabled": true,
            "autoscaleMin": 2,
            "resources": {
              "requests": {
                "cpu": "500m",
                "memory": "2Gi"
              }
            }
          },
          "meshConfig": {
            "accessLogFile": "/dev/stdout",
            "enableAutoMtls": true
          }
        }

  IstioIngress:
    Type: Custom::HelmRelease
    DependsOn:
      - Istiod
    Properties:
      ServiceToken: !GetAtt HelmLambdaFunction.Arn
      ReleaseName: istio-ingress
      Chart: istio/gateway
      Repository: https://istio-release.storage.googleapis.com/charts
      Version: !Ref IstioVersion
      Namespace: istio-ingress
      Values: |
        {
          "service": {
            "type": "LoadBalancer",
            "annotations": {
              "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
              "service.beta.kubernetes.io/aws-load-balancer-scheme": "internet-facing"
            }
          },
          "autoscaling": {
            "enabled": true,
            "minReplicas": 2,
            "maxReplicas": 10
          }
        }
```

## Using the AWS CDK Alternative

If writing raw CloudFormation YAML feels painful (it is), the AWS CDK provides a much nicer experience:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import { KubectlV33Layer } from '@aws-cdk/lambda-layer-kubectl-v33';
import { Construct } from 'constructs';

export class IstioStack extends cdk.Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const cluster = new eks.Cluster(this, 'IstioCluster', {
      version: eks.KubernetesVersion.V1_33,
      kubectlLayer: new KubectlV33Layer(this, 'KubectlLayer'),
      defaultCapacity: 3,
      defaultCapacityInstance: ec2.InstanceType.of(
        ec2.InstanceClass.M5,
        ec2.InstanceSize.LARGE,
      ),
    });

    // Install Istio base
    const istioBase = cluster.addHelmChart('IstioBase', {
      chart: 'base',
      repository: 'https://istio-release.storage.googleapis.com/charts',
      namespace: 'istio-system',
      version: '1.29.2',
      values: {
        defaultRevision: 'default',
      },
    });

    // Install istiod
    const istiod = cluster.addHelmChart('Istiod', {
      chart: 'istiod',
      repository: 'https://istio-release.storage.googleapis.com/charts',
      namespace: 'istio-system',
      version: '1.29.2',
      values: {
        pilot: {
          autoscaleEnabled: true,
          autoscaleMin: 2,
          resources: {
            requests: {
              cpu: '500m',
              memory: '2Gi',
            },
          },
        },
        meshConfig: {
          accessLogFile: '/dev/stdout',
          enableAutoMtls: true,
        },
      },
    });
    istiod.node.addDependency(istioBase);

    // Install ingress gateway
    const gateway = cluster.addHelmChart('IstioIngress', {
      chart: 'gateway',
      repository: 'https://istio-release.storage.googleapis.com/charts',
      namespace: 'istio-ingress',
      version: '1.29.2',
      createNamespace: true,
      values: {
        service: {
          type: 'LoadBalancer',
          annotations: {
            'service.beta.kubernetes.io/aws-load-balancer-type': 'nlb',
          },
        },
      },
    });
    gateway.node.addDependency(istiod);
  }
}
```

Deploy with CDK:

```bash
cdk deploy
```

## Stack Outputs

Export useful values from the stack:

```yaml
Outputs:
  ClusterEndpoint:
    Value: !GetAtt EKSCluster.Endpoint
    Description: EKS cluster API endpoint

  IstioVersion:
    Value: !Ref IstioVersion
    Description: Installed Istio version

  ClusterName:
    Value: !Ref ClusterName
    Description: EKS cluster name
```

## Updating the Stack

Change parameters and update:

```bash
aws cloudformation update-stack \
  --stack-name istio-cluster \
  --template-body file://template.yaml \
  --parameters ParameterKey=IstioVersion,ParameterValue=1.29.2 \
  --capabilities CAPABILITY_IAM
```

CloudFormation handles the update ordering through the DependsOn declarations, upgrading base first, then istiod, then the gateway.

## Limitations and Trade-offs

CloudFormation is not the most natural fit for Kubernetes resource management. The custom resource approach adds complexity and the Lambda function is another moving part that can fail. For day-to-day Istio configuration changes (VirtualServices, DestinationRules, etc.), you probably want a different tool.

Where CloudFormation shines is the initial cluster and Istio setup. If your organization standardizes on CloudFormation for all infrastructure, having Istio installation in the same stack means one less tool to manage.

The pragmatic approach is to use CloudFormation for the infrastructure layer (EKS cluster + Istio installation) and a GitOps tool like Argo CD or Flux for the application-level Istio configuration. Each tool handles the layer it is best suited for.
