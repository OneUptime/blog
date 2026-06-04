# How to Use AKS KEDA Add-On for Built-In Event-Driven Autoscaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Azure, AKS, KEDA, Autoscaling

Description: Learn how to enable and configure the AKS KEDA add-on for event-driven autoscaling based on Azure Service Bus, Storage Queues, Cosmos DB, and custom metrics.

---

KEDA (Kubernetes Event Driven Autoscaling) extends Kubernetes autoscaling capabilities beyond CPU and memory metrics. It scales workloads based on external event sources like message queues, databases, and custom metrics. The AKS KEDA add-on provides managed KEDA installation with automatic updates and Azure integration.

## Understanding KEDA Architecture

KEDA operates alongside the standard Horizontal Pod Autoscaler (HPA). It monitors external metrics from scalers (event sources) and creates or updates HPA resources based on those metrics. When no events are present, KEDA can scale deployments to zero, reducing costs for intermittent workloads.

The architecture includes several components: the KEDA operator manages ScaledObject and ScaledJob resources, the metrics server exposes external metrics to HPA, and scalers connect to event sources to retrieve metrics.

Unlike traditional autoscaling that relies on cluster metrics, KEDA pulls metrics directly from external systems. This enables scaling based on queue depth, database connections, HTTP request rates, or any custom metric accessible via API.

## Enabling KEDA Add-On

Enable KEDA on existing AKS clusters or during creation:

```bash
# Enable on existing cluster

az aks update \
  --resource-group production-rg \
  --name production-cluster \
  --enable-keda

# Verify KEDA is installed
kubectl get pods -n kube-system -l app.kubernetes.io/name=keda-operator

# Verify the add-on is enabled
az aks show \
  --resource-group production-rg \
  --name production-cluster \
  --query "workloadAutoScalerProfile.keda.enabled"

# Check KEDA version
kubectl get deployment keda-operator -n kube-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

For new clusters, enable during creation:

```bash
az aks create \
  --resource-group production-rg \
  --name production-cluster \
  --enable-keda \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --generate-ssh-keys
```

KEDA installs in the kube-system namespace with the operator, metrics API server, and admission webhook components.

## Scaling Based on Azure Service Bus Queue

Service Bus queues are common triggers for event-driven workloads. Scale applications based on queue message count:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: servicebus-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: message-processor
  minReplicaCount: 0
  maxReplicaCount: 30
  triggers:
  - type: azure-servicebus
    metadata:
      queueName: orders-queue
      namespace: myservicebus
      messageCount: "5"
    authenticationRef:
      name: servicebus-auth
```

Create the authentication secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: servicebus-connection
  namespace: production
type: Opaque
data:
  connection: <base64-encoded-connection-string>
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: servicebus-auth
  namespace: production
spec:
  secretTargetRef:
  - parameter: connection
    name: servicebus-connection
    key: connection
```

Deploy the message processor:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: message-processor
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: processor
  template:
    metadata:
      labels:
        app: processor
    spec:
      containers:
      - name: processor
        image: myregistry.azurecr.io/message-processor:latest
        env:
        - name: SERVICE_BUS_CONNECTION
          valueFrom:
            secretKeyRef:
              name: servicebus-connection
              key: connection
```

Apply the resources:

```bash
kubectl apply -f servicebus-auth.yaml
kubectl apply -f processor-deployment.yaml
kubectl apply -f servicebus-scaler.yaml

# Watch scaling behavior
kubectl get hpa -n production -w

# Check available external metrics
kubectl get --raw /apis/external.metrics.k8s.io/v1beta1/namespaces/production
```

As messages arrive in the queue, KEDA scales the deployment up. When the queue empties, it scales back to zero.

## Autoscaling with Azure Storage Queue

Storage queues provide cost-effective message queueing for high-volume scenarios:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: storage-queue-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: queue-worker
  minReplicaCount: 0
  maxReplicaCount: 20
  triggers:
  - type: azure-queue
    metadata:
      queueName: tasks
      queueLength: "10"
      accountName: mystorageaccount
    authenticationRef:
      name: storage-auth
```

Create authentication using managed identity:

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: storage-auth
  namespace: production
spec:
  podIdentity:
    provider: azure-workload
    identityId: <identity-client-id>
```

Enable workload identity on the cluster:

