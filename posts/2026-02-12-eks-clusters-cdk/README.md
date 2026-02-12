# How to Create EKS Clusters with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, EKS, Kubernetes

Description: Deploy production-ready Amazon EKS clusters using AWS CDK with managed node groups, Fargate profiles, IRSA, and add-on configuration in TypeScript.

---

Setting up an EKS cluster manually involves dozens of steps - VPC configuration, IAM roles, security groups, node groups, OIDC providers, and more. It's the kind of thing that takes a full day the first time and you still forget something. CDK's EKS module condenses all of that into a handful of constructs that handle the interdependencies for you.

Let's build out a production-ready EKS cluster with CDK, covering managed node groups, Fargate profiles, IAM roles for service accounts (IRSA), and essential add-ons.

## Basic EKS Cluster

Here's a cluster with sensible defaults:

```typescript
// lib/eks-stack.ts - EKS cluster with CDK
import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class EksStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for the cluster
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
          cidrMask: 22,
        },
      ],
    });

    // Create the EKS cluster
    const cluster = new eks.Cluster(this, 'Cluster', {
      clusterName: 'production-cluster',
      version: eks.KubernetesVersion.V1_29,
      vpc: vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      defaultCapacity: 0, // We'll add node groups separately
      endpointAccess: eks.EndpointAccess.PRIVATE,
      clusterLogging: [
        eks.ClusterLoggingTypes.API,
        eks.ClusterLoggingTypes.AUDIT,
        eks.ClusterLoggingTypes.AUTHENTICATOR,
        eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
        eks.ClusterLoggingTypes.SCHEDULER,
      ],
    });

    // Output the cluster name and endpoint
    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
    });

    new cdk.CfnOutput(this, 'ClusterEndpoint', {
      value: cluster.clusterEndpoint,
    });
  }
}
```

Setting `defaultCapacity: 0` prevents CDK from creating a default managed node group. We'll create our own with better configuration.

## Managed Node Groups

Managed node groups are the recommended way to run worker nodes. AWS handles the AMI updates, draining, and replacement:

```typescript
// Managed node group with multiple instance types
cluster.addNodegroupCapacity('GeneralWorkload', {
  nodegroupName: 'general',
  instanceTypes: [
    ec2.InstanceType.of(ec2.InstanceClass.M6I, ec2.InstanceSize.XLARGE),
    ec2.InstanceType.of(ec2.InstanceClass.M6A, ec2.InstanceSize.XLARGE),
    ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.XLARGE),
  ],
  minSize: 2,
  maxSize: 10,
  desiredSize: 3,
  diskSize: 100,
  amiType: eks.NodegroupAmiType.AL2_X86_64,
  capacityType: eks.CapacityType.ON_DEMAND,
  subnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  labels: {
    'workload-type': 'general',
  },
  tags: {
    'k8s.io/cluster-autoscaler/enabled': 'true',
    [`k8s.io/cluster-autoscaler/${cluster.clusterName}`]: 'owned',
  },
});

// Spot instance node group for cost savings
cluster.addNodegroupCapacity('SpotWorkload', {
  nodegroupName: 'spot',
  instanceTypes: [
    ec2.InstanceType.of(ec2.InstanceClass.M6I, ec2.InstanceSize.XLARGE),
    ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.XLARGE),
    ec2.InstanceType.of(ec2.InstanceClass.C6I, ec2.InstanceSize.XLARGE),
    ec2.InstanceType.of(ec2.InstanceClass.R6I, ec2.InstanceSize.XLARGE),
  ],
  minSize: 0,
  maxSize: 20,
  desiredSize: 2,
  capacityType: eks.CapacityType.SPOT,
  labels: {
    'workload-type': 'spot',
  },
  taints: [
    {
      key: 'spot',
      value: 'true',
      effect: eks.TaintEffect.PREFER_NO_SCHEDULE,
    },
  ],
});
```

Multiple instance types in the spot node group increases the chance of getting capacity from the spot market. The taint on spot nodes means only pods that tolerate spots will schedule there.

## Fargate Profiles

For serverless workloads, Fargate profiles let you run pods without managing nodes:

```typescript
// Fargate profile for specific namespaces
cluster.addFargateProfile('SystemProfile', {
  fargateProfileName: 'system',
  selectors: [
    { namespace: 'kube-system', labels: { 'fargate': 'true' } },
    { namespace: 'monitoring' },
  ],
  subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
});

cluster.addFargateProfile('AppProfile', {
  fargateProfileName: 'applications',
  selectors: [
    { namespace: 'production' },
    { namespace: 'staging' },
  ],
});
```

## IAM Roles for Service Accounts (IRSA)

IRSA lets your pods assume IAM roles without storing credentials. It's the recommended way to give pods access to AWS services:

