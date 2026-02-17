# How to Create GCP Resources Declaratively Using Config Connector Custom Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Config Connector, Kubernetes, Infrastructure as Code, Declarative

Description: Learn how to create and manage Google Cloud resources declaratively using Config Connector custom resources in Kubernetes with practical examples.

---

Managing cloud infrastructure through click-ops or imperative scripts gets messy fast. Config Connector lets you define GCP resources as Kubernetes custom resources, bringing the same declarative model you use for pods and services to your cloud infrastructure. You declare what you want, and Config Connector makes it happen.

This post walks through creating several common GCP resources declaratively, covering the patterns and conventions you need to know.

## How Config Connector Custom Resources Work

When you install Config Connector, it registers hundreds of Custom Resource Definitions (CRDs) in your cluster. Each CRD corresponds to a GCP resource type. When you create a custom resource, Config Connector's controller detects it, calls the appropriate GCP API to create the real resource, and then continuously reconciles the desired state with the actual state.

This means if someone manually changes a resource in the GCP Console, Config Connector will detect the drift and revert it to match your YAML definition. That is a powerful feature for maintaining consistency.

## Common Annotations

Before diving into examples, there are a few annotations you will use frequently.

```yaml
# Common annotations used across Config Connector resources
metadata:
  annotations:
    # Specifies which GCP project the resource belongs to
    cnrm.cloud.google.com/project-id: "my-project-id"
    # Controls deletion behavior - abandon means the GCP resource persists
    # even if the Kubernetes resource is deleted
    cnrm.cloud.google.com/deletion-policy: "abandon"
    # Prevents Config Connector from managing an existing resource
    cnrm.cloud.google.com/state-into-spec: "absent"
```

The `deletion-policy` annotation is especially important. By default, deleting the Kubernetes resource also deletes the GCP resource. Setting it to "abandon" prevents that, which is useful when you want to stop managing a resource without destroying it.

## Creating a Cloud Storage Bucket

Storage buckets are one of the simplest resources to create.

```yaml
# storage-bucket.yaml
# Creates a multi-region Cloud Storage bucket with versioning enabled
apiVersion: storage.cnrm.cloud.google.com/v1beta1
kind: StorageBucket
metadata:
  name: my-app-data-bucket
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  # Multi-region location for high availability
  location: US
  # Enable versioning to keep history of object changes
  versioning:
    enabled: true
  # Automatically delete objects older than 90 days
  lifecycleRule:
    - action:
        type: Delete
      condition:
        age: 90
  # Prevent public access
  uniformBucketLevelAccess: true
```

Apply it just like any Kubernetes resource.

```bash
# Create the storage bucket
kubectl apply -f storage-bucket.yaml

# Check the resource status
kubectl get storagebucket my-app-data-bucket -o yaml
```

## Creating a VPC Network and Subnet

Networking resources follow the same pattern but often have dependencies between them.

```yaml
# vpc-network.yaml
# Creates a custom VPC network without auto-created subnets
apiVersion: compute.cnrm.cloud.google.com/v1beta1
kind: ComputeNetwork
metadata:
  name: my-app-network
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  # Disable auto subnet creation so we can define our own
  autoCreateSubnetworks: false
  routingMode: REGIONAL
```

Now create a subnet that references the network.

```yaml
# subnet.yaml
# Creates a subnet within the custom VPC network
apiVersion: compute.cnrm.cloud.google.com/v1beta1
kind: ComputeSubnetwork
metadata:
  name: my-app-subnet
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  region: us-central1
  ipCidrRange: "10.0.0.0/24"
  # Reference the VPC network by its Config Connector resource name
  networkRef:
    name: my-app-network
  # Enable VPC Flow Logs for network monitoring
  logConfig:
    aggregationInterval: INTERVAL_5_SEC
    flowSampling: 0.5
```

Notice the `networkRef` field. Config Connector uses references to establish dependencies between resources. It will wait for the network to be ready before creating the subnet.

