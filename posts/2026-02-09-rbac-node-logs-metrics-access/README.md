# How to Configure RBAC to Allow Node Logs and Metrics Access Without Full Node

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Node, Monitoring, Security

Description: Learn how to grant RBAC permissions for accessing node logs and metrics data without giving users full node management privileges that could compromise cluster security.

---

Node-level observability is critical for troubleshooting Kubernetes clusters. Platform teams need to collect metrics, read system logs, and monitor node health without disrupting workloads. The challenge is granting this access without exposing node management capabilities that could let users drain nodes, modify labels, or worse, manipulate node conditions to trigger pod evictions.

Basic read-only node permissions are too restrictive for real observability needs. They allow reading node objects but not accessing kubelet logs or metrics endpoints. The cluster-admin role grants full access but includes dangerous permissions like the ability to delete nodes or update taints. The solution lies in creating custom roles that grant precise observability permissions.

## Understanding Node Resource Permissions

Kubernetes nodes expose several API endpoints with different permission requirements:

**Node Objects**: Basic information about node capacity, conditions, and addresses. Requires `get`, `list`, and `watch` verbs on the `nodes` resource.

**Node Logs**: System logs exposed by the kubelet `/logs/` endpoint. Requires the `get` verb on the `nodes/log` subresource when using kubelet webhook authorization.

**Node Metrics**: CPU, memory, disk, and network metrics via the kubelet `/metrics` endpoint. Requires the `get` verb on the `nodes/metrics` subresource when using kubelet webhook authorization.

**Node Proxy**: Proxying to kubelet endpoints through the Kubernetes API server. Requires the `nodes/proxy` subresource; the exact RBAC verb depends on the HTTP method, such as `get` for `GET` requests.

**Node Stats**: Summary statistics from the kubelet `/stats/` endpoint. Requires the `get` verb on the `nodes/stats` subresource, although metrics-server 0.6 and later queries `/metrics/resource` instead of `/stats/summary`.

## Creating a Node Observer Role

Build a role that allows reading node information and accessing logs without modification capabilities:

```yaml
# node-observer-clusterrole.yaml

apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-observer
rules:
# Read node objects
- apiGroups: [""]
  resources:
    - nodes
  verbs: ["get", "list", "watch"]

# Access node logs
- apiGroups: [""]
  resources:
    - nodes/log
  verbs: ["get"]

# Access node metrics
- apiGroups: [""]
  resources:
    - nodes/metrics
  verbs: ["get"]

# Access node stats summary
- apiGroups: [""]
  resources:
    - nodes/stats
  verbs: ["get"]

# Read node status (part of node object)
- apiGroups: [""]
  resources:
    - nodes/status
  verbs: ["get"]

# Read events related to nodes
- apiGroups: [""]
  resources:
    - events
  verbs: ["get", "list", "watch"]
```

Apply the ClusterRole:

```bash
kubectl apply -f node-observer-clusterrole.yaml
```

Bind it to the monitoring team:

```yaml
# node-observer-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: monitoring-node-observer
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: node-observer
subjects:
- kind: Group
  name: "monitoring-team"
  apiGroup: rbac.authorization.k8s.io
- kind: ServiceAccount
  name: prometheus
  namespace: monitoring
```

Apply the binding:

```bash
kubectl apply -f node-observer-binding.yaml
```

Users and ServiceAccounts with this role can read node information and access logs but cannot modify node objects, drain workloads, or delete nodes.

## Accessing Node Logs

With the node-observer role, a ServiceAccount can retrieve logs directly from the kubelet HTTPS endpoint:

```bash
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
NODE_IP=10.0.1.12

# Get kubelet logs from a specific node
curl -sk --header "Authorization: Bearer $TOKEN" \
  https://$NODE_IP:10250/logs/kubelet.log

# Get kernel logs (requires appropriate log path)
curl -sk --header "Authorization: Bearer $TOKEN" \
  https://$NODE_IP:10250/logs/kern.log

# Get container runtime logs
curl -sk --header "Authorization: Bearer $TOKEN" \
  https://$NODE_IP:10250/logs/containerd.log
```