```typescript
// Service account with IAM role for S3 access
const s3ServiceAccount = cluster.addServiceAccount('S3Access', {
  name: 's3-reader',
  namespace: 'production',
});

// Grant S3 read access
s3ServiceAccount.addToPrincipalPolicy(new iam.PolicyStatement({
  actions: ['s3:GetObject', 's3:ListBucket'],
  resources: [
    'arn:aws:s3:::my-data-bucket',
    'arn:aws:s3:::my-data-bucket/*',
  ],
}));

// Service account for DynamoDB access
const dynamoServiceAccount = cluster.addServiceAccount('DynamoAccess', {
  name: 'dynamo-writer',
  namespace: 'production',
});

dynamoServiceAccount.addToPrincipalPolicy(new iam.PolicyStatement({
  actions: [
    'dynamodb:PutItem',
    'dynamodb:GetItem',
    'dynamodb:Query',
    'dynamodb:UpdateItem',
  ],
  resources: ['arn:aws:iam::123456789012:table/orders'],
}));
```

## Deploying Kubernetes Resources

CDK can deploy Kubernetes manifests directly:

```typescript
// Deploy Kubernetes resources through CDK
cluster.addManifest('AppNamespace', {
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name: 'production' },
});

// Deploy a simple application
cluster.addManifest('NginxDeployment', {
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: {
    name: 'nginx',
    namespace: 'production',
  },
  spec: {
    replicas: 3,
    selector: {
      matchLabels: { app: 'nginx' },
    },
    template: {
      metadata: {
        labels: { app: 'nginx' },
      },
      spec: {
        containers: [{
          name: 'nginx',
          image: 'nginx:1.25',
          ports: [{ containerPort: 80 }],
          resources: {
            requests: { cpu: '100m', memory: '128Mi' },
            limits: { cpu: '200m', memory: '256Mi' },
          },
        }],
        serviceAccountName: 's3-reader',
      },
    },
  },
});
```

## Helm Charts

Install Helm charts for cluster add-ons:

```typescript
// Install AWS Load Balancer Controller via Helm
cluster.addHelmChart('AwsLoadBalancerController', {
  chart: 'aws-load-balancer-controller',
  repository: 'https://aws.github.io/eks-charts',
  namespace: 'kube-system',
  release: 'aws-load-balancer-controller',
  values: {
    clusterName: cluster.clusterName,
    serviceAccount: {
      create: false,
      name: 'aws-load-balancer-controller',
    },
  },
});

// Install metrics-server
cluster.addHelmChart('MetricsServer', {
  chart: 'metrics-server',
  repository: 'https://kubernetes-sigs.github.io/metrics-server/',
  namespace: 'kube-system',
  release: 'metrics-server',
});

// Install cluster autoscaler
cluster.addHelmChart('ClusterAutoscaler', {
  chart: 'cluster-autoscaler',
  repository: 'https://kubernetes.github.io/autoscaler',
  namespace: 'kube-system',
  release: 'cluster-autoscaler',
  values: {
    autoDiscovery: {
      clusterName: cluster.clusterName,
    },
    awsRegion: this.region,
  },
});
```

## Access Management

Control who can access the cluster:

```typescript
// Grant cluster admin access to an IAM role
const adminRole = iam.Role.fromRoleArn(
  this, 'AdminRole',
  'arn:aws:iam::123456789012:role/K8sAdminRole'
);
cluster.awsAuth.addRoleMapping(adminRole, {
  groups: ['system:masters'],
});

// Grant read-only access to developers
const devRole = iam.Role.fromRoleArn(
  this, 'DevRole',
  'arn:aws:iam::123456789012:role/DeveloperRole'
);
cluster.awsAuth.addRoleMapping(devRole, {
  groups: ['developers'],
});
```

You'll need to create a corresponding ClusterRoleBinding in Kubernetes to define what the 'developers' group can do.

## Cluster Add-ons

EKS add-ons are managed by AWS and stay updated automatically:

```typescript
// Install EKS managed add-ons
new eks.CfnAddon(this, 'VpcCni', {
  addonName: 'vpc-cni',
  clusterName: cluster.clusterName,
  resolveConflicts: 'OVERWRITE',
});

new eks.CfnAddon(this, 'CoreDns', {
  addonName: 'coredns',
  clusterName: cluster.clusterName,
  resolveConflicts: 'OVERWRITE',
});

new eks.CfnAddon(this, 'KubeProxy', {
  addonName: 'kube-proxy',
  clusterName: cluster.clusterName,
  resolveConflicts: 'OVERWRITE',
});
```

For securing your cluster's secrets with customer-managed encryption, check out [creating KMS keys with CDK](https://oneuptime.com/blog/post/kms-keys-cdk/view). If you need to set up DNS records for your cluster's ingress, see [Route 53 records with CDK](https://oneuptime.com/blog/post/route-53-records-cdk/view).

## Wrapping Up

CDK transforms EKS cluster provisioning from a multi-day project into a single stack deployment. The EKS module handles the complex web of IAM roles, security groups, and OIDC providers that you'd otherwise need to wire up manually. Start with a basic cluster and managed node group, add IRSA for secure AWS service access, then layer on Helm charts for your cluster tooling. The result is a reproducible, version-controlled Kubernetes platform that you can deploy to any account in minutes.
