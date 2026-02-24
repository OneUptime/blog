# How to Restrict External Service Access Using ServiceEntry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Security, Authorization, Kubernetes, Service Mesh

Description: Use Istio ServiceEntry with authorization policies to restrict which workloads can access specific external services for better security posture.

---

By default, every pod in your Kubernetes cluster can reach any external endpoint. Your frontend can call your payment processor directly, a compromised pod can exfiltrate data to any server on the internet, and there is no audit trail of who called what. This is a security gap that Istio can close.

Using ServiceEntry combined with outbound traffic policy and authorization policies, you can control exactly which workloads access which external services. This is sometimes called egress control, and it is one of the most valuable security features Istio provides.

## The Foundation: REGISTRY_ONLY Mode

The first step is switching Istio's outbound traffic policy to `REGISTRY_ONLY`. This blocks all external traffic unless there is a ServiceEntry that explicitly allows it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

Apply this change:

```bash
istioctl install -f istio-operator.yaml
```

After this change, every external call from mesh workloads is blocked unless a ServiceEntry exists for the destination. This is the equivalent of a default-deny firewall rule for outbound traffic.

Check the current setting:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A2 outboundTrafficPolicy
```

## Creating Allowlist with ServiceEntries

Now, selectively allow external services by creating ServiceEntries. This becomes your allowlist:

```yaml
# Allow payment processing
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: allow-stripe
  namespace: payments
spec:
  hosts:
    - api.stripe.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  exportTo:
    - "."
---
# Allow email sending
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: allow-sendgrid
  namespace: notifications
spec:
  hosts:
    - api.sendgrid.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  exportTo:
    - "."
```

The `exportTo: ["."]` restricts each ServiceEntry to its own namespace. The payments namespace can reach Stripe, and the notifications namespace can reach SendGrid. No other namespace can access either service.

## Namespace-Level Restrictions

By scoping ServiceEntries to specific namespaces, you create per-team or per-service access controls:

```yaml
# In the "backend" namespace - allow database access
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: allow-rds
  namespace: backend
spec:
  hosts:
    - mydb.abc123.us-east-1.rds.amazonaws.com
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS
  exportTo:
    - "."
```

Only pods in the `backend` namespace can reach the RDS database. Pods in the `frontend` namespace cannot, even if they try.

## Workload-Level Restrictions with AuthorizationPolicy

For finer control within a namespace, use AuthorizationPolicy to restrict access to specific workloads:

```yaml
# First, the ServiceEntry (namespace-wide)
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: backend
spec:
  hosts:
    - api.stripe.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
---
# Then, restrict which workloads can use it
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: restrict-stripe-access
  namespace: backend
spec:
  action: DENY
  rules:
    - to:
        - operation:
            hosts:
              - api.stripe.com
      from:
        - source:
            notPrincipalS:
              - cluster.local/ns/backend/sa/payment-service
```

Wait, that approach is tricky. A cleaner way is to use ALLOW policies. First, create a default deny for all egress to stripe, then allow specific workloads:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-stripe-for-payments
  namespace: backend
spec:
  selector:
    matchLabels:
      app: payment-service
  action: CUSTOM
  provider:
    name: ""
  rules: []
```

Actually, the most practical approach is using the Sidecar resource to limit service visibility per workload:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: payment-service-sidecar
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: payment-service
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "*/api.stripe.com"
```

This Sidecar configuration means the payment-service can only reach services in its own namespace, istio-system services, and api.stripe.com. All other external services are invisible to it.

## Combining Sidecar and ServiceEntry for Least Privilege

The most secure setup combines REGISTRY_ONLY mode, scoped ServiceEntries, and per-workload Sidecar resources:

```yaml
# ServiceEntry in the backend namespace
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: stripe-api
  namespace: backend
spec:
  hosts:
    - api.stripe.com
  exportTo:
    - "."
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
---
# Sidecar for the payment service
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: payment-sidecar
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: payment-service
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
        - "*/api.stripe.com"
---
# Sidecar for the order service (no Stripe access)
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: order-sidecar
  namespace: backend
spec:
  workloadSelector:
    labels:
      app: order-service
  egress:
    - hosts:
        - "./*"
        - "istio-system/*"
```

The order-service cannot reach api.stripe.com even though the ServiceEntry exists in the same namespace. Only the payment-service has Stripe access.

## Auditing External Access

Track all external service access through Istio access logs:

```bash
# See all external API calls
kubectl logs deploy/payment-service -c istio-proxy | \
  grep "outbound" | grep "stripe"
```

For centralized auditing, send access logs to a log aggregator and create alerts for unexpected external access patterns:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "connection.requested_server_name != ''"
```

## Monitoring Blocked Traffic

When traffic is blocked by REGISTRY_ONLY mode, Envoy logs it with a `BlackHoleCluster` label:

```bash
# Find blocked external access attempts
kubectl logs deploy/my-app -c istio-proxy | grep BlackHoleCluster
```

In Prometheus:

```promql
# Count of blocked outbound requests
istio_requests_total{
  destination_service="BlackHoleCluster"
}
```

Monitor these metrics to catch legitimate traffic that needs a new ServiceEntry.

## Handling Exceptions

Sometimes a workload legitimately needs broad external access (like a monitoring agent or a CI/CD runner). You can exclude specific pods from Istio's sidecar injection:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monitoring-agent
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
```

Or create a wider ServiceEntry for that specific workload's namespace:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: monitoring-egress
  namespace: monitoring
spec:
  hosts:
    - "*.datadog.com"
    - "*.grafana.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: NONE
  exportTo:
    - "."
```

## Step-by-Step Migration to REGISTRY_ONLY

Switching to REGISTRY_ONLY on an existing cluster is scary because you might block production traffic. Here is a safe migration path:

1. **Audit current external traffic:**

```bash
# Find all external destinations from Envoy access logs
kubectl logs -l istio=ingressgateway -c istio-proxy -n istio-system | \
  grep "PassthroughCluster" | \
  awk '{print $5}' | sort -u
```

2. **Create ServiceEntries for all discovered external services.**

3. **Test in a non-production namespace first:**

```yaml
# Apply REGISTRY_ONLY to one namespace via Sidecar
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: test-registry-only
  namespace: staging
spec:
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
```

4. **Verify everything works in staging.**

5. **Roll out to production namespaces gradually.**

6. **Finally, switch the global mesh config to REGISTRY_ONLY.**

Restricting external service access turns Istio into a powerful egress firewall. Combined with namespace scoping, workload-specific Sidecar resources, and proper auditing, you get defense-in-depth for outbound traffic. It takes planning and careful rollout, but the security improvement is significant.
