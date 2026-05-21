# How to Set Default Outbound Traffic Policy in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Policy, Security, Kubernetes, Service Mesh

Description: Learn how to configure the default outbound traffic policy in Istio to control whether mesh workloads can access external services freely or only through explicit configuration.

---

When a pod in your Istio mesh makes a request to an external service - something outside the mesh like a third-party API, a database hosted externally, or any internet endpoint - Istio's outbound traffic policy determines what happens. There are two modes: let everything through, or block everything that is not explicitly defined. This choice has significant implications for security, observability, and how much work you need to do to get services talking to the outside world.

## The Two Modes

Istio provides two outbound traffic policy modes:

**ALLOW_ANY** (the default): Traffic to external services is allowed. The sidecar passes through requests to unknown destinations, but Istio has reduced observability and traffic-control functionality for those unknown destinations. The traffic still goes through the sidecar unless you have configured proxy bypass rules.

**REGISTRY_ONLY**: Traffic to external services is dropped unless you create a ServiceEntry for them. HTTP requests to unknown destinations commonly receive a 502 response from the sidecar; raw TCP or TLS requests may fail at the connection level instead.

## Checking Your Current Setting

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep -A2 outboundTrafficPolicy
```

If you do not see `outboundTrafficPolicy` in the output, the default is `ALLOW_ANY`.

## Setting the Policy

### Through IstioOperator

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

```bash
istioctl install -f outbound-policy.yaml
```

### By Editing the ConfigMap

```bash
kubectl edit configmap istio -n istio-system
```

Add or modify the `outboundTrafficPolicy` section in the mesh YAML:

```yaml
outboundTrafficPolicy:
  mode: REGISTRY_ONLY
```

## Why REGISTRY_ONLY Is Better for Production

ALLOW_ANY is convenient during development, but for production, REGISTRY_ONLY provides several advantages:

**Security**: You explicitly declare what external services your workloads are expected to reach. This is useful for detecting and failing undeclared egress traffic, but it is not a substitute for a real outbound firewall or Kubernetes network policy because applications can sometimes bypass sidecar-level controls.

**Observability**: When external services are defined through ServiceEntry, Istio can attach service identity to those calls and provide better metrics, logs, and traffic-control behavior. With ALLOW_ANY, unknown external traffic has reduced observability.

**Traffic management**: With ServiceEntry, you can apply DestinationRules to external services. This means connection pooling, circuit breaking, retries, and timeouts for external calls.

## Migrating from ALLOW_ANY to REGISTRY_ONLY

Switching modes on a running mesh will break things if you have not defined ServiceEntry resources for all external dependencies. Here is a safe migration process:

### Step 1: Identify External Dependencies

Before switching, find out what external services your workloads are calling. Enable access logs and look for requests to non-mesh destinations:

```bash
# Enable access logs if not already enabled

kubectl edit configmap istio -n istio-system
# Add:
# accessLogFile: /dev/stdout
# accessLogEncoding: JSON
```

Then analyze the logs:

```bash
kubectl logs -l app=my-service -c istio-proxy -n my-namespace | \
  grep -oP 'upstream_host":"[^"]+' | sort -u
```

Or check the Envoy stats for passthrough traffic:

```bash
kubectl exec deploy/my-service -c istio-proxy -n my-namespace -- \
  pilot-agent request GET stats | grep "cluster.PassthroughCluster"
```

### Step 2: Create ServiceEntry Resources

For each external dependency, create a ServiceEntry:

```yaml
# Example: External API
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - api.stripe.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS

---
# Example: External database
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-postgres
  namespace: default
spec:
  hosts:
    - my-db.us-east-1.rds.amazonaws.com
  addresses:
    - 240.0.0.10
  location: MESH_EXTERNAL
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS
```

For raw TCP ServiceEntry resources, include `addresses` or use Istio DNS capture with auto-allocated addresses so the sidecar can distinguish that destination. Without addresses, a TCP ServiceEntry can match all traffic on that port.

### Step 3: Test in a Staging Environment

Switch to REGISTRY_ONLY in staging first and verify everything works:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
```

Run your test suite and check for 502 errors or outbound connection failures that indicate missing ServiceEntry resources.

### Step 4: Switch Production

Once staging is clean, apply the same change to production. Monitor your error rates closely after the switch.

## Handling Common External Services

Here are ServiceEntry examples for common external services:

```yaml
# Google APIs
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: google-apis
spec:
  hosts:
    - "*.googleapis.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DYNAMIC_DNS

---
# AWS services
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-services
spec:
  hosts:
    - "*.amazonaws.com"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DYNAMIC_DNS
```

Using wildcard hosts is convenient but less secure. For tighter control, list specific hosts. If you are running an Istio version that does not support `DYNAMIC_DNS`, wildcard ServiceEntry hosts must use `NONE` resolution or be routed through an egress gateway.

## Adding Traffic Management to External Services

Once you have ServiceEntry resources, you can add DestinationRules for connection management:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: external-api-dr
spec:
  host: api.stripe.com
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 60s
```

This gives you circuit breaking for external services, which is something you would otherwise need to implement in your application code.

## Namespace-Level Visibility

ServiceEntry resources are exported to all namespaces by default unless your mesh changes `defaultServiceExportTo` or the resource sets `exportTo`. If you want to make that explicit, you can export it to all namespaces:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: global-external-api
  namespace: istio-system
spec:
  hosts:
    - api.external-service.com
  exportTo:
    - "*"
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
```

Or restrict it to specific namespaces:

```yaml
spec:
  exportTo:
    - "."
    - "team-a"
    - "team-b"
```

## Monitoring Blocked Traffic

After switching to REGISTRY_ONLY, monitor for blocked requests. HTTP traffic to unknown destinations commonly returns 502, while raw TCP or TLS traffic may show up as connection failures, so track both 502 rates and connection errors:

```bash
# Check for BlackHoleCluster traffic (blocked outbound)
kubectl exec deploy/my-service -c istio-proxy -n my-namespace -- \
  pilot-agent request GET stats | grep "BlackHoleCluster"
```

A non-zero `BlackHoleCluster` count means your workloads are trying to reach external services that do not have ServiceEntry definitions.

The outbound traffic policy is an important egress configuration control in Istio. Start with ALLOW_ANY during development, but plan to move to REGISTRY_ONLY before going to production. The effort of creating ServiceEntry resources pays off in better visibility and traffic control for your external dependencies.
