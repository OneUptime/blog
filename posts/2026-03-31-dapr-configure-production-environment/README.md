# How to Configure Dapr for Production Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Production, Configuration, Kubernetes, Security

Description: Configure Dapr for production Kubernetes deployments with HA mode, mTLS, strict access control, managed secrets, resource limits, and observability integrations.

---

## Production Dapr Configuration Principles

Production Dapr configuration prioritizes reliability, security, and observability. Key differences from development and staging:
- High availability (HA) for all Dapr control plane components
- Strict mTLS with short certificate TTLs
- Deny-by-default access control policies
- Managed secret stores (HashiCorp Vault, Azure Key Vault, AWS Secrets Manager)
- Full distributed tracing with sampling
- Dapr sidecar resource limits tuned for workload

## Installing Dapr in HA Mode

```bash
# Install Dapr control plane in HA mode
helm upgrade --install dapr dapr/dapr \
  --namespace dapr-system \
  --set global.ha.enabled=true \
  --set dapr_placement.replicaCount=3 \
  --set dapr_sentry.replicaCount=3 \
  --set dapr_operator.replicaCount=3 \
  --set global.logAsJson=true \
  --set global.mtls.enabled=true \
  --set global.mtls.workloadCertTTL=8h \
  --wait
```

## Production mTLS Configuration

```yaml
# production/config/security.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: production-config
  namespace: production
spec:
  mtls:
    enabled: true
    workloadCertTTL: "8h"
    allowedClockSkew: "5m"
  tracing:
    samplingRate: "0.01"  # 1% in production
    otel:
      endpointAddress: "otel-collector.monitoring:4318"
      isSecure: true
  accessControl:
    defaultAction: deny
    trustDomain: "production"
    policies:
    - appId: api-gateway
      defaultAction: allow
      trustDomain: "production"
      namespace: "production"
    - appId: order-service
      defaultAction: deny
      trustDomain: "production"
      namespace: "production"
      operations:
      - name: /api/orders
        httpVerb: ["GET", "POST"]
        action: allow
    - appId: payment-service
      defaultAction: deny
      trustDomain: "production"
      namespace: "production"
      operations:
      - name: /api/charge
        httpVerb: ["POST"]
        action: allow
```

## Production Component with Secret References

```yaml
# production/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.azure.cosmosdb
  version: v1
  auth:
    secretStore: vault-secret-store
  metadata:
  - name: url
    secretKeyRef:
      name: cosmos-credentials
      key: url
  - name: masterKey
    secretKeyRef:
      name: cosmos-credentials
      key: master-key
  - name: database
    value: "production"
  - name: collection
    value: "dapr-state"
  - name: actorStateStore
    value: "true"
```

```yaml
# production/components/vault-secrets.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secret-store
  namespace: production
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.internal.company.com"
  - name: skipVerify
    value: "false"
  - name: caCert
    value: "/vault/tls/tls.crt"
  - name: vaultKVPrefix
    value: "production/dapr"
```

## Production Deployment Annotations

```yaml
# production/deployments/order-service.yaml
spec:
  replicas: 3
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
        dapr.io/app-protocol: "http"
        dapr.io/log-level: "warn"
        dapr.io/log-as-json: "true"
        dapr.io/config: "production-config"
        dapr.io/sidecar-cpu-request: "200m"
        dapr.io/sidecar-cpu-limit: "500m"
        dapr.io/sidecar-memory-request: "256Mi"
        dapr.io/sidecar-memory-limit: "512Mi"
        dapr.io/metrics-port: "9090"
        dapr.io/sidecar-liveness-probe-delay-seconds: "10"
        dapr.io/sidecar-readiness-probe-delay-seconds: "10"
```

## Production Resiliency Policy

```yaml
# production/config/resiliency.yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: production-resiliency
  namespace: production
spec:
  policies:
    retries:
      default-retry:
        policy: exponential
        duration: 500ms
        maxInterval: 30s
        maxRetries: 7
        matching:
          httpStatusCodes: "429,500,502,503,504"
    circuitBreakers:
      default-cb:
        maxRequests: 5
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures >= 10
    timeouts:
      default-timeout: 10s
  targets:
    apps:
      payment-service:
        retry: default-retry
        circuitBreaker: default-cb
        timeout: default-timeout
```

## Summary

Production Dapr configuration requires HA control plane deployment, strict deny-by-default mTLS access control, externalized secrets via HashiCorp Vault or cloud-managed secret stores, conservative sidecar resource limits, and structured JSON logging. Tracing sampling rates should be reduced to 1% or less in production to control observability costs. Always define explicit resiliency policies for critical service-to-service calls rather than relying on Dapr defaults.
