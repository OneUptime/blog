# How to Exclude Specific Pods from Sidecar Injection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar Injection, Kubernetes, Exclusion, Service Mesh

Description: All the methods to prevent Istio sidecar injection for specific pods, namespaces, and workload types, with practical examples and troubleshooting tips.

---

Sometimes you do not want a sidecar. Maybe you have a batch job that runs for 30 seconds and the sidecar startup time is unacceptable. Maybe you are running a database that handles its own TLS. Maybe you have a DaemonSet that uses host networking. Whatever the reason, you need a reliable way to exclude specific pods from Istio's sidecar injection.

There are several methods depending on whether you want to exclude individual pods, entire workload types, or specific scenarios. Here is every option available to you.

## Method 1: Pod Label

The most direct way to exclude a pod is the `sidecar.istio.io/inject` label:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
  namespace: production
spec:
  selector:
    matchLabels:
      app: batch-processor
  template:
    metadata:
      labels:
        app: batch-processor
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: batch-processor
        image: batch-processor:latest
```

This works even if the namespace has `istio-injection=enabled`. A pod-level `sidecar.istio.io/inject: "false"` label prevents injection even when the namespace is enabled.

Important: The label must be on the pod template (`spec.template.metadata.labels`), not on the Deployment metadata. A common mistake is putting it on the Deployment itself where it has no effect on injection.

## Method 2: Pod Annotation

Istio also supports the `sidecar.istio.io/inject` annotation, although it is deprecated in favor of the label:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: legacy-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: legacy-service
  template:
    metadata:
      labels:
        app: legacy-service
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: legacy-service
        image: legacy-service:latest
```

The annotation is still checked during the injection decision, but new manifests should use the label.

## Method 3: Namespace-Level Exclusion

If an entire namespace should not have injection, either remove the injection label in the standard opt-in configuration or set it to disabled:

```bash
# Remove the label entirely

kubectl label namespace monitoring istio-injection-

# Or explicitly disable it
kubectl label namespace monitoring istio-injection=disabled
```

The second approach is more explicit, documents the intent that this namespace should never have injection, and remains safe if the injector is configured to inject namespaces by default.

## Excluding Jobs and CronJobs

Kubernetes Jobs and CronJobs are one of the most common cases for exclusion. With classic sidecar injection, the problem with sidecars on Jobs is that the sidecar does not exit when the main container finishes, leaving the pod in a Running state indefinitely.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: database-migration
  namespace: production
spec:
  template:
    metadata:
      labels:
        sidecar.istio.io/inject: "false"
    spec:
      restartPolicy: Never
      containers:
      - name: migration
        image: flyway:latest
        command: ["flyway", "migrate"]
```

If you do need the Job to be in the mesh (for example, it calls mesh services that require mTLS), you have a few options:

**Option A: Use Kubernetes native sidecars when they are enabled for your Istio installation:**

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: mesh-aware-job
  namespace: production
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/nativeSidecar: "true"
    spec:
      restartPolicy: Never
      containers:
      - name: worker
        image: worker:latest
```

When Istio injects the proxy as a Kubernetes native sidecar, Kubernetes can complete the Job after the worker container exits even though the proxy sidecar is still managed as part of the pod lifecycle. This depends on Kubernetes and Istio native sidecar support being enabled.

**Option B: Send a quit signal to the sidecar from the main container:**

```yaml
containers:
- name: worker
  image: worker:latest
  command: ["/bin/sh", "-c"]
  args:
  - |
    /app/run-job.sh
    EXIT_CODE=$?
    curl -sf -XPOST http://localhost:15020/quitquitquit
    exit $EXIT_CODE
```

The `/quitquitquit` endpoint tells the sidecar to shut down gracefully.

## Excluding DaemonSets with Host Networking

DaemonSets that use host networking cannot have sidecars injected because the iptables rules would interfere with the host network stack:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: node-exporter
  template:
    metadata:
      labels:
        app: node-exporter
        sidecar.istio.io/inject: "false"
    spec:
      hostNetwork: true
      containers:
      - name: node-exporter
        image: prom/node-exporter:latest