The exact log paths depend on your node OS and logging configuration. Common paths include:

```bash
# List available logs on a node
curl -sk --header "Authorization: Bearer $TOKEN" \
  https://$NODE_IP:10250/logs/

# Alternative: Use kubectl debug with separate pod and host access permissions
kubectl debug node/worker-node-1 -it --image=busybox
# Then access logs at /host/var/log/
```

Actually, `kubectl debug` requires additional permissions. For pure node log access without debug capabilities, use the direct kubelet `/logs/` endpoint with `nodes/log` permissions.

## Collecting Node Metrics

Access node metrics through the kubelet metrics endpoint:

```bash
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
NODE_IP=10.0.1.12

# Get kubelet metrics in Prometheus format
curl -sk --header "Authorization: Bearer $TOKEN" \
  https://$NODE_IP:10250/metrics

# Get cadvisor metrics (container metrics)
curl -sk --header "Authorization: Bearer $TOKEN" \
  https://$NODE_IP:10250/metrics/cadvisor

# Get resource metrics used by metrics-server 0.6 and later
curl -sk --header "Authorization: Bearer $TOKEN" \
  https://$NODE_IP:10250/metrics/resource

# Parse specific metrics
curl -sk --header "Authorization: Bearer $TOKEN" \
  https://$NODE_IP:10250/metrics | grep node_cpu
```

For Prometheus or other monitoring systems, configure ServiceAccount with node-observer permissions:

```yaml
# prometheus-node-scrape-config.yaml
scrape_configs:
- job_name: 'kubernetes-nodes'
  scheme: https
  metrics_path: /metrics
  kubernetes_sd_configs:
  - role: node
  tls_config:
    ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
  bearer_token_file: /var/run/secrets/kubernetes.io/serviceaccount/token
  relabel_configs:
  - action: labelmap
    regex: __meta_kubernetes_node_label_(.+)
  - source_labels: [__meta_kubernetes_node_address_InternalIP]
    regex: (.+)
    target_label: __address__
    replacement: ${1}:10250
```

The Prometheus ServiceAccount needs the node-observer role to scrape these endpoints. If your kubelet serving certificates are not signed by the ServiceAccount CA bundle, configure `tls_config` with the correct CA or server name for your cluster.

## Allowing Node Proxy Access for Debugging

Node proxy access lets you query any HTTP endpoint the kubelet exposes. This is powerful for debugging but can expose sensitive information. Grant it carefully:

```yaml
# node-debugger-clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: node-debugger
rules:
# Include all node-observer permissions
- apiGroups: [""]
  resources:
    - nodes
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources:
    - nodes/log
    - nodes/metrics
    - nodes/stats
    - nodes/status
  verbs: ["get"]

# Add proxy access
- apiGroups: [""]
  resources:
    - nodes/proxy
  verbs: ["get"]
```

With proxy access, users can query kubelet endpoints through the API server:

```bash
# Query kubelet healthz endpoint
kubectl get --raw /api/v1/nodes/worker-node-1/proxy/healthz

# Get kubelet configz (running configuration)
kubectl get --raw /api/v1/nodes/worker-node-1/proxy/configz

# Query specific pod metrics
kubectl get --raw /api/v1/nodes/worker-node-1/proxy/metrics/resource
```

Only grant this to trusted operators who need deep node-level debugging.

## Preventing Dangerous Node Operations

Explicitly document what permissions you are NOT granting to make security boundaries clear:

```yaml
# These permissions are NOT included in node-observer
# - nodes: create, update, patch, delete
#   Prevents node manipulation, draining, cordoning
# - nodes/proxy: delete
#   Prevents DELETE proxy requests
# - No access to node SSH or host filesystem
#   Use kubectl debug with separate permissions for that
```

Test that restricted operations fail:

