# How to Deploy Ambient Mode in Production Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Production, Kubernetes, Operation

Description: A comprehensive guide to deploying Istio ambient mode in production covering high availability, resource planning, monitoring, security hardening, and operational best practices.

---

Running Istio ambient mode in a test cluster is one thing. Running it in production where real users depend on it is a different challenge. You need to think about high availability, resource planning, monitoring, security hardening, upgrade strategies, and disaster recovery.

This guide covers the production considerations that are easy to overlook when you are focused on getting ambient mode working.

## High Availability

### istiod

Run at least 2 replicas of istiod for redundancy:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: ambient
  components:
    pilot:
      k8s:
        replicaCount: 3
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 4Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization: 70
```

Spread replicas across availability zones:

```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app
                operator: In
                values:
                  - istiod
          topologyKey: topology.kubernetes.io/zone
```

### ztunnel

ztunnel runs as a DaemonSet, so it is inherently highly available - one instance per node. The key is making sure the DaemonSet tolerates node issues:

```yaml
# ztunnel Helm values

tolerations:
  - operator: Exists
updateStrategy:
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
  type: RollingUpdate
```

The default surged rolling update strategy keeps replacement ztunnel pods coming up before old pods are removed where the cluster supports DaemonSet surge updates. In-place ztunnel upgrades can still briefly disrupt ambient traffic on the node, so use node cordoning or blue/green node pools for high-risk production rollouts.

### Waypoint Proxies

For production, run at least 2 replicas of each waypoint proxy:

```bash
kubectl scale deployment bookinfo-waypoint -n bookinfo --replicas=3
```

Add a PodDisruptionBudget:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: waypoint-pdb
  namespace: bookinfo
spec:
  minAvailable: 1
  selector:
    matchLabels:
      gateway.networking.k8s.io/gateway-name: bookinfo-waypoint
```

Resource Planning

### ztunnel Sizing

ztunnel resource usage depends on the number of active connections and throughput on each node. Start with these baseline values and adjust based on monitoring:

```yaml
resources:
  requests:
    cpu: 200m
    memory: 512Mi
  limits:
    cpu: "2"
    memory: 1Gi
```

For nodes with heavy traffic (thousands of concurrent connections), increase the CPU limit. For nodes with many different workload identities, increase memory for certificate caching.

### Waypoint Proxy Sizing

Waypoint proxies run Envoy and handle L7 processing. Their resource needs depend on request rate and complexity of routing rules:

```yaml
resources:
  requests:
    cpu: 500m
    memory: 256Mi
  limits:
    cpu: "2"
    memory: 1Gi
```

Set up HPA for waypoints:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: waypoint-hpa
  namespace: bookinfo
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: bookinfo-waypoint
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### istiod Sizing

istiod resource needs scale with the number of workloads and policies in the mesh:

| Cluster Size | istiod CPU | istiod Memory |
|-------------|-----------|---------------|
| < 100 pods | 500m | 1Gi |
| 100-500 pods | 1 CPU | 2Gi |
| 500-2000 pods | 2 CPU | 4Gi |
| 2000+ pods | 4 CPU | 8Gi |

## Monitoring

### Essential Metrics to Watch

Set up alerts for these critical metrics:

```yaml
# Prometheus alerting rules
groups:
  - name: istio-ambient
    rules:
      - alert: ZtunnelDown
        expr: kube_daemonset_status_number_unavailable{daemonset="ztunnel"} > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "ztunnel not running on {{ $value }} nodes"

      - alert: IstiodDown
        expr: absent(up{job="istiod"}) or up{job="istiod"} == 0
        for: 2m
        labels:
          severity: critical

      - alert: WaypointHighLatency
        expr: histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{reporter="source", source_workload=~".*-waypoint"}[5m])) > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Waypoint proxy P99 latency exceeding 1 second"

      - alert: HighAuthorizationDenials
        expr: sum(rate(istio_requests_total{response_code="403", response_flags=~".*RBAC.*"}[5m])) > 10
        for: 5m
        labels:
          severity: warning
```

