# How to Set Up Istio for a Production Environment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Production, Kubernetes, High Availability, Service Mesh, Security

Description: A production-ready Istio configuration guide covering high availability, resource sizing, security hardening, monitoring, and operational best practices.

---

Running Istio in production is a completely different game from development. You need high availability, proper resource sizing, security hardening, monitoring, and a solid upgrade strategy. This guide covers the configuration decisions and settings that separate a production-grade Istio deployment from one that will wake you up at 3 AM.

## Production Installation with Helm

Helm is the recommended installation method for production because it integrates with GitOps workflows:

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update

# Install CRDs
helm install istio-base istio/base -n istio-system --create-namespace

# Install control plane
helm install istiod istio/istiod -n istio-system -f values-production.yaml

# Install gateways separately
helm install istio-ingress istio/gateway -n istio-ingress --create-namespace \
  -f values-gateway-production.yaml
```

## Control Plane Configuration

Here is a production-grade istiod configuration:

```yaml
# values-production.yaml
pilot:
  autoscaleEnabled: true
  autoscaleMin: 2
  autoscaleMax: 5
  resources:
    requests:
      cpu: "1"
      memory: 2Gi
    limits:
      cpu: "2"
      memory: 4Gi
  env:
    PILOT_ENABLE_PROTOCOL_SNIFFING_FOR_INBOUND: "true"
    PILOT_ENABLE_PROTOCOL_SNIFFING_FOR_OUTBOUND: "true"
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: ScheduleAnyway
      labelSelector:
        matchLabels:
          app: istiod
  podDisruptionBudget:
    minAvailable: 1

meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON
  enableAutoMtls: true
  defaultConfig:
    holdApplicationUntilProxyStarts: true
    concurrency: 2
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY

global:
  proxy:
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: "1"
        memory: 512Mi
    lifecycle:
      preStop:
        exec:
          command:
            - /bin/sh
            - -c
            - "sleep 5"
  logging:
    level: "default:warn"
```

Key decisions here:

- **autoscaleMin: 2** - Never run a single istiod in production
- **holdApplicationUntilProxyStarts: true** - Prevents race conditions where the app starts before the proxy
- **outboundTrafficPolicy: REGISTRY_ONLY** - Only allow traffic to known services (whitelisting)
- **accessLogEncoding: JSON** - Structured logging for log aggregation
- **preStop hook with sleep** - Gives time for connections to drain during pod shutdown

## Gateway Configuration

```yaml
# values-gateway-production.yaml
service:
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: tcp
  externalTrafficPolicy: Local

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 70

resources:
  requests:
    cpu: 500m
    memory: 256Mi
  limits:
    cpu: "2"
    memory: 1Gi

podDisruptionBudget:
  minAvailable: 2

topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: DoNotSchedule
    labelSelector:
      matchLabels:
        istio: ingressgateway

affinity:
  podAntiAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      - labelSelector:
          matchExpressions:
            - key: istio
              operator: In
              values:
                - ingressgateway
        topologyKey: kubernetes.io/hostname
```

Key decisions:

- **minReplicas: 3** - Spread across availability zones
- **podAntiAffinity required** - Never put two gateway pods on the same node
- **externalTrafficPolicy: Local** - Preserves client source IP
- **PDB with minAvailable: 2** - Survives node drains

## Security Hardening

### Enforce Strict mTLS

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

### Set Minimum TLS Version

```yaml
meshConfig:
  meshMTLS:
    minProtocolVersion: TLSV1_3
```

### Enable Authorization Policies

Start with a deny-all policy, then explicitly allow what is needed:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: my-app
spec:
  {}
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: backend-api
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/my-app/sa/frontend
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
```

## Monitoring and Alerting

### Prometheus Integration

Make sure Prometheus is scraping Istio metrics:

```yaml
meshConfig:
  enablePrometheusMerge: true
  defaultConfig:
    proxyStatsMatcher:
      inclusionRegexps:
        - ".*circuit_breakers.*"
        - ".*upstream_rq_retry.*"
        - ".*upstream_cx_connect_fail.*"
```

### Key Metrics to Alert On

Set up alerts for these critical metrics:

- **istiod availability**: `up{job="istiod"}` should always be 1
- **Proxy sync errors**: `pilot_xds_push_errors` increasing
- **mTLS handshake failures**: `envoy_ssl_connection_error`
- **5xx error rates**: `istio_requests_total{response_code=~"5.."}`
- **High proxy memory**: Envoy using more than 80% of its limit

## Resource Sizing Guide

Based on cluster size:

| Cluster Size | istiod CPU | istiod Memory | Proxy CPU | Proxy Memory |
|---|---|---|---|---|
| Small (<50 pods) | 500m | 1Gi | 50m | 64Mi |
| Medium (50-500 pods) | 1 | 2Gi | 100m | 128Mi |
| Large (500-2000 pods) | 2 | 4Gi | 200m | 256Mi |
| XL (2000+ pods) | 4 | 8Gi | 200m | 256Mi |

These are starting points. Monitor actual usage and adjust.

## Upgrade Strategy

Use revision-based canary upgrades:

```bash
# Install new version as canary
helm install istiod-canary istio/istiod -n istio-system \
  --set revision=canary \
  -f values-production.yaml \
  --version 1.24.0

# Test with a non-critical namespace
kubectl label namespace staging istio.io/rev=canary --overwrite
kubectl rollout restart deployment -n staging

# After validation, switch production
kubectl label namespace production istio.io/rev=canary --overwrite
kubectl rollout restart deployment -n production

# Remove old version
helm uninstall istiod -n istio-system
```

## Backup and Disaster Recovery

Back up your Istio configuration regularly:

```bash
# Export all Istio resources
kubectl get virtualservices,destinationrules,gateways,serviceentries,authorizationpolicies,peerauthentications -A -o yaml > istio-config-backup.yaml
```

Store this in version control.

## Network Policies

Add Kubernetes NetworkPolicies as a defense-in-depth layer alongside Istio:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: my-app
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: my-app
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: my-app
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
    - to:
        - namespaceSelector: {}
      ports:
        - port: 53
          protocol: UDP
```

## Wrapping Up

Production Istio is about defense in depth: high availability for the control plane, proper resource sizing for proxies, strict security policies, comprehensive monitoring, and a safe upgrade path. Do not skip the PodDisruptionBudgets, do not run a single istiod replica, and always test upgrades with canary revisions before rolling them out. The configuration above gives you a solid foundation that you can tune based on your specific workload characteristics.
