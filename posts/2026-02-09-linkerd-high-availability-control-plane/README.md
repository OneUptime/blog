# How to Deploy Linkerd with High-Availability Control Plane on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linkerd, Kubernetes, High Availability, Service Mesh, Reliability

Description: Learn how to configure Linkerd control plane for high availability with multiple replicas, proper resource allocation, and redundancy strategies to ensure service mesh reliability in production.

---

A service mesh control plane failure can disrupt your entire application platform. Linkerd's control plane handles certificate issuance, service discovery, and policy enforcement. This guide shows you how to configure it for high availability with redundancy, proper sizing, and disaster recovery.

## Understanding Linkerd Control Plane Components

Linkerd's control plane has three main components. The destination controller provides service discovery and routing information. The identity controller issues certificates for mTLS. The proxy injector adds sidecar containers to pods.

Each component can run multiple replicas for availability. The control plane is designed to fail gracefully - existing proxies continue working even if the control plane is down, though new deployments and certificate renewals will fail.

For production, run at least three replicas of each component spread across availability zones. This ensures the mesh survives zone failures.

## Prerequisites

You need a Kubernetes cluster with multiple nodes across different availability zones. Verify your node topology:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,ZONE:.metadata.labels.topology\\.kubernetes\\.io/zone
```

You should see nodes in at least three zones for true high availability.

## Installing Linkerd with High Availability Configuration

Create a values file for HA installation:

```yaml
# linkerd-ha-values.yaml
# High availability configuration for control plane
controllerReplicas: 3

# Spread pods across zones
enablePodAntiAffinity: true

# Resource limits for production
controllerResources:
  cpu:
    request: 200m
    limit: 500m
  memory:
    request: 256Mi
    limit: 512Mi

# Identity controller HA
identity:
  issuer:
    scheme: kubernetes.io/tls
  replicas: 3
  resources:
    cpu:
      request: 100m
      limit: 200m
    memory:
      request: 128Mi
      limit: 256Mi

# Destination controller HA
destination:
  replicas: 3
  resources:
    cpu:
      request: 200m
      limit: 500m
    memory:
      request: 256Mi
      limit: 512Mi

# Proxy injector HA
proxyInjector:
  replicas: 3
  resources:
    cpu:
      request: 100m
      limit: 200m
    memory:
      request: 128Mi
      limit: 256Mi

# Enable high availability for webhooks
webhookFailurePolicy: Ignore
```

Install Linkerd with HA configuration:

```bash
linkerd install --values linkerd-ha-values.yaml | kubectl apply -f -
```

Verify installation:

```bash
linkerd check
kubectl get pods -n linkerd -o wide
```

You should see three replicas of each component spread across nodes.

## Configuring Pod Anti-Affinity

Ensure control plane pods spread across zones and nodes:

```yaml
# linkerd-ha-affinity.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: linkerd-destination
  namespace: linkerd
spec:
  replicas: 3
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: linkerd.io/control-plane-component
                operator: In
                values:
                - destination
            topologyKey: topology.kubernetes.io/zone
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: linkerd.io/control-plane-component
                  operator: In
                  values:
                  - destination
              topologyKey: kubernetes.io/hostname
```

Apply similar configuration to identity and proxy-injector deployments. The required rule ensures pods never run in the same zone. The preferred rule tries to avoid the same node.

## Setting Appropriate Resource Requests and Limits

Size control plane components based on cluster scale:

```yaml
# For clusters with 50-100 services
controllerResources:
  cpu:
    request: 200m
    limit: 500m
  memory:
    request: 256Mi
    limit: 512Mi

# For clusters with 100-500 services
controllerResources:
  cpu:
    request: 500m
    limit: 1000m
  memory:
    request: 512Mi
    limit: 1Gi

# For clusters with 500+ services
controllerResources:
  cpu:
    request: 1000m
    limit: 2000m
  memory:
    request: 1Gi
    limit: 2Gi
```

Monitor actual usage and adjust:

```bash
kubectl top pods -n linkerd
```

## Configuring PodDisruptionBudgets

Prevent cluster operations from taking down all control plane replicas:

```yaml
# pdb-linkerd.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: linkerd-destination
  namespace: linkerd
spec:
  minAvailable: 2
  selector:
    matchLabels:
      linkerd.io/control-plane-component: destination
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: linkerd-identity
  namespace: linkerd
spec:
  minAvailable: 2
  selector:
    matchLabels:
      linkerd.io/control-plane-component: identity
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: linkerd-proxy-injector
  namespace: linkerd
spec:
  minAvailable: 2
  selector:
    matchLabels:
      linkerd.io/control-plane-component: proxy-injector
