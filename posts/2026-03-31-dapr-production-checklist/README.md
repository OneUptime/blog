# How to Create a Dapr Production Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Production, Checklist, Security, Reliability

Description: A comprehensive production readiness checklist for Dapr deployments covering security, reliability, observability, performance, and operational runbooks.

---

## Why a Checklist Matters

Teams move fast and skip steps under deadline pressure. A checklist turns production readiness from a judgment call into a repeatable process. This checklist covers the eight areas that most commonly cause production incidents in Dapr deployments.

## 1. Installation and Upgrades

```bash
# Verify Dapr control plane is healthy
kubectl get pods -n dapr-system

# Check Dapr version matches your SDK versions
dapr version
kubectl get deployment dapr-operator -n dapr-system \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

Checklist:
- [ ] Dapr installed via Helm with pinned version
- [ ] SDK version in each service matches Dapr runtime version
- [ ] Helm values stored in version control
- [ ] Upgrade runbook documented and tested in staging
- [ ] Control-plane components have `replicaCount >= 2`

## 2. Security

```yaml
# Verify mTLS is enabled
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
```

```yaml
# Access control - deny by default
spec:
  accessControl:
    defaultAction: deny
    trustDomain: "production"
    policies:
    - appId: order-service
      defaultAction: deny
      namespace: "production"
      operations:
      - name: /orders
        httpVerb: ["POST"]
        action: allow
```

Checklist:
- [ ] mTLS enabled in all namespaces
- [ ] Access control policies deployed (default deny)
- [ ] Secrets stored in Kubernetes Secrets or Vault, not env vars
- [ ] Secret scoping configured per application
- [ ] Network policies restrict sidecar ports
- [ ] RBAC limits who can modify Dapr components

## 3. Reliability and Resiliency

```yaml
# Verify resiliency policy is applied
kubectl get resiliency -n production
```

Checklist:
- [ ] Resiliency policies defined for all service-to-service calls
- [ ] Resiliency policies defined for all component access
- [ ] Circuit breakers configured with appropriate thresholds
- [ ] Retry policies use exponential backoff, not constant
- [ ] Timeout values are shorter than caller's timeout
- [ ] Dead-letter topics configured for pub/sub

## 4. Resource Management

```yaml
# Sidecar resource limits in deployment annotations
dapr.io/sidecar-cpu-request: "100m"
dapr.io/sidecar-cpu-limit: "500m"
dapr.io/sidecar-memory-request: "64Mi"
dapr.io/sidecar-memory-limit: "256Mi"
```

Checklist:
- [ ] CPU and memory requests/limits set on all Dapr sidecars
- [ ] Horizontal Pod Autoscaler configured for each service
- [ ] State store has eviction policy set
- [ ] Pub/sub topic max message size configured

## 5. Observability

```bash
# Check Prometheus metrics are exported
curl http://localhost:9090/metrics | grep dapr
```

Checklist:
- [ ] Tracing configured with sampling rate (0.01-0.1 for high traffic)
- [ ] Traces exported to Jaeger/Zipkin/OpenTelemetry Collector
- [ ] Dapr metrics exported to Prometheus
- [ ] Dashboards created for: sidecar latency, error rates, pub/sub lag
- [ ] Alerts defined for circuit breaker open state
- [ ] Log aggregation captures Dapr sidecar logs

## 6. State Management

Checklist:
- [ ] State store uses Redis Sentinel or Redis Cluster (not single-node)
- [ ] State TTLs configured for all time-sensitive keys
- [ ] State key prefixes configured to avoid collisions
- [ ] Encryption at rest enabled for sensitive state
- [ ] State store backup schedule in place

## 7. Workflow and Actors

Checklist:
- [ ] Workflow state store uses a durable, actor-compatible store (e.g., Redis, PostgreSQL — not in-memory)
- [ ] Actor placement service has `replicaCount >= 3`
- [ ] Actor idle timeout and scan interval tuned for your workload
- [ ] Workflow history purge configured to prevent unbounded growth

```bash
# Check placement service replicas
kubectl get statefulset dapr-placement-server -n dapr-system
```

## 8. Operational Runbooks

Checklist:
- [ ] Runbook: how to restart a Dapr sidecar without restarting the pod
- [ ] Runbook: how to terminate a stuck workflow instance
- [ ] Runbook: how to drain a pub/sub dead-letter queue
- [ ] Runbook: how to roll back a Dapr version
- [ ] On-call documentation references Dapr dashboard URL

```bash
# Useful diagnostic commands
dapr list -k                                    # list all Dapr apps in cluster
dapr logs -k -a order-service                  # sidecar logs
kubectl logs <pod> -c daprd                    # sidecar logs directly
```

## Summary

A Dapr production checklist covers eight areas: installation hygiene, security hardening (mTLS, access control, secrets), resiliency policies for every external call, sidecar resource limits, full-stack observability, highly-available state stores, proper workflow and actor configuration, and documented operational runbooks. Running through this checklist before each production deployment prevents the most common classes of Dapr production incidents.
