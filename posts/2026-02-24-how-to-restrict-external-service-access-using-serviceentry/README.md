# How to Restrict External Service Access Using ServiceEntry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Security, Authorization, Kubernetes, Service Mesh

Description: Use Istio ServiceEntry with authorization policies to restrict which workloads can access specific external services for better security posture.

---

By default, every pod in your Kubernetes cluster can reach any external endpoint unless you add controls such as Kubernetes NetworkPolicy. Your frontend can call your payment processor directly, a compromised pod can exfiltrate data to any server on the internet, and there is no audit trail of who called what through the mesh. This is a security gap that Istio can help reduce.

Using ServiceEntry combined with outbound traffic policy and Sidecar resources, you can control which external services are known to the mesh and which workloads import those services. This is sometimes called egress control, and it is one of the most valuable traffic management features Istio provides.

## The Foundation: REGISTRY_ONLY Mode

The first step is switching Istio's outbound traffic policy to `REGISTRY_ONLY`. This makes the sidecar drop unknown outbound traffic unless the destination is declared in the service registry, usually with a ServiceEntry:

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

After this change, external calls from mesh workloads through the sidecar are blocked unless a ServiceEntry exists for the destination. This is useful for detecting and preventing accidental undeclared dependencies, but Istio documents it as best-effort traffic control rather than a strong outbound firewall. For stronger egress enforcement, combine it with an egress gateway and Kubernetes NetworkPolicy.

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

The `exportTo: ["."]` restricts each ServiceEntry's visibility to its own namespace. In `REGISTRY_ONLY` mode, workloads in the payments namespace can reach Stripe through the sidecar, and workloads in the notifications namespace can reach SendGrid through the sidecar. Other namespaces cannot use those private ServiceEntries unless they define their own matching entries or bypass the sidecar.

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

Only pods in the `backend` namespace can use this private ServiceEntry through the sidecar to reach the RDS database. Pods in the `frontend` namespace cannot use this ServiceEntry unless they define their own matching entry or bypass the sidecar.

## Workload-Level Restrictions with Sidecar

Istio AuthorizationPolicy applies to inbound traffic on workloads, not outbound egress authorization. For finer egress control within a namespace, use the Sidecar resource to restrict which services a workload imports:

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
  exportTo:
    - "."
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
---
# Then, restrict which workloads import it
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
        - "./api.stripe.com"
```

This Sidecar configuration means the payment-service imports services in its own namespace, istio-system services, and the private api.stripe.com ServiceEntry from its namespace. Other external services are not configured on that sidecar.

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
        - "./api.stripe.com"
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

The order-service does not import api.stripe.com even though the ServiceEntry exists in the same namespace. Only the payment-service sidecar has Stripe configured.

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
# Find unknown external destinations from an application's sidecar access logs
kubectl logs deploy/my-app -c istio-proxy -n my-namespace | \
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

Restricting external service access turns Istio into a useful egress control layer. Combined with namespace scoping, workload-specific Sidecar resources, proper auditing, and network-level controls such as an egress gateway plus Kubernetes NetworkPolicy when you need strong enforcement, you get defense-in-depth for outbound traffic. It takes planning and careful rollout, but the security improvement is significant.
