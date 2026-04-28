# How to Optimize NeuVector Performance in Large Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NeuVector, Performance, Optimization, Large Scale, Kubernetes

Description: Optimize NeuVector's resource usage and performance for large Kubernetes clusters with hundreds of nodes and thousands of containers.

## Introduction

NeuVector's security capabilities come with resource overhead that must be tuned appropriately for large clusters. Without optimization, NeuVector can impact node performance, scanner throughput, and controller latency. This guide covers strategies for scaling NeuVector efficiently across clusters with 100+ nodes and 1000+ containers while maintaining security effectiveness.

## Performance Challenges at Scale

In large clusters, NeuVector faces:

- **Enforcer resource consumption**: Each node runs a privileged DaemonSet
- **Controller state**: Tracking thousands of containers in memory
- **Scanner queue depth**: Scanning many images concurrently
- **Network traffic monitoring**: DPI on high-throughput services
- **Policy compilation**: Large rule sets increase processing time

## Prerequisites

- NeuVector installed on a large cluster
- Monitoring stack (Prometheus/Grafana) for resource visibility
- Helm for configuration management
- Cluster admin access

## Step 1: Right-Size Controller Resources

Scale controller resources based on cluster size:

```yaml
# Large cluster controller configuration (>100 nodes)

controller:
  replicas: 3  # Always run 3 for HA
  resources:
    requests:
      cpu: "1000m"      # 1 CPU core
      memory: "1Gi"     # 1 GB RAM
    limits:
      cpu: "4000m"      # 4 CPU cores max
      memory: "4Gi"     # 4 GB RAM max

  # Enable controller persistence for faster restarts
  pvc:
    enabled: true
    storageClass: "fast-ssd"
    capacity: 10Gi
    accessModes:
      - ReadWriteMany

  # Persist controller configuration to the PVC
  env:
    - name: CTRL_PERSIST_CONFIG
      value: "1"
```

Apply via Helm:

```bash
helm upgrade neuvector neuvector/core \
  -n neuvector \
  --values large-cluster-values.yaml
```

## Step 2: Optimize Enforcer Resource Usage

Tune enforcers for your node size:

```yaml
# Enforcer configuration for 32-core nodes
enforcer:
  resources:
    requests:
      cpu: "200m"     # Minimal baseline
      memory: "512Mi"
    limits:
      cpu: "2000m"    # Allow burst for enforcement
      memory: "2Gi"

  # Tolerate all taints for full cluster coverage
  tolerations:
    - operator: Exists

  # Limit enforcer to worker nodes only (not control plane)
  affinity:
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: node-role.kubernetes.io/control-plane
                operator: DoesNotExist
```

## Step 3: Scale Scanner Replicas

For large image libraries, increase scanner throughput:

```bash
# Scale scanners based on registry size
# Rule of thumb: 1 scanner per 500 images to scan per hour

kubectl scale deployment neuvector-scanner-pod \
  --replicas=10 \
  -n neuvector

# Verify scanners are running
kubectl get pods -n neuvector -l app=neuvector-scanner-pod
```

```yaml
# Scanner resource optimization for high throughput
scanner:
  replicas: 10
  resources:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2000m"
      memory: "4Gi"
  # Spread scanners across nodes
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchLabels:
              app: neuvector-scanner-pod
          topologyKey: kubernetes.io/hostname
```

## Step 4: Optimize DPI for High-Throughput Services

DPI adds significant overhead for high-traffic services. Selectively apply it:

```bash
# Disable DPI for high-throughput, low-risk services
# (Keep DPI for internet-facing and sensitive services)

# Put batch processing services in Monitor mode (alerts only, no blocking)
for GROUP in $(curl -sk \
  "https://neuvector-manager:8443/v1/group?start=0&limit=100" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq -r '.groups[] | select(.name | contains("batch")) | .name'); do

  curl -sk -X PATCH \
    "https://neuvector-manager:8443/v1/group/${GROUP}" \
    -H "Content-Type: application/json" \
    -H "X-Auth-Token: ${TOKEN}" \
    -d '{"config": {"mode": "Monitor"}}'
done

# Only enable WAF/DLP on internet-facing services
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/group/nv.internal-service.default" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "waf_sensors": [],
      "dlp_sensors": []
    }
  }'
```