```

```bash
kubectl apply -f pdb-linkerd.yaml
```

This ensures at least two replicas remain available during node drains or upgrades.

## Monitoring Control Plane Health

Set up monitoring for control plane availability:

```bash
# Check control plane status
linkerd check --proxy

# View control plane metrics
kubectl port-forward -n linkerd svc/linkerd-prometheus 9090:9090
```

Key metrics to monitor:

```promql
# Control plane pod availability
count(up{namespace="linkerd", job=~"linkerd-.*"}) by (job)

# Certificate issuance rate
rate(identity_cert_issued_total[5m])

# Service discovery updates
rate(destination_updates_total[5m])

# Webhook latency
histogram_quantile(0.95, rate(webhook_http_request_duration_seconds_bucket[5m]))
```

## Implementing Control Plane Redundancy

For critical deployments, run control plane in multiple clusters. Use multi-cluster configuration to provide fallback:

```bash
# Install Linkerd in backup cluster
linkerd install --cluster-domain=backup.local | kubectl apply -f -

# Link primary and backup clusters
linkerd multicluster link --cluster-name backup > backup-link.yaml
kubectl apply -f backup-link.yaml
```

If the primary control plane fails, services continue using cached configuration while you failover to the backup cluster.

## Configuring Certificate Expiry Monitoring

Monitor certificate expiry to prevent outages:

```yaml
# prometheus-cert-alerts.yaml
groups:
- name: linkerd-certs
  rules:
  - alert: LinkerdCertificateExpiringSoon
    expr: |
      (linkerd_identity_issuer_cert_expiry_timestamp_seconds - time()) < 604800
    for: 1h
    labels:
      severity: warning
    annotations:
      summary: "Linkerd certificate expires in less than 7 days"

  - alert: LinkerdCertificateExpiringSoonCritical
    expr: |
      (linkerd_identity_issuer_cert_expiry_timestamp_seconds - time()) < 172800
    labels:
      severity: critical
    annotations:
      summary: "Linkerd certificate expires in less than 2 days"
```

Check certificate expiry:

```bash
linkerd check --proxy | grep certificate
```

## Backing Up Control Plane Configuration

Backup critical control plane resources:

```bash
# Backup trust anchor and issuer certificates
kubectl get secret linkerd-identity-issuer -n linkerd -o yaml > linkerd-identity-backup.yaml

# Backup control plane configuration
kubectl get configmap linkerd-config -n linkerd -o yaml > linkerd-config-backup.yaml

# Backup CRDs and policies
kubectl get authorizationpolicies -A -o yaml > linkerd-policies-backup.yaml
kubectl get servers -A -o yaml > linkerd-servers-backup.yaml
```

Store backups securely outside the cluster. Test restoration procedures regularly.

## Testing Control Plane Failure Scenarios

Simulate control plane failures to verify resilience:

```bash
# Scale destination controller to 0
kubectl scale deployment linkerd-destination -n linkerd --replicas=0

# Test that existing connections continue working
kubectl exec -it deploy/myapp -- curl http://backend:8080

# Verify new deployments don't break (uses cached config)
kubectl rollout restart deployment/myapp
```

Existing proxies cache routing information and continue working. New deployments may have issues if the control plane is down for extended periods.

## Upgrading Control Plane with Zero Downtime

Upgrade control plane using rolling updates:

```bash
# Download new version
linkerd upgrade --version stable-2.14.0 > linkerd-upgrade.yaml

# Review changes
diff <(linkerd install --values linkerd-ha-values.yaml) linkerd-upgrade.yaml

# Apply upgrade
kubectl apply -f linkerd-upgrade.yaml

# Watch rollout
kubectl rollout status deployment -n linkerd
```

The upgrade happens gradually with no downtime. Existing connections continue during the upgrade.

## Configuring Control Plane Autoscaling

Enable horizontal pod autoscaling for dynamic scaling:

```yaml
# hpa-linkerd.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: linkerd-destination
  namespace: linkerd
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: linkerd-destination
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

```bash
kubectl apply -f hpa-linkerd.yaml
```

This scales control plane components based on CPU and memory usage.

## Conclusion

High availability configuration is essential for production Linkerd deployments. Run at least three replicas of each control plane component spread across availability zones. Configure pod anti-affinity, resource limits, and pod disruption budgets.

Monitor control plane health with Prometheus metrics and set up alerts for certificate expiry and component availability. Implement backup procedures and test failure scenarios regularly.

The control plane is designed to fail gracefully with existing proxies continuing to work using cached configuration. Size components appropriately for your cluster scale and enable autoscaling for dynamic workloads. This ensures your service mesh remains reliable even during infrastructure failures.