```bash
# These should all fail with forbidden errors
kubectl cordon worker-node-1  # update permission needed
kubectl drain worker-node-1   # multiple permissions needed
kubectl delete node worker-node-1  # delete permission needed
kubectl label node worker-node-1 new-label=value  # update permission needed
```

## Accessing Metrics-Server Data

Metrics-server aggregates node metrics and requires different permissions:

```yaml
# metrics-reader-clusterrole.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: metrics-reader
rules:
# Access metrics-server API
- apiGroups: ["metrics.k8s.io"]
  resources:
    - nodes
    - pods
  verbs: ["get", "list"]
```

This allows using kubectl top:

```bash
# View node metrics
kubectl top nodes

# View pod metrics
kubectl top pods --all-namespaces
```

Combine metrics-reader with node-observer for complete observability:

```yaml
# observability-team-binding.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: observability-team
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: node-observer
subjects:
- kind: Group
  name: "sre-team"
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: observability-team-metrics
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: metrics-reader
subjects:
- kind: Group
  name: "sre-team"
  apiGroup: rbac.authorization.k8s.io
```

## Monitoring Node Conditions and Events

Node conditions indicate node health. Read them without modification rights:

```bash
# Get node conditions
kubectl get nodes -o json | jq '.items[].status.conditions'

# Watch for node events
kubectl get events --field-selector involvedObject.kind=Node --watch

# Filter for node pressure events
kubectl get events --field-selector involvedObject.kind=Node,reason=NodeHasDiskPressure
```

Create alerts based on node conditions without needing update permissions:

```yaml
# Example Prometheus alert rule
groups:
- name: node-health
  rules:
  - alert: NodeNotReady
    expr: kube_node_status_condition{condition="Ready",status="true"} == 0
    for: 5m
    annotations:
      summary: "Node {{ $labels.node }} is not ready"
```

## Building Node Observability Dashboards

Combine node metrics, logs, and events in Grafana dashboards. The monitoring ServiceAccount needs appropriate permissions:

```bash
# Grant node-observer to Grafana ServiceAccount
kubectl create clusterrolebinding grafana-node-observer \
  --clusterrole=node-observer \
  --serviceaccount=monitoring:grafana

# Grant metrics access
kubectl create clusterrolebinding grafana-metrics-reader \
  --clusterrole=metrics-reader \
  --serviceaccount=monitoring:grafana
```

Query node metrics in Grafana:

```promql
# Node CPU usage
node_cpu_seconds_total

# Node memory usage
node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes

# Node disk usage
node_filesystem_avail_bytes / node_filesystem_size_bytes
```

## Auditing Node Access

Track who accesses node logs and metrics:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
# Log API-server node proxy access
- level: Metadata
  resources:
  - group: ""
    resources: ["nodes/proxy"]
  verbs: ["get"]

# Log kubelet SubjectAccessReview bodies for direct kubelet access checks
- level: Request
  resources:
  - group: "authorization.k8s.io"
    resources: ["subjectaccessreviews"]
  verbs: ["create"]
```

Review audit logs for suspicious patterns:

```bash
# Find SubjectAccessReviews for direct kubelet log access
jq 'select(.objectRef.resource=="subjectaccessreviews") |
    select(.requestObject.spec.resourceAttributes.resource=="nodes") |
    select(.requestObject.spec.resourceAttributes.subresource=="log")' \
  /var/log/kubernetes/audit.log

# Identify users accessing many nodes rapidly (potential scanning)
jq 'select(.objectRef.resource=="subjectaccessreviews") |
    select(.requestObject.spec.resourceAttributes.resource=="nodes") |
    select(.requestObject.spec.resourceAttributes.subresource=="log") |
    .requestObject.spec.user' \
  /var/log/kubernetes/audit.log | sort | uniq -c | sort -rn
```

Granting node observability without full node permissions strikes the right balance for most monitoring and troubleshooting scenarios. Teams get the visibility they need while cluster administrators retain control over node lifecycle management and cluster stability operations. This separation ensures that observability tools cannot accidentally or maliciously disrupt cluster operations.
