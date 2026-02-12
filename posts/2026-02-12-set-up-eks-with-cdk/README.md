# How to Set Up EKS with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, CDK, Kubernetes, Infrastructure as Code

Description: Learn how to provision and configure Amazon EKS clusters using AWS CDK for type-safe, programmable infrastructure as code with full IDE support.

---

AWS CDK lets you define cloud infrastructure using real programming languages - TypeScript, Python, Java, Go - instead of YAML or JSON templates. For EKS, this means you can create clusters, configure node groups, set up IRSA, install add-ons, and even deploy Kubernetes manifests, all from a single CDK stack with full type safety and IDE autocomplete.

If you've been using eksctl or Terraform for EKS provisioning, CDK offers a different flavor. It's especially powerful when your team already works in TypeScript or Python and you want infrastructure definitions that feel like regular code.

## Prerequisites

You'll need:

- AWS CDK v2 installed (`npm install -g aws-cdk`)
- Node.js 18+ (for TypeScript CDK)
- AWS CLI configured with valid credentials
- kubectl installed

## Setting Up the Project

Create a new CDK project:

```bash
# Create a new CDK project in TypeScript
mkdir eks-cdk && cd eks-cdk
cdk init app --language typescript

# Install the EKS-related CDK constructs
npm install @aws-cdk/lambda-layer-kubectl-v29
```

The core EKS constructs are included in `aws-cdk-lib`, so you don't need additional packages for most things.

## Creating a Basic EKS Cluster

Here's a minimal EKS cluster with CDK:

```typescript
// lib/eks-cdk-stack.ts - Basic EKS cluster
import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { KubectlV29Layer } from '@aws-cdk/lambda-layer-kubectl-v29';

export class EksCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC for the cluster
    const vpc = new ec2.Vpc(this, 'EksVpc', {
      maxAzs: 3,
      natGateways: 2,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // Create the EKS cluster
    const cluster = new eks.Cluster(this, 'MyCluster', {
      clusterName: 'production-cluster',
      version: eks.KubernetesVersion.V1_29,
      kubectlLayer: new KubectlV29Layer(this, 'KubectlLayer'),
      vpc: vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      defaultCapacity: 0, // We'll add node groups manually
      endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
    });

    // Output the cluster name and kubectl config command
    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
    });

    new cdk.CfnOutput(this, 'KubeconfigCommand', {
      value: `aws eks update-kubeconfig --name ${cluster.clusterName} --region ${this.region}`,
    });
  }
}
```

## Adding Managed Node Groups

Add node groups with specific instance types and scaling configurations:

```typescript
// Add a general-purpose managed node group
const generalNodeGroup = cluster.addNodegroupCapacity('GeneralNodes', {
  instanceTypes: [
    new ec2.InstanceType('m5.xlarge'),
    new ec2.InstanceType('m5a.xlarge'),
  ],
  minSize: 2,
  maxSize: 10,
  desiredSize: 3,
  diskSize: 100,
  amiType: eks.NodegroupAmiType.AL2_X86_64,
  labels: {
    'workload-type': 'general',
  },
  tags: {
    Environment: 'production',
    ManagedBy: 'cdk',
  },
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
});

// Add a compute-optimized node group with taints
cluster.addNodegroupCapacity('ComputeNodes', {
  instanceTypes: [new ec2.InstanceType('c5.2xlarge')],
  minSize: 0,
  maxSize: 5,
  desiredSize: 0,
  labels: {
    'workload-type': 'compute',
  },
  taints: [
    {
      key: 'workload-type',
      value: 'compute',
      effect: eks.TaintEffect.NO_SCHEDULE,
    },
  ],
});
```

## Configuring IRSA

