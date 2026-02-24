# How to Migrate from Permissive to Strict mTLS in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, mTLS, Migration, Security, Zero Trust

Description: A detailed migration guide for safely transitioning from permissive to strict mutual TLS in Istio without causing service outages.

---

Moving from permissive to strict mTLS is one of the most impactful security improvements you can make in your Kubernetes cluster. But it is also one of the riskiest if done carelessly. A single service without a sidecar, a forgotten CronJob, or an external integration that connects directly can break silently or loudly when you flip the switch.

This guide walks through a systematic, low-risk approach to making this transition.

## Understanding the Current State

Before changing anything, you need a clear picture of what is going on in your mesh right now.

### Check the Current Mesh-Wide Policy

```bash
kubectl get peerauthentication --all-namespaces
```

If you see no PeerAuthentication resources, you are running with the default (PERMISSIVE). If you see one in istio-system, that is the mesh-wide policy.

### Identify All Non-Sidecar Workloads

These are the workloads that will break when you switch to strict mode because they cannot initiate mTLS connections:

```bash
# List all pods without istio-proxy container
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.containers | map(.name) | contains(["istio-proxy"]) | not) | "\(.metadata.namespace)/\(.metadata.name)"'
```

Pay attention to:
- Pods in namespaces without injection labels
- Jobs and CronJobs
- DaemonSets (monitoring agents, log collectors)
- Pods with `sidecar.istio.io/inject: "false"` annotations

### Check Connection Security Metrics

If you have Prometheus set up, query the connection security status:

```
sum(rate(istio_requests_total{connection_security_policy="none", reporter="destination"}[5m])) by (destination_service)
```

This shows you which services are currently receiving plain text connections. These are the services that will have callers break when you switch to strict.

For each service receiving plain text connections:

```
sum(rate(istio_requests_total{connection_security_policy="none", reporter="destination", destination_service="my-service.production.svc.cluster.local"}[5m])) by (source_workload, source_workload_namespace)
```

This tells you which workloads are calling without mTLS.

## Phase 1: Ensure Full Sidecar Coverage

The goal is to get sidecars injected into every workload that communicates within the mesh.

### Enable Namespace Injection

For each namespace that does not have automatic injection:

```bash
kubectl label namespace <namespace> istio-injection=enabled
```

Then restart deployments in those namespaces to pick up the sidecar:

```bash
kubectl rollout restart deployment -n <namespace>
```

### Handle Special Workloads

**Jobs and CronJobs**: These need special handling because the sidecar does not terminate when the job completes. Add the `sidecar.istio.io/inject: "true"` annotation and configure the job to signal the sidecar to quit:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: data-sync
  namespace: production
spec:
  schedule: "*/30 * * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            sidecar.istio.io/inject: "true"
        spec:
          containers:
          - name: sync
            image: my-sync-job:latest
            command:
            - /bin/sh
            - -c
            - |
              /app/sync && curl -X POST http://localhost:15020/quitquitquit
          restartPolicy: OnFailure
```

The `quitquitquit` endpoint tells the sidecar to terminate gracefully after the job finishes.

**DaemonSets**: Monitoring agents like Datadog or Fluentd usually do not need sidecars because they collect data from the node, not from the mesh. But if they make API calls to services in the mesh, they will need sidecars or exceptions.

## Phase 2: Verify mTLS is Already Working

With auto mTLS enabled (the default), sidecar-to-sidecar traffic should already be using mTLS even in permissive mode. Verify this:

```bash
# Pick a representative pod
istioctl x describe pod <pod-name> -n production
```

Look for output indicating mTLS is in effect. You can also check proxy config:

```bash
istioctl proxy-config cluster <pod-name> -n production --direction outbound -o json | \
  jq '.[] | select(.transportSocket != null) | .name'
```

This lists clusters (services) where TLS is configured for outbound connections.

## Phase 3: Namespace-by-Namespace Strict Mode

Do not go mesh-wide strict all at once. Start with the namespace that has the least external dependencies and the most comprehensive monitoring.

### Apply Strict Mode to a Test Namespace

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: staging
spec:
  mtls:
    mode: STRICT
```

```bash
kubectl apply -f strict-staging.yaml
```

### Monitor for Failures

Watch for errors in the next few minutes:

```bash
# Check proxy logs for TLS errors
kubectl logs -n staging -l app=my-service -c istio-proxy --tail=100 | grep -i "tls\|ssl\|connection"

# Check application logs for connection errors
kubectl logs -n staging -l app=my-service --tail=100 | grep -i "error\|fail\|refused"
```

In Prometheus:

```
rate(istio_requests_total{response_code=~"5.*", destination_workload_namespace="staging"}[5m])
```

### Create Exceptions Where Needed

If a specific service needs to accept plain text (for example, a metrics endpoint scraped by Prometheus), create a workload-specific exception:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: metrics-exception
  namespace: staging
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: PERMISSIVE
```

### Repeat for Each Namespace

Once staging is stable, move to the next namespace:

```bash
# Suggested order: staging -> dev -> internal-tools -> production
for ns in dev internal-tools production; do
  kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: $ns
spec:
  mtls:
    mode: STRICT
EOF
  echo "Applied strict mTLS to $ns. Monitoring..."
  sleep 300  # Wait 5 minutes between namespaces
done
```

## Phase 4: Mesh-Wide Strict Mode

Once all namespaces have their own strict PeerAuthentication and are stable, apply the mesh-wide policy:

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

This catches any new namespaces that get created in the future. They will inherit strict mode automatically.

## Rollback Procedure

If things go wrong, rollback is fast:

```bash
# Revert a single namespace
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: PERMISSIVE
EOF
```

Or revert the entire mesh:

```bash
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
EOF
```

Changes propagate to sidecars within seconds, so recovery is quick.

## Post-Migration Validation

After the migration is complete, confirm everything is encrypted:

```bash
# No plain text connections should exist
sum(rate(istio_requests_total{connection_security_policy="none", reporter="destination"}[5m]))
```

This query should return 0 (or very close to it). If it does not, investigate the remaining plain text connections.

Run the analyzer to check for configuration issues:

```bash
istioctl analyze --all-namespaces
```

The migration from permissive to strict is a one-way trip in terms of security posture. Once you are strict, keep it strict. Any new namespace or workload should be planned with mTLS in mind from the start.
