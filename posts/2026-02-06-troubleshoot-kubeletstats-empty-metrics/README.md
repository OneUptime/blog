# How to Troubleshoot the Kubeletstats Receiver Returning Empty Metrics Due to

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubelet, Metric, Kubernetes

Description: Troubleshoot the kubeletstats receiver returning empty metrics because of read-only kubelet port and authentication issues.

The `kubeletstats` receiver in the OpenTelemetry Collector is designed to collect node-level and pod-level resource metrics (CPU, memory, network, filesystem) directly from the Kubelet API. When it returns empty metrics, the issue is almost always related to how the receiver authenticates with the Kubelet or which port it connects to.

## Understanding Kubelet Ports

Every Kubernetes node runs a Kubelet API. The common ports are:

```text
Port 10250 - Secure Kubelet API, requires authentication (default)
Port 10255 - Read-only Kubelet API, no authentication (often disabled in production)
```

Many clusters disable port 10255 for security. If your receiver is configured to use the read-only port and it is disabled, you get no metrics.

## Diagnosing the Problem

```bash
# Check the Collector logs for kubeletstats errors

kubectl logs -n observability -l app=otel-collector | grep -i "kubelet\|stats"

# Common errors:
# "failed to get stats from kubelet: Get http://node-ip:10255/stats/summary: connection refused"
# "failed to get stats from kubelet: Unauthorized"
# "failed to get stats from kubelet: Forbidden"
```

Test connectivity to the Kubelet from the Collector pod:

```bash
# Test the read-only port (might be disabled)
kubectl exec -it otel-collector-pod -n observability -- \
  sh -c 'curl -s http://"$NODE_IP":10255/stats/summary | head -20'

# Test the authenticated port
kubectl exec -it otel-collector-pod -n observability -- \
  sh -c 'curl -sk https://"$NODE_IP":10250/stats/summary \
    --header "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)"'
```

## Fix 1: Use the Authenticated Port (10250)

Configure the receiver to use port 10250 with ServiceAccount token authentication:

```yaml
receivers:
  kubeletstats:
    collection_interval: 30s
    auth_type: serviceAccount  # Use the pod's ServiceAccount token
    endpoint: "https://${env:NODE_NAME}:10250"
    insecure_skip_verify: true  # Skip TLS verification for kubelet's self-signed cert
    # Or provide the kubelet CA:
    # ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
```

The Collector pod needs the node name as an environment variable:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
        - name: collector
          env:
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            - name: NODE_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.hostIP
```

## Fix 2: Add RBAC for Kubelet Stats

The ServiceAccount needs permission to access the Kubelet stats endpoint:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector-kubelet
rules:
  # Permission to get node stats
  - apiGroups: [""]
    resources: ["nodes/stats"]
    verbs: ["get"]
  # Needed when using extra_metadata_labels or request/limit utilization metrics
  - apiGroups: [""]
    resources: ["nodes/pods"]
    verbs: ["get"]
  # Needed when k8s_api_config collects detailed volume metadata from PVCs
  - apiGroups: [""]
    resources: ["persistentvolumeclaims"]
    verbs: ["get"]
  - apiGroups: [""]
    resources: ["persistentvolumes"]
    verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector-kubelet
subjects:
  - kind: ServiceAccount
    name: otel-collector
    namespace: observability
roleRef:
  kind: ClusterRole
  name: otel-collector-kubelet
  apiGroup: rbac.authorization.k8s.io
```

## Fix 3: Handle Cloud Provider Specifics

Different managed Kubernetes services have different Kubelet configurations:

### EKS (AWS)

EKS disables the read-only port by default. Use `serviceAccount` auth:

```yaml
receivers:
  kubeletstats:
    auth_type: serviceAccount
    endpoint: "https://${env:NODE_IP}:10250"
    insecure_skip_verify: true
```

### GKE (Google Cloud)

GKE is moving away from the insecure read-only port. Use port 10250 with `serviceAccount` auth:

```yaml
receivers:
  kubeletstats:
    auth_type: serviceAccount
    endpoint: "https://${env:NODE_IP}:10250"
    insecure_skip_verify: true
```

### AKS (Azure)

AKS typically works with the standard `serviceAccount` auth, but you might need to provide the kubelet server certificate as `ca_file` if you do not use `insecure_skip_verify`.

## Fix 4: Use Extra Metadata

Configure the receiver to collect additional metadata for richer metrics:

```yaml
receivers:
  kubeletstats:
    collection_interval: 30s
    auth_type: serviceAccount
    endpoint: "https://${env:NODE_NAME}:10250"
    insecure_skip_verify: true
    # Collect all metric categories
    metric_groups:
      - node
      - pod
      - container
      - volume
    # Add Kubernetes metadata to metrics
    extra_metadata_labels:
      - container.id
      - k8s.volume.type
    k8s_api_config:
      auth_type: serviceAccount
```

## Verifying Metrics Flow

After applying the fixes, verify that metrics are being collected:

```bash
# Check the Collector's internal metrics
kubectl exec -it otel-collector-pod -n observability -- \
  curl -s http://localhost:8888/metrics | grep kubeletstats

# Look for the receiver metrics
# otelcol_receiver_accepted_metric_points{receiver="kubeletstats"} > 0

# Check the Collector logs for successful scrapes
kubectl logs -n observability -l app=otel-collector | grep "kubeletstats" | tail -10
```

The kubeletstats receiver gives you node and pod level resource metrics without deploying additional monitoring agents. Getting the authentication right is the main hurdle, and using `serviceAccount` auth with port 10250 is the most reliable approach across different Kubernetes distributions.