CDK makes [IRSA](https://oneuptime.com/blog/post/set-up-iam-roles-for-eks-service-accounts-irsa/view) setup straightforward:

```typescript
// Create a service account with S3 read access
const s3ReaderSa = cluster.addServiceAccount('S3Reader', {
  name: 's3-reader',
  namespace: 'default',
});

s3ReaderSa.role.addManagedPolicy(
  iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess')
);

// Create a service account with a custom policy
const appSa = cluster.addServiceAccount('AppServiceAccount', {
  name: 'my-app',
  namespace: 'default',
});

appSa.role.addToPolicy(new iam.PolicyStatement({
  actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:Query'],
  resources: ['arn:aws:dynamodb:*:*:table/my-app-*'],
}));
```

## Installing Add-ons

Add EKS managed add-ons:

```typescript
// Install VPC CNI add-on
new eks.CfnAddon(this, 'VpcCni', {
  clusterName: cluster.clusterName,
  addonName: 'vpc-cni',
  addonVersion: 'v1.16.0-eksbuild.1',
  resolveConflicts: 'OVERWRITE',
});

// Install CoreDNS
new eks.CfnAddon(this, 'CoreDns', {
  clusterName: cluster.clusterName,
  addonName: 'coredns',
  resolveConflicts: 'OVERWRITE',
});

// Install kube-proxy
new eks.CfnAddon(this, 'KubeProxy', {
  clusterName: cluster.clusterName,
  addonName: 'kube-proxy',
  resolveConflicts: 'OVERWRITE',
});

// Install EBS CSI driver with IRSA
const ebsCsiRole = new iam.Role(this, 'EbsCsiRole', {
  assumedBy: new iam.ServicePrincipal('pods.eks.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName(
      'service-role/AmazonEBSCSIDriverPolicy'
    ),
  ],
});

new eks.CfnAddon(this, 'EbsCsi', {
  clusterName: cluster.clusterName,
  addonName: 'aws-ebs-csi-driver',
  serviceAccountRoleArn: ebsCsiRole.roleArn,
  resolveConflicts: 'OVERWRITE',
});
```

## Deploying Kubernetes Manifests

CDK can deploy Kubernetes resources directly as part of the stack:

```typescript
// Deploy a Kubernetes namespace
const namespace = cluster.addManifest('AppNamespace', {
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name: 'my-app' },
});

// Deploy an application
const appDeployment = cluster.addManifest('AppDeployment', {
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: {
    name: 'my-app',
    namespace: 'my-app',
  },
  spec: {
    replicas: 3,
    selector: { matchLabels: { app: 'my-app' } },
    template: {
      metadata: { labels: { app: 'my-app' } },
      spec: {
        serviceAccountName: 'my-app',
        containers: [{
          name: 'my-app',
          image: '123456789012.dkr.ecr.us-west-2.amazonaws.com/my-app:latest',
          ports: [{ containerPort: 8080 }],
          resources: {
            requests: { cpu: '250m', memory: '256Mi' },
            limits: { cpu: '500m', memory: '512Mi' },
          },
        }],
      },
    },
  },
});

// Ensure namespace is created before the deployment
appDeployment.node.addDependency(namespace);
```

## Installing Helm Charts

CDK supports Helm chart installation:

```typescript
// Install the AWS Load Balancer Controller via Helm
cluster.addHelmChart('AwsLbController', {
  chart: 'aws-load-balancer-controller',
  repository: 'https://aws.github.io/eks-charts',
  namespace: 'kube-system',
  values: {
    clusterName: cluster.clusterName,
    serviceAccount: {
      create: false,
      name: 'aws-load-balancer-controller',
    },
  },
});

// Install Prometheus stack
cluster.addHelmChart('Prometheus', {
  chart: 'kube-prometheus-stack',
  repository: 'https://prometheus-community.github.io/helm-charts',
  namespace: 'monitoring',
  createNamespace: true,
  values: {
    prometheus: {
      prometheusSpec: {
        retention: '15d',
        storageSpec: {
          volumeClaimTemplate: {
            spec: {
              storageClassName: 'gp3',
              accessModes: ['ReadWriteOnce'],
              resources: { requests: { storage: '50Gi' } },
            },
          },
        },
      },
    },
  },
});
```

## Enabling Cluster Logging

```typescript
// Enable control plane logging
const cluster = new eks.Cluster(this, 'MyCluster', {
  // ... other config
  clusterLogging: [
    eks.ClusterLoggingTypes.API,
    eks.ClusterLoggingTypes.AUDIT,
    eks.ClusterLoggingTypes.AUTHENTICATOR,
    eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
    eks.ClusterLoggingTypes.SCHEDULER,
  ],
});
```

For more on cluster logging, see our [EKS logging guide](https://oneuptime.com/blog/post/configure-eks-cluster-logging/view).

## Granting Cluster Access

Map IAM roles and users to Kubernetes RBAC:

```typescript
// Grant cluster admin access to a role
const adminRole = iam.Role.fromRoleArn(this, 'AdminRole',
  'arn:aws:iam::123456789012:role/PlatformAdmin'
);
cluster.awsAuth.addRoleMapping(adminRole, {
  groups: ['system:masters'],
  username: 'platform-admin',
});

// Grant read-only access to developers
const devRole = iam.Role.fromRoleArn(this, 'DevRole',
  'arn:aws:iam::123456789012:role/Developer'
);
cluster.awsAuth.addRoleMapping(devRole, {
  groups: ['developers'],
  username: 'developer',
});
```

## Deploying the Stack

Synthesize and deploy:

```bash
# Synthesize the CloudFormation template to verify
cdk synth

# Deploy the stack
cdk deploy

# After deployment, configure kubectl
aws eks update-kubeconfig --name production-cluster --region us-west-2
```

CDK deployments use CloudFormation under the hood, so you get rollback on failure, drift detection, and all the other CloudFormation benefits.

## Advantages Over eksctl

CDK shines when:

- You want infrastructure and Kubernetes resources in one codebase
- You need to integrate EKS with other AWS resources (RDS, ElastiCache, SQS)
- Your team prefers type-safe code over YAML configuration
- You want to share infrastructure patterns as reusable constructs

eksctl is simpler for quick cluster provisioning, but CDK gives you more power and composability for complex setups.

## Cleanup

Delete the stack when you're done:

```bash
# Destroy the entire stack
cdk destroy
```

CDK provides a programmable, type-safe way to manage EKS infrastructure. The learning curve is steeper than eksctl, but the payoff is infrastructure code that's testable, composable, and fully integrated with the rest of your AWS stack.