### Grafana Dashboards

Import the Istio dashboards that come with the telemetry addons:

```bash
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/prometheus.yaml
```

Key dashboards to set up:
- ztunnel performance (connections, bytes, CPU, memory per node)
- Waypoint proxy performance (request rate, latency, error rate)
- istiod health (config push latency, connected proxies, certificate issuance)
- Mesh overview (cross-namespace traffic, mTLS coverage)

### Logging

Configure structured logging for ztunnel and waypoints:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

This logs only error responses, reducing log volume while keeping important debugging information.

## Security Hardening

### Enable STRICT mTLS Mesh-Wide

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

### Apply Default-Deny AuthorizationPolicy

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: bookinfo
spec:
  {}
```

Then add explicit ALLOW policies for each legitimate communication path.

When using waypoints, also apply a default-deny policy to the `istio-waypoint` `GatewayClass` from the Istio root namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-nothing-istio-waypoint
  namespace: istio-system
spec:
  targetRefs:
    - group: gateway.networking.k8s.io
      kind: GatewayClass
      name: istio-waypoint
```

### Rotate Certificates

Istio automatically rotates workload certificates. The default TTL is 24 hours. For production, verify this is working:

```bash
istioctl ztunnel-config certificates | head -20
```

Check certificate expiry dates. If certificates are not rotating, check istiod logs for CA errors.

### Restrict istiod Access

Limit who can modify Istio configuration with Kubernetes RBAC:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-reader
rules:
  - apiGroups: ["security.istio.io", "networking.istio.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
```

Only grant write access to authorized operators.

## Upgrade Strategy

Use Helm with a canary approach for production upgrades:

```bash
# 1. Update CRDs
helm upgrade istio-base istio/base -n istio-system

# 2. Upgrade istiod
helm upgrade istiod istio/istiod -n istio-system --wait

# 3. Upgrade CNI
helm upgrade istio-cni istio/cni -n istio-system --wait

# 4. Upgrade ztunnel (this affects live traffic)
helm upgrade ztunnel istio/ztunnel -n istio-system --wait

# 5. Upgrade waypoint proxies
kubectl rollout restart deployment -l gateway.networking.k8s.io/gateway-name -A
```

Run automated tests after each step before proceeding.

## Disaster Recovery

### Backup Istio Configuration

Regularly back up all Istio custom resources:

```bash
#!/bin/bash
BACKUP_DIR="/backups/istio/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

for resource in authorizationpolicy peerauthentication requestauthentication virtualservice destinationrule gateway serviceentry sidecar wasmplugin telemetry; do
  kubectl get $resource -A -o yaml > "$BACKUP_DIR/$resource.yaml"
done
```

### Recovery Plan

If ztunnel or istiod fails catastrophically:

1. ztunnel failure on a node: Kubernetes reschedules it automatically (DaemonSet guarantee)
2. istiod failure: Existing connections continue working. New certificate requests and config changes are queued until istiod recovers
3. Complete mesh failure: Remove ambient labels from namespaces (`kubectl label namespace X istio.io/dataplane-mode-`) to restore direct pod-to-pod communication while you fix the mesh

## Pre-Production Checklist

Before going live:

- [ ] istiod running with 2+ replicas across availability zones
- [ ] ztunnel DaemonSet running on all worker nodes
- [ ] Resource requests and limits set for all mesh components
- [ ] STRICT mTLS enabled
- [ ] Default-deny AuthorizationPolicies applied
- [ ] Monitoring and alerting configured
- [ ] Upgrade runbook documented
- [ ] Rollback procedure tested
- [ ] Load testing completed under expected peak traffic
- [ ] Certificate rotation verified
- [ ] Backup strategy for Istio configuration
- [ ] Team trained on ambient mode debugging tools

Production deployment of ambient mode is not fundamentally harder than sidecar mode. In many ways, it is simpler because there are fewer moving parts - no sidecar lifecycle to manage, no pod restart coordination for mesh changes. But the fundamentals of production operations still apply: redundancy, monitoring, security, and tested recovery procedures.