```bash
# Enable workload identity
az aks update \
  --resource-group production-rg \
  --name production-cluster \
  --enable-oidc-issuer \
  --enable-workload-identity

# Get OIDC issuer URL
OIDC_URL=$(az aks show \
  --resource-group production-rg \
  --name production-cluster \
  --query oidcIssuerProfile.issuerUrl \
  -o tsv)

# Create managed identity
MI_CLIENT_ID=$(az identity create \
  --resource-group production-rg \
  --name keda-queue-identity \
  --query "clientId" \
  -o tsv)

MI_OBJECT_ID=$(az identity show \
  --resource-group production-rg \
  --name keda-queue-identity \
  --query "principalId" \
  -o tsv)

# Grant Storage Queue Data Contributor role
az role assignment create \
  --role "Storage Queue Data Contributor" \
  --assignee-object-id $MI_OBJECT_ID \
  --assignee-principal-type ServicePrincipal \
  --scope /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.Storage/storageAccounts/mystorageaccount

# Create federated credential for the KEDA operator
az identity federated-credential create \
  --name keda-queue-federated \
  --identity-name keda-queue-identity \
  --resource-group production-rg \
  --issuer $OIDC_URL \
  --subject system:serviceaccount:kube-system:keda-operator \
  --audience api://AzureADTokenExchange

# Bind the identity to the KEDA operator and restart it
kubectl annotate serviceaccount keda-operator \
  azure.workload.identity/client-id=$MI_CLIENT_ID \
  -n kube-system

kubectl rollout restart deployment keda-operator -n kube-system
```

If the worker application also uses the same managed identity to process queue messages, create a second federated credential and update the deployment to use workload identity:

```bash
az identity federated-credential create \
  --name queue-worker-federated \
  --identity-name keda-queue-identity \
  --resource-group production-rg \
  --issuer $OIDC_URL \
  --subject system:serviceaccount:production:queue-worker-sa \
  --audience api://AzureADTokenExchange
```

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: queue-worker-sa
  namespace: production
  annotations:
    azure.workload.identity/client-id: <identity-client-id>
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-worker
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: queue-worker
  template:
    metadata:
      labels:
        app: queue-worker
        azure.workload.identity/use: "true"
    spec:
      serviceAccountName: queue-worker-sa
      containers:
      - name: worker
        image: myregistry.azurecr.io/queue-worker:latest
        env:
        - name: STORAGE_ACCOUNT
          value: mystorageaccount
        - name: QUEUE_NAME
          value: tasks
```

## Scaling Based on Cosmos DB Change Feed Lag

Scale Cosmos DB change feed consumers with the KEDA Azure Cosmos DB external scaler. Install the external scaler alongside KEDA:

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

helm install external-scaler-azure-cosmos-db \
  kedacore/external-scaler-azure-cosmos-db \
  --namespace kube-system
```

Then create a ScaledObject that points to the external scaler and the monitored and lease containers:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cosmosdb-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: document-processor
  minReplicaCount: 1
  maxReplicaCount: 15
  triggers:
  - type: external
    metadata:
      scalerAddress: external-scaler-azure-cosmos-db.kube-system:4050
      databaseId: mydb
      containerId: pending-items
      leaseDatabaseId: mydb
      leaseContainerId: leases
      connectionFromEnv: COSMOS_CONNECTION
      leaseConnectionFromEnv: COSMOS_CONNECTION
      processorName: document-processor
```

Store the Cosmos DB connection string and expose it to the target deployment:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: cosmosdb-secret
  namespace: production
type: Opaque
data:
  connection: <base64-encoded-connection-string>
```

Add this environment variable to the `document-processor` container:

```yaml
env:
- name: COSMOS_CONNECTION
  valueFrom:
    secretKeyRef:
      name: cosmosdb-secret
      key: connection
```

The external scaler estimates pending change feed work from the monitored and lease containers and scales the deployment based on the remaining partition ranges.

## Event-Driven Jobs with ScaledJob

For one-time processing tasks, use ScaledJob instead of ScaledObject:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: batch-processor
  namespace: production
spec:
  jobTargetRef:
    template:
      spec:
        containers:
        - name: processor
          image: myregistry.azurecr.io/batch-processor:latest
          env:
          - name: SERVICE_BUS_CONNECTION
            valueFrom:
              secretKeyRef:
                name: servicebus-connection
                key: connection
        restartPolicy: Never
  pollingInterval: 30
  maxReplicaCount: 10
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  triggers:
  - type: azure-servicebus
    metadata:
      queueName: batch-jobs
      namespace: myservicebus
      messageCount: "1"
    authenticationRef:
      name: servicebus-auth