## Creating a Pub/Sub Topic and Subscription

Pub/Sub resources show the reference pattern for messaging infrastructure.

```yaml
# pubsub-topic.yaml
# Creates a Pub/Sub topic with a 7-day message retention
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubTopic
metadata:
  name: order-events
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  messageRetentionDuration: "604800s"
```

```yaml
# pubsub-subscription.yaml
# Creates a pull subscription on the order-events topic
apiVersion: pubsub.cnrm.cloud.google.com/v1beta1
kind: PubSubSubscription
metadata:
  name: order-processor-sub
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  topicRef:
    name: order-events
  ackDeadlineSeconds: 30
  # Retain acknowledged messages for replay capability
  retainAckedMessages: true
  messageRetentionDuration: "86400s"
  # Configure dead letter policy for failed messages
  deadLetterPolicy:
    deadLetterTopicRef:
      name: order-events-dlq
    maxDeliveryAttempts: 5
```

## Creating a Service Account with IAM Bindings

You can manage IAM resources declaratively too.

```yaml
# service-account.yaml
# Creates a GCP service account for an application
apiVersion: iam.cnrm.cloud.google.com/v1beta1
kind: IAMServiceAccount
metadata:
  name: my-app-sa
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  displayName: "My Application Service Account"
```

```yaml
# iam-binding.yaml
# Grants the service account access to read from Cloud Storage
apiVersion: iam.cnrm.cloud.google.com/v1beta1
kind: IAMPolicyMember
metadata:
  name: my-app-sa-storage-reader
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project-id"
spec:
  member: serviceAccount:my-app-sa@my-project-id.iam.gserviceaccount.com
  role: roles/storage.objectViewer
  resourceRef:
    apiVersion: resourcemanager.cnrm.cloud.google.com/v1beta1
    kind: Project
    external: projects/my-project-id
```

## Handling Dependencies with References

Config Connector handles resource ordering automatically through references. When resource B references resource A, Config Connector will not attempt to create B until A is ready.

The reference pattern has two forms:

```yaml
# Reference by Config Connector resource name in the same namespace
spec:
  networkRef:
    name: my-network

# Reference by external name for pre-existing resources not managed by CC
spec:
  networkRef:
    external: projects/my-project-id/global/networks/existing-network
```

The `external` form is useful when you want to reference resources that already exist and are not managed by Config Connector.

## Checking Resource Status

Every Config Connector resource has a status section that tells you whether the reconciliation succeeded.

```bash
# Get the status conditions for a resource
kubectl get storagebucket my-app-data-bucket -o jsonpath='{.status.conditions[*]}'

# Watch for the resource to become ready
kubectl wait --for=condition=Ready storagebucket/my-app-data-bucket --timeout=300s
```

A healthy resource will have a condition with type "Ready" and status "True". If the status is "False", the message field will tell you what went wrong.

## Organizing Resources with Kustomize

For real-world projects, organize your Config Connector resources using Kustomize.

```yaml
# kustomization.yaml
# Organize all infrastructure resources for the application
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: my-app
commonAnnotations:
  cnrm.cloud.google.com/project-id: "my-project-id"
resources:
  - storage-bucket.yaml
  - vpc-network.yaml
  - subnet.yaml
  - pubsub-topic.yaml
  - pubsub-subscription.yaml
  - service-account.yaml
  - iam-binding.yaml
```

This approach lets you apply all resources at once and share common annotations across them.

```bash
# Apply all infrastructure resources together
kubectl apply -k ./infrastructure/
```

## Summary

Config Connector brings the declarative, GitOps-friendly approach of Kubernetes to GCP infrastructure management. You define your resources in YAML, version them in Git, and let Config Connector handle the reconciliation. The reference system ensures proper ordering, and status conditions give you visibility into what is happening. Start with simple resources like storage buckets and topics, then expand to more complex setups as you get comfortable with the patterns.
