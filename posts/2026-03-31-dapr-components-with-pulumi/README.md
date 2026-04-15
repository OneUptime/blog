# How to Deploy Dapr Components with Pulumi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pulumi, Kubernetes, Component, Infrastructure as Code

Description: Use Pulumi TypeScript to deploy and manage Dapr components as typed Kubernetes custom resources, with environment-specific configuration and secret injection.

---

## Pulumi for Dapr Component Management

Pulumi's Kubernetes provider can manage Dapr custom resources (components, configurations, subscriptions) as typed TypeScript objects. This gives you IDE autocompletion, compile-time checks, and the ability to generate component specs dynamically based on other infrastructure outputs.

## Setup

```bash
cd your-pulumi-project
npm install @pulumi/kubernetes
```

## Deploying a State Store Component

```typescript
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const redisHost = config.requireSecret("redisHost");

const stateStore = new k8s.apiextensions.CustomResource("dapr-statestore", {
  apiVersion: "dapr.io/v1alpha1",
  kind: "Component",
  metadata: {
    name: "statestore",
    namespace: "default",
  },
  spec: {
    type: "state.redis",
    version: "v1",
    metadata: [
      { name: "redisHost", value: redisHost },
      {
        name: "redisPassword",
        secretKeyRef: { name: "redis-secret", key: "password" },
      },
      { name: "actorStateStore", value: "true" },
    ],
  },
});
```

## Pub/Sub with Dynamic Configuration

Build component specs dynamically from other Pulumi resources:

```typescript
import * as aws from "@pulumi/aws";

// Create an SNS topic
const ordersTopic = new aws.sns.Topic("orders", {
  name: "dapr-orders",
});

// Create SQS queue for subscription
const ordersQueue = new aws.sqs.Queue("orders-queue", {
  name: "dapr-orders-queue",
});

// Dapr pub/sub component pointing to SNS/SQS
const pubSub = new k8s.apiextensions.CustomResource("dapr-pubsub", {
  apiVersion: "dapr.io/v1alpha1",
  kind: "Component",
  metadata: {
    name: "pubsub",
    namespace: "default",
  },
  spec: {
    type: "pubsub.aws.snssqs",
    version: "v1",
    metadata: [
      { name: "region", value: aws.config.region! },
      { name: "accessKey", secretKeyRef: { name: "aws-secret", key: "accessKey" } },
      { name: "secretKey", secretKeyRef: { name: "aws-secret", key: "secretKey" } },
    ],
  },
});

export const topicArn = ordersTopic.arn;
```

## Subscription Resource

```typescript
const subscription = new k8s.apiextensions.CustomResource("orders-subscription", {
  apiVersion: "dapr.io/v2alpha1",
  kind: "Subscription",
  metadata: {
    name: "orders-subscription",
    namespace: "default",
  },
  spec: {
    pubsubname: "pubsub",
    topic: "orders",
    routes: {
      default: "/orders",
    },
  },
});
```

## Dapr Configuration Resource

```typescript
const appConfig = new k8s.apiextensions.CustomResource("app-config", {
  apiVersion: "dapr.io/v1alpha1",
  kind: "Configuration",
  metadata: {
    name: "appconfig",
    namespace: "default",
  },
  spec: {
    tracing: {
      samplingRate: "1",
      zipkin: {
        endpointAddress: "http://zipkin.monitoring:9411/api/v2/spans",
      },
    },
    metrics: {
      enabled: true,
    },
  },
});
```

## Deploying and Managing Lifecycle

```bash
# Deploy all components
pulumi up --yes

# Update a single component (Pulumi detects diff)
pulumi up --target "urn:pulumi:dev::dapr-infra::kubernetes:apiextensions.k8s.io/v1:CustomResource::dapr-statestore"

# Destroy components (leaves cluster intact)
pulumi destroy --target-dependents
```

## Summary

Pulumi enables you to derive Dapr component configurations directly from other infrastructure outputs - for example, using a just-created SQS queue ARN in a pub/sub component spec. This tight integration between cloud resources and Dapr components eliminates manual copy-paste of connection strings and ensures your components always reflect the actual state of your infrastructure.
