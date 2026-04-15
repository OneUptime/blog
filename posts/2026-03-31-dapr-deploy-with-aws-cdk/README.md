# How to Deploy Dapr with AWS CDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS CDK, Kubernetes, EKS, Infrastructure as Code

Description: Deploy Dapr on Amazon EKS using AWS CDK with TypeScript, combining cluster provisioning and Dapr installation in a single, type-safe IaC stack.

---

## AWS CDK and Dapr on EKS

AWS CDK (Cloud Development Kit) lets you define cloud infrastructure with familiar programming languages. When deploying Dapr on EKS, CDK lets you provision the cluster and install Dapr in one cohesive workflow - eliminating the need to coordinate separate Terraform and Helm operations.

## Prerequisites

```bash
# Install AWS CDK
npm install -g aws-cdk

# Bootstrap CDK in your AWS account
cdk bootstrap aws://ACCOUNT_ID/us-east-1
```

## Project Setup

```bash
mkdir dapr-cdk && cd dapr-cdk
cdk init app --language typescript
npm install aws-cdk-lib constructs
```

## EKS Cluster with Dapr

Create `lib/dapr-stack.ts`:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

export class DaprStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC
    const vpc = new ec2.Vpc(this, 'DaprVpc', {
      maxAzs: 3,
    });

    // Create EKS cluster
    const cluster = new eks.Cluster(this, 'DaprCluster', {
      clusterName: 'dapr-cluster',
      version: eks.KubernetesVersion.V1_29,
      vpc,
      defaultCapacity: 3,
      defaultCapacityInstance: ec2.InstanceType.of(
        ec2.InstanceClass.M5,
        ec2.InstanceSize.XLARGE
      ),
    });

    // Install Dapr via Helm chart
    const daprChart = cluster.addHelmChart('Dapr', {
      chart: 'dapr',
      repository: 'https://dapr.github.io/helm-charts/',
      namespace: 'dapr-system',
      createNamespace: true,
      version: '1.13.0',
      values: {
        global: {
          mtls: { enabled: true },
          logAsJson: true,
        },
        dapr_operator: { replicaCount: 2 },
        dapr_sentry: { replicaCount: 2 },
        dapr_placement: { replicaCount: 3 },
      },
    });

    // Export cluster name
    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
    });
  }
}
```

## Adding Dapr Components via CDK

Deploy a Dapr state store component pointing to ElastiCache:

```typescript
// Add Redis ElastiCache
const redis = new elasticache.CfnReplicationGroup(this, 'DaprRedis', {
  replicationGroupDescription: 'Dapr state store',
  numCacheClusters: 2,
  cacheNodeType: 'cache.t3.medium',
  engine: 'redis',
  engineVersion: '7.0',
});

// Add Dapr component manifest
cluster.addManifest('DaprStateStore', {
  apiVersion: 'dapr.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'statestore', namespace: 'default' },
  spec: {
    type: 'state.redis',
    version: 'v1',
    metadata: [
      { name: 'redisHost', value: `${redis.attrPrimaryEndPointAddress}:6379` },
      { name: 'enableTLS', value: 'true' },
    ],
  },
});
```

## Deploying

```bash
# Synthesize CloudFormation templates
cdk synth

# Deploy the stack
cdk deploy DaprStack

# Update kubeconfig
aws eks update-kubeconfig --name dapr-cluster --region us-east-1

# Verify Dapr pods
kubectl get pods -n dapr-system
```

## Summary

AWS CDK provides a unified TypeScript experience for provisioning EKS clusters and deploying Dapr in a single stack. The `addHelmChart` construct integrates Helm releases directly into CDK's dependency graph, ensuring Dapr is installed after the cluster is ready and that infrastructure teardown handles cleanup in the correct order.