```

Istio actually detects host networking and skips injection automatically, but adding the label makes the intent explicit and avoids relying on implicit behavior.

## Excluding Init Containers and Sidecar Containers

With classic Istio sidecar injection, init containers in your pod spec run before the sidecar starts, so they do not have access to the mesh. If your init container needs to make HTTP calls (like downloading configuration from an API), those calls bypass the sidecar. With Kubernetes native sidecars enabled, init container ordering is different, so verify the behavior for your Istio and Kubernetes versions.

This is usually fine, but if the init container needs to reach a mesh service that requires mTLS, you have a problem. The solution is to either:

1. Make the target service accept non-mTLS traffic (set PeerAuthentication to PERMISSIVE for that service)
2. Move the logic from an init container to the main container's startup

## Excluding Specific Ports from Interception

Sometimes you do not want to exclude the entire pod, just certain traffic. Use port exclusion annotations:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeInboundPorts: "9090,9091"
  traffic.sidecar.istio.io/excludeOutboundPorts: "3306,6379,9200"
```

This keeps the sidecar running but tells the iptables rules to not redirect traffic on the specified ports. Inbound traffic to ports 9090 and 9091 goes directly to the application. Outbound traffic to MySQL (3306), Redis (6379), and Elasticsearch (9200) goes directly without passing through Envoy.

This is a good middle ground when you want mesh features for HTTP traffic but not for database connections.

## Excluding by IP Range

Exclude traffic to specific IP ranges from sidecar interception:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeOutboundIPRanges: "169.254.169.254/32,10.0.100.0/24"
```

Common use cases:
- `169.254.169.254/32`: AWS IMDS (Instance Metadata Service)
- VPN ranges that should not go through the sidecar
- On-premises services accessed via direct IP

Or take the opposite approach and only intercept traffic to specific ranges:

```yaml
annotations:
  traffic.sidecar.istio.io/includeOutboundIPRanges: "10.0.0.0/8"
```

This is useful when your cluster network is in the 10.0.0.0/8 range and you only want the sidecar to handle cluster-internal traffic.

## Webhook-Level Exclusion

You can configure the injection webhook itself to ignore certain pods based on labels:

```bash
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml
```

The webhook has a `namespaceSelector` and can have an `objectSelector`. To exclude pods with a specific label at the webhook level:

```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: MutatingWebhookConfiguration
metadata:
  name: istio-sidecar-injector
webhooks:
- name: rev.namespace.sidecar-injector.istio.io
  objectSelector:
    matchExpressions:
    - key: sidecar.istio.io/inject
      operator: NotIn
      values:
      - "false"
```

This prevents the webhook from even being called for pods labeled with `sidecar.istio.io/inject: false`, reducing API server overhead.

## Verifying Exclusion

After deploying a pod that should be excluded, verify:

```bash
# Check that istio-proxy is not in the container list
kubectl get pod your-pod -o jsonpath='{.spec.containers[*].name}'

# Check that no injection annotation was added
kubectl get pod your-pod -o jsonpath='{.metadata.annotations.sidecar\.istio\.io/status}'
```

If the status annotation is empty and `istio-proxy` is not in the container list, exclusion worked.

## Common Pitfalls

**1. Label or annotation on the wrong level**

This does NOT work:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  labels:
    sidecar.istio.io/inject: "false"  # Wrong! This is on the Deployment, not the pod template
```

This WORKS:

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    metadata:
      labels:
        sidecar.istio.io/inject: "false"  # Correct! This is on the pod template
```

**2. Existing pods not affected**

Changing the injection label or annotation on a Deployment requires a rollout to take effect:

```bash
kubectl rollout restart deployment/batch-processor -n production
```

**3. String values required**

The label or annotation value must be a string, not a boolean:

```yaml
# Wrong
sidecar.istio.io/inject: false

# Correct
sidecar.istio.io/inject: "false"
```

YAML interprets `false` without quotes as a boolean. The injection webhook expects a string.

## Summary

Excluding pods from sidecar injection is straightforward once you know the right label. Use `sidecar.istio.io/inject: "false"` on the pod template for individual exclusions, port exclusion annotations for partial exclusion, and namespace labels for bulk exclusion. For Jobs and CronJobs, either exclude entirely or use Kubernetes native sidecar support where it is available. Always verify exclusion after deployment and watch for the common pitfalls around label placement and string values.