```

ScaledJob creates a Kubernetes Job for each batch of messages. Jobs run to completion and are not restarted like pods in deployments.

## Custom Metrics Scaling

Scale based on custom metrics from Azure Monitor or Application Insights:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: custom-metrics-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: api-server
  minReplicaCount: 2
  maxReplicaCount: 20
  triggers:
  - type: azure-monitor
    metadata:
      resourceURI: Microsoft.Insights/components/myappinsights
      tenantId: <tenant-id>
      subscriptionId: <subscription-id>
      resourceGroupName: production-rg
      metricName: requests/count
      metricAggregationType: Total
      metricFilter: cloud/roleName eq 'api-server'
      targetValue: "1000"
      activationTargetValue: "500"
    authenticationRef:
      name: azure-monitor-auth
```

Use managed identity for authentication:

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: azure-monitor-auth
  namespace: production
spec:
  podIdentity:
    provider: azure-workload
    identityId: <identity-client-id>
```

Grant the managed identity Monitoring Reader role:

```bash
az role assignment create \
  --role "Monitoring Reader" \
  --assignee-object-id <identity-principal-id> \
  --assignee-principal-type ServicePrincipal \
  --scope /subscriptions/<subscription-id>/resourceGroups/production-rg
```

## HTTP Request-Based Scaling

Use KEDA HTTP add-on for scaling based on incoming HTTP requests:

```bash
# Install KEDA HTTP add-on
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

helm install http-add-on kedacore/keda-add-ons-http \
  --namespace kube-system \
  --set interceptor.replicas=2
```

Create an InterceptorRoute to route matching HTTP traffic to the service:

```yaml
apiVersion: http.keda.sh/v1beta1
kind: InterceptorRoute
metadata:
  name: web-app-route
  namespace: production
spec:
  target:
    service: web-app-service
    port: 8080
  rules:
  - hosts:
    - webapp.example.com
    pathPrefixes:
    - /api
  scalingMetric:
    concurrency:
      targetValue: 100
```

Create the ScaledObject that uses the HTTP add-on scaler:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: web-app-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: web-app
  minReplicaCount: 0
  maxReplicaCount: 30
  triggers:
  - type: external-push
    metadata:
      scalerAddress: keda-add-ons-http-external-scaler.kube-system:9090
      interceptorRoute: web-app-route
```

The HTTP add-on intercepts requests and scales the application based on request concurrency or request rate metrics.

## Monitoring KEDA Performance

Track KEDA metrics and scaling events:

```bash
# View KEDA operator logs
kubectl logs -n kube-system -l app.kubernetes.io/name=keda-operator

# Check scaled object status
kubectl get scaledobject -n production
kubectl describe scaledobject servicebus-scaler -n production

# Monitor HPA created by KEDA
kubectl get hpa -n production
kubectl describe hpa keda-hpa-servicebus-scaler -n production
```

Enable Azure Monitor for KEDA metrics:

```bash
# Create diagnostic settings for cluster
az monitor diagnostic-settings create \
  --resource /subscriptions/<subscription-id>/resourceGroups/production-rg/providers/Microsoft.ContainerService/managedClusters/production-cluster \
  --name keda-diagnostics \
  --workspace /subscriptions/<subscription-id>/resourceGroups/monitoring-rg/providers/Microsoft.OperationalInsights/workspaces/aks-monitoring \
  --logs '[{"category": "kube-audit", "enabled": true}]' \
  --metrics '[{"category": "AllMetrics", "enabled": true}]'
```

Query scaling events in Log Analytics:

```kusto
KubePodInventory
| where Namespace == "production"
| where Name startswith "message-processor"
| summarize count() by bin(TimeGenerated, 5m)
| render timechart
```

## Troubleshooting Scaling Issues

Common issues include authentication failures, incorrect metric queries, and scaling delays.

Debug scaler connectivity:

```bash
# Check scaler logs
kubectl logs -n kube-system -l app.kubernetes.io/name=keda-operator --tail=100 | grep ERROR

# Verify authentication
kubectl get triggerauthentication -n production
kubectl describe triggerauthentication servicebus-auth -n production

# Test metric retrieval
kubectl get --raw /apis/external.metrics.k8s.io/v1beta1
```

If scaling does not occur:

```bash
# Check scaled object events
kubectl describe scaledobject servicebus-scaler -n production

# Verify HPA is created
kubectl get hpa -n production

# Check current metric value
kubectl get hpa keda-hpa-servicebus-scaler -n production -o yaml
```

Test Service Bus connectivity manually:

```bash
kubectl run test-pod --image=mcr.microsoft.com/azure-cli --rm -it -- bash

# Inside the pod
az servicebus queue show \
  --resource-group production-rg \
  --namespace-name myservicebus \
  --name orders-queue \
  --query countDetails.activeMessageCount
```

The AKS KEDA add-on simplifies event-driven autoscaling by providing managed KEDA with seamless Azure integration. It enables cost-effective scaling based on actual workload demand rather than resource utilization alone.