## Step 5: Tune Policy Rule Sets

Large policy rule sets increase evaluation time. Optimize by:

```bash
# Check current rule count
curl -sk \
  "https://neuvector-manager:8443/v1/policy/rule?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | jq '.rules | length'

# Remove stale learned rules (from deleted workloads)
curl -sk \
  "https://neuvector-manager:8443/v1/policy/rule?start=0&limit=1000" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.rules[] | select(.cfg_type == "learned")] | length'

# Clean up learned rules older than 30 days (implement via API)
# Identify groups with no members (stale groups)
curl -sk \
  "https://neuvector-manager:8443/v1/group?start=0&limit=500" \
  -H "X-Auth-Token: ${TOKEN}" | \
  jq '[.groups[] | select((.members | length == 0) and (.cfg_type == "learned"))] | length'
```

## Step 6: Configure Scan Priority and Throttling

Prevent scanning from impacting application performance:

```bash
# Stagger scanner schedules to avoid peak hours
# Update registry scan schedules to off-peak hours
curl -sk -X PATCH \
  "https://neuvector-manager:8443/v1/scan/registry/production-registry" \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: ${TOKEN}" \
  -d '{
    "config": {
      "schedule": {
        "schedule": "daily",
        "interval": 0
      }
    }
  }'

# Limit concurrent scanner operations
# This is managed by scanner replica count - each scanner handles one scan at a time
# 5 scanners = 5 concurrent scans maximum
```

## Step 7: Configure Horizontal Pod Autoscaler for Scanners

Auto-scale scanners based on scan queue depth:

```yaml
# scanner-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: neuvector-scanner-hpa
  namespace: neuvector
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: neuvector-scanner-pod
  minReplicas: 3
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

```bash
kubectl apply -f scanner-hpa.yaml
```

## Step 8: Monitor NeuVector Performance

Set up monitoring for NeuVector components:

```bash
# Monitor enforcer resource usage across all nodes
kubectl top pods -n neuvector -l app=neuvector-enforcer-pod

# Check controller memory usage trend
kubectl top pods -n neuvector -l app=neuvector-controller-pod

# Monitor scanner throughput
curl -sk \
  "https://neuvector-manager:8443/v1/scan/scanner" \
  -H "X-Auth-Token: ${TOKEN}" | jq '{
    scanner_count: (.scanners | length),
    avg_scan_time: ([.scanners[].scan_stats.scan_duration] | add / length)
  }'

# Check for any event backlogs
curl -sk \
  "https://neuvector-manager:8443/v1/system/summary" \
  -H "X-Auth-Token: ${TOKEN}" | jq '{
    total_workloads: .summary.total_workloads,
    total_policies: .summary.policy_groups,
    total_enforcers: .summary.total_enforcers
  }'
```

## Step 9: Federation for Horizontal Scaling

For very large deployments (500+ nodes), use multi-cluster federation:

```bash
# Distribute workloads across multiple clusters
# Each cluster handles ~200-300 nodes optimally
# Use federation for centralized policy management

# Example: Split large cluster into regional segments
# Master cluster: manages policies and aggregates reports
# Regional clusters: each handles 200-300 nodes

# Configure master cluster (reference earlier federation guide)
# Then join regional clusters as members
```

## Conclusion

Optimizing NeuVector for large clusters requires a balanced approach: sufficient resources for security effectiveness while minimizing impact on application workloads. Key optimizations include right-sizing controller and enforcer resources, scaling scanners for throughput, selectively applying DPI to high-value services, and keeping policy rule sets lean. Regular monitoring helps identify bottlenecks before they impact cluster performance, ensuring NeuVector scales with your infrastructure growth.
