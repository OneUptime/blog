# How to Deploy KEDA with Azure Service Bus Trigger with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, KEDA, Azure, Service Bus, Autoscaling, Event-Driven

Description: Deploy KEDA with Azure Service Bus trigger using Flux CD to scale Kubernetes workloads based on Azure Service Bus queue and topic subscription message count.

---

## Introduction

Azure Service Bus is Microsoft's enterprise messaging service, offering queues, topics, and subscriptions for reliable cloud messaging. When running workloads on AKS or connecting Kubernetes to Azure-native services, the KEDA Azure Service Bus scaler enables automatic worker scaling based on message count - scaling out when messages accumulate and back to zero when the queue is empty.

Managing this scaling configuration through Flux CD means Service Bus connection strings, scaling thresholds, and namespace configuration are all version-controlled. Any change to autoscaling behavior flows through a pull request with a clear audit trail.

This guide covers deploying KEDA with the Azure Service Bus trigger using Flux CD, including Workload Identity authentication for AKS.

## Prerequisites

- KEDA deployed on your cluster (AKS or other)
- Azure Service Bus namespace with a queue or topic subscription
- Azure identity with `Azure Service Bus Data Receiver` role on the namespace
- Flux CD v2 bootstrapped to your Git repository

## Step 1: Configure Azure Workload Identity (AKS)

On AKS with Workload Identity enabled:

```bash
# Create a managed identity for KEDA workers
az identity create \
  --name keda-sbus-identity \
  --resource-group my-rg

# Assign Service Bus role
az role assignment create \
  --assignee $(az identity show --name keda-sbus-identity \
    --resource-group my-rg --query principalId -o tsv) \
  --role "Azure Service Bus Data Receiver" \
  --scope /subscriptions/<sub>/resourceGroups/my-rg/providers/Microsoft.ServiceBus/namespaces/my-sbus

# Create Federated Credential for KEDA
az identity federated-credential create \
  --name keda-sbus-fedcred \
  --identity-name keda-sbus-identity \
  --resource-group my-rg \
  --issuer "$(az aks show --name my-aks --resource-group my-rg --query oidcIssuerProfile.issuerUrl -o tsv)" \
  --subject "system:serviceaccount:app:sbus-worker-sa" \
  --audience api://AzureADTokenExchange
```

## Step 2: Create TriggerAuthentication

Using Azure Workload Identity (recommended for AKS):

```yaml
# clusters/my-cluster/keda-sbus/trigger-auth.yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-sbus-auth
  namespace: app
spec:
  podIdentity:
    provider: azure-workload
    identityId: <managed-identity-client-id>
```

Alternatively, using a connection string (with SOPS encryption):

```yaml
# clusters/my-cluster/keda-sbus/trigger-auth-conn.yaml
apiVersion: v1
kind: Secret
metadata:
  name: sbus-connection-string
  namespace: app
type: Opaque
stringData:
  connectionString: "Endpoint=sb://my-sbus.servicebus.windows.net/;SharedAccessKeyName=..."
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-sbus-auth
  namespace: app
spec:
  secretTargetRef:
    - parameter: connection
      name: sbus-connection-string
      key: connectionString
```

## Step 3: Create the ScaledObject for Queue

```yaml
# clusters/my-cluster/keda-sbus/queue-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sbus-queue-scaler
  namespace: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: sbus-worker
  minReplicaCount: 0
  maxReplicaCount: 30
  pollingInterval: 15
  cooldownPeriod: 120
  triggers:
    - type: azure-servicebus
      metadata:
        # Service Bus namespace
        namespace: my-sbus.servicebus.windows.net
        # Queue name (or use topicName + subscriptionName for topics)
        queueName: task-queue
        # Scale 1 replica per N messages
        messageCount: "10"
      authenticationRef:
        name: azure-sbus-auth
```

## Step 4: Create a Topic Subscription Scaler

```yaml
# clusters/my-cluster/keda-sbus/topic-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sbus-topic-scaler
  namespace: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: notification-worker
  minReplicaCount: 0
  maxReplicaCount: 15
  pollingInterval: 20
  cooldownPeriod: 90
  triggers:
    - type: azure-servicebus
      metadata:
        namespace: my-sbus.servicebus.windows.net
        # Topic and subscription for topic-based scaling
        topicName: notifications
        subscriptionName: email-sender
        messageCount: "5"
      authenticationRef:
        name: azure-sbus-auth
```

## Step 5: Deploy the Worker

```yaml
# clusters/my-cluster/keda-sbus/worker-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sbus-worker
  namespace: app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sbus-worker
  template:
    metadata:
      labels:
        app: sbus-worker
      annotations:
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: sbus-worker-sa
      containers:
        - name: worker
          image: myregistry/sbus-worker:v1.0.0
          env:
            - name: SERVICE_BUS_NAMESPACE
              value: "my-sbus.servicebus.windows.net"
            - name: QUEUE_NAME
              value: "task-queue"
          resources:
            requests:
              cpu: "250m"
              memory: "256Mi"
            limits:
              cpu: "1"
              memory: "512Mi"
          terminationGracePeriodSeconds: 60
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/flux-kustomization-keda-sbus.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: keda-azure-sbus
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: keda
  path: ./clusters/my-cluster/keda-sbus
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Best Practices

- Use Azure Workload Identity on AKS instead of connection strings - it eliminates secrets from Git and enables automatic credential rotation.
- Set `messageCount` based on your worker throughput so each replica clears its share of messages within your SLA window.
- Use dead-letter queue monitoring (Azure Monitor alerts on DLQ depth) alongside KEDA scaling to detect messages that consistently fail processing.
- Set `terminationGracePeriodSeconds` to exceed your maximum message lock duration so workers finish processing before termination during scale-down.
- For Service Bus Premium tier, take advantage of sessions - combine KEDA scaling with Azure Service Bus sessions for ordered, per-entity message processing.

## Conclusion

KEDA with the Azure Service Bus trigger managed by Flux CD provides a cloud-native, GitOps-driven approach to message-driven autoscaling for Azure workloads. Scaling policies, authentication configuration, and queue targets are all declared in Git, enabling teams to tune autoscaling behavior through code review while maintaining secure, zero-trust credential management via Workload Identity.
