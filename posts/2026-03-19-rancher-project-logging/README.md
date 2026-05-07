# How to Configure Project-Level Logging in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Logging

Description: Learn how to set up namespace-scoped logging in Rancher using Outputs and Flows for team-specific log management.

Project-level logging in Rancher allows teams to manage their own log collection and routing within their project namespaces. Unlike cluster-level logging which requires cluster admin permissions, project-level logging uses namespace-scoped Output and Flow resources that project owners can create and manage. This guide covers setting up and managing project-level logging.

## Prerequisites

- Rancher v2.6 or later with the Logging chart installed.
- Project owner permissions in the target project.
- A log storage destination accessible from the cluster.

## Understanding Project-Level Logging

In Rancher's logging architecture:

- **ClusterOutput / ClusterFlow**: Cluster-wide resources in `cattle-logging-system` namespace. Requires cluster admin.
- **Output / Flow**: Namespace-scoped resources. Can be created by project owners in their project namespaces.

Flows can only reference Outputs in the same namespace, or ClusterOutputs that have been made available cluster-wide.

## Step 1: Create a Namespace-Scoped Output

Create an Output resource in your application namespace:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: Output
metadata:
  name: team-elasticsearch
  namespace: my-team-namespace
spec:
  elasticsearch:
    host: elasticsearch.logging.svc.cluster.local
    port: 9200
    scheme: https
    user: elastic
    password:
      valueFrom:
        secretKeyRef:
          name: es-credentials
          key: password
    index_name: my-team-logs
    buffer:
      type: file
      path: /buffers/team-es
      chunk_limit_size: 8MB
      total_limit_size: 1GB
      flush_interval: 5s
      retry_forever: true
```

Create the credentials secret in the same namespace:

```bash
kubectl create secret generic es-credentials \
  --namespace my-team-namespace \
  --from-literal=password='your-password'
```

Apply:

```bash
kubectl apply -f team-output.yaml
```

## Step 2: Create a Namespace-Scoped Flow

Create a Flow that collects logs from the namespace and sends them to the Output:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: Flow
metadata:
  name: team-log-flow
  namespace: my-team-namespace
spec:
  localOutputRefs:
    - team-elasticsearch
```

This Flow collects all logs from the `my-team-namespace` namespace.

## Step 3: Filter Logs by Labels

Collect logs only from specific workloads:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: Flow
metadata:
  name: api-logs
  namespace: my-team-namespace
spec:
  match:
    - select:
        labels:
          app: api-server
  localOutputRefs:
    - team-elasticsearch
```

## Step 4: Add Log Processing Filters

Process logs before sending them to the output:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: Flow
metadata:
  name: processed-team-logs
  namespace: my-team-namespace
spec:
  filters:
    # Parse JSON log lines
    - parser:
        parse:
          type: json
        key_name: log
        reserve_data: true
        remove_key_name_field: true

    # Add team metadata
    - record_transformer:
        records:
          - team: "backend"
            service: "api"

    # Remove verbose debug logs
    - grep:
        exclude:
          - key: level
            pattern: "debug"

    # Remove top-level sensitive fields
    - record_transformer:
        remove_keys: "password,secret,token,api_key"

  localOutputRefs:
    - team-elasticsearch
```

## Step 5: Route Logs to Multiple Outputs

Send logs to multiple outputs, with error logs also going to a dedicated output:

```yaml
# Error logs also go to a dedicated output

apiVersion: logging.banzaicloud.io/v1beta1
kind: Flow
metadata:
  name: error-logs
  namespace: my-team-namespace
spec:
  match:
    - select:
        labels:
          app: api-server
  filters:
    - grep:
        regexp:
          - key: level
            pattern: "error|fatal"
  localOutputRefs:
    - error-elasticsearch-output
---
# All logs go to a general output
apiVersion: logging.banzaicloud.io/v1beta1
kind: Flow
metadata:
  name: all-logs
  namespace: my-team-namespace
spec:
  localOutputRefs:
    - general-elasticsearch-output
```

## Step 6: Reference ClusterOutputs from Flows

If a cluster admin has created ClusterOutputs, project-level Flows can reference them:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: Flow
metadata:
  name: team-flow-with-cluster-output
  namespace: my-team-namespace
spec:
  globalOutputRefs:
    - cluster-wide-elasticsearch
  localOutputRefs:
    - team-specific-output
```

This sends logs to both the cluster-wide output and the team-specific output.

## Step 7: Configure Output for Loki

A common project-level setup using Loki:

```yaml
apiVersion: logging.banzaicloud.io/v1beta1
kind: Output
metadata:
  name: team-loki
  namespace: my-team-namespace
spec:
  loki:
    url: http://loki.logging.svc.cluster.local:3100
    labels:
      team: backend
      namespace: my-team-namespace
    extract_kubernetes_labels: true
    buffer:
      type: file
      path: /buffers/loki
      chunk_limit_size: 8MB
      flush_interval: 5s
---
apiVersion: logging.banzaicloud.io/v1beta1
kind: Flow
metadata:
  name: team-loki-flow
  namespace: my-team-namespace
spec:
  localOutputRefs:
    - team-loki
```

## Step 8: Configure via the Rancher UI

1. In Rancher, click **☰ > Cluster Management**.
2. On the **Clusters** page, open the target cluster and click **Explore**.
3. In the left navigation menu, click **Logging**.
4. Switch to the **Outputs** tab and click **Create**.
5. Select the output type (Elasticsearch, Loki, Splunk, etc.).
6. Fill in the connection details.
7. Switch to the **Flows** tab and click **Create**.
8. Select the output reference and configure any filters.

## Step 9: Verify Project-Level Logging

Check that your Flow and Output are working:

```bash
# Check resources in your namespace
kubectl get outputs -n my-team-namespace
kubectl get flows -n my-team-namespace

# Check Fluentd logs for your namespace's flow
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd -c fluentd --tail=-1 | grep my-team-namespace

# Check for errors
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd -c fluentd --tail=-1 | grep -i error
```

## Step 10: Troubleshoot Project-Level Logging

Common issues:

**Logs not appearing**: Verify the Flow's match selectors match your pod labels.

```bash
kubectl get pods -n my-team-namespace --show-labels
```

**Output connection errors**: Check Fluentd logs for connection issues.

```bash
kubectl logs -n cattle-logging-system -l app.kubernetes.io/name=fluentd -c fluentd --tail=-1 | grep -i "failed\|error\|connection"
```

**Secret not found**: Ensure the credentials secret exists in the same namespace as the Output.

```bash
kubectl get secrets -n my-team-namespace
```

**Flow not picking up logs**: Check that the logging operator has reconciled the Flow.

```bash
kubectl describe flow team-log-flow -n my-team-namespace
```

## Summary

Project-level logging in Rancher enables teams to manage their own log collection within their namespaces using Output and Flow resources. Project owners can configure log destinations, filters, and routing rules without requiring cluster admin permissions. This approach supports multi-tenant clusters where each team needs independent control over their logging pipeline while the cluster admin maintains overall logging governance through ClusterOutputs and ClusterFlows.
