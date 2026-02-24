# How to Create Runbook for Istio Data Plane Recovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Runbook, Data Plane, Envoy

Description: A runbook for recovering the Istio data plane from sidecar proxy failures, injection issues, and connectivity problems across the mesh.

---

The Istio data plane consists of all the Envoy sidecar proxies running alongside your application containers. When the data plane has issues, it is your application traffic that suffers directly. Unlike control plane problems which give you a grace period, data plane failures hit immediately. A crashing sidecar means the associated pod cannot send or receive mesh traffic.

This runbook covers how to diagnose and recover from data plane failures.

## Runbook: Istio Data Plane Recovery

### Purpose
Recover from Istio data plane (sidecar proxy) failures that affect application traffic flow.

### Impact of Data Plane Issues

- Affected pods cannot communicate through the mesh
- Requests fail or time out
- New pods may start without sidecars
- mTLS enforcement may be inconsistent

### Scenario 1: Individual Sidecar Crash

When a single pod's sidecar is crashing:

#### Diagnosis

```bash
# Check the pod status
kubectl get pod <pod-name> -n <namespace>

# Look for restarts on the istio-proxy container
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.status.containerStatuses[?(@.name=="istio-proxy")].restartCount}'

# Check sidecar logs
kubectl logs <pod-name> -n <namespace> -c istio-proxy --tail=100

# Check previous crash logs
kubectl logs <pod-name> -n <namespace> -c istio-proxy --previous --tail=100

# Describe the pod for events
kubectl describe pod <pod-name> -n <namespace> | tail -30
```

#### Common Causes and Fixes

**OOMKilled:**
```bash
# Check for OOM
kubectl describe pod <pod-name> -n <namespace> | grep -A3 "Last State"

# Fix: Increase sidecar memory
kubectl patch deployment <deployment-name> -n <namespace> --type=json \
  -p='[{"op": "add", "path": "/spec/template/metadata/annotations/sidecar.istio.io~1proxyMemoryLimit", "value": "1Gi"}]'
kubectl rollout restart deployment <deployment-name> -n <namespace>
```

**Configuration error causing crash:**
```bash
# Check for bad EnvoyFilter targeting this workload
kubectl get envoyfilters -n <namespace>
kubectl get envoyfilters -n istio-system

# If an EnvoyFilter is causing the crash, remove it
kubectl delete envoyfilter <name> -n <namespace>
```

**Certificate issue:**
```bash
# Check if the sidecar can reach istiod for certificate renewal
kubectl exec <pod-name> -n <namespace> -c istio-proxy -- \
  curl -s localhost:15000/certs

# If certificates have expired, delete the pod to get fresh ones
kubectl delete pod <pod-name> -n <namespace>
```

### Scenario 2: Widespread Sidecar Failures

When many sidecars are failing across the mesh:

#### Diagnosis

```bash
# Count pods with sidecar issues
kubectl get pods --all-namespaces | grep -E "CrashLoopBackOff|Error" | grep -c "istio"

# Check for a common error across sidecars
for pod in $(kubectl get pods --all-namespaces --field-selector=status.phase!=Running -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}' | head -10); do
  ns=$(echo $pod | cut -d/ -f1)
  name=$(echo $pod | cut -d/ -f2)
  echo "=== $pod ==="
  kubectl logs $name -n $ns -c istio-proxy --tail=5 2>/dev/null
done

# Check istiod health (mass sidecar issues often originate from control plane)
kubectl get pods -n istio-system -l app=istiod
kubectl logs -n istio-system deploy/istiod --tail=50 | grep -i "error\|fatal"
```

#### If Caused by Bad Configuration Push

```bash
# Check what was recently changed
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | grep -i "istio\|envoyfilter\|virtualservice" | tail -20

# Check the xDS push status
istioctl proxy-status

# If proxies show STALE, the issue is likely istiod
# If proxies show SYNCED but are crashing, the pushed config may be invalid

# Identify the bad config
istioctl analyze --all-namespaces
```

#### Emergency: Bypass Sidecars

If sidecars are causing a complete outage and you need to restore traffic immediately:

```bash
# Option 1: Remove injection and restart (fastest for affected namespaces)
kubectl label namespace <namespace> istio-injection-
kubectl rollout restart deployment -n <namespace>

# Option 2: Scale down problematic workloads and back up without sidecars
kubectl annotate deployment <name> -n <namespace> sidecar.istio.io/inject="false"
kubectl rollout restart deployment <name> -n <namespace>
```

WARNING: This disables mesh features (mTLS, traffic management, observability) for affected workloads.

### Scenario 3: Sidecar Injection Failures

New pods are starting without sidecars:

#### Diagnosis

```bash
# Check the mutating webhook
kubectl get mutatingwebhookconfiguration | grep istio

# Check the webhook configuration
kubectl get mutatingwebhookconfiguration istio-sidecar-injector -o yaml | grep -A 10 "webhooks:"

# Check if istiod (which handles injection) is healthy
kubectl get pods -n istio-system -l app=istiod

# Check the namespace label
kubectl get namespace <namespace> --show-labels

# Try a dry-run to see if injection would work
kubectl run test-inject --image=busybox --restart=Never --dry-run=server -n <namespace> -o yaml | \
  grep -c "istio-proxy"
```

#### Fixes

```bash
# If webhook is missing, reinstall it
istioctl install -f <config.yaml> -y

# If istiod is down, restart it
kubectl rollout restart deployment/istiod -n istio-system

# If namespace label is wrong
kubectl label namespace <namespace> istio-injection=enabled --overwrite

# Restart pods that started without sidecars
kubectl rollout restart deployment -n <namespace>
```

### Scenario 4: Init Container Failures

The `istio-init` container sets up iptables rules for traffic interception. If it fails, the sidecar cannot intercept traffic:

```bash
# Check init container status
kubectl get pod <pod-name> -n <namespace> -o jsonpath='{.status.initContainerStatuses}'

# Check init container logs
kubectl logs <pod-name> -n <namespace> -c istio-init

# Common error: permission denied for iptables
# This happens when NET_ADMIN capability is not allowed
```

Fixes:

```bash
# Check if PodSecurityPolicy or SecurityContext is blocking capabilities
kubectl get psp
kubectl get pod <pod-name> -n <namespace> -o yaml | grep -A 10 "securityContext"

# If using Istio CNI plugin instead of init container:
kubectl get daemonset -n istio-system | grep cni
kubectl logs -n istio-system -l k8s-app=istio-cni-node --tail=50
```

If using Istio CNI to avoid the init container entirely:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      excludeNamespaces:
        - istio-system
        - kube-system
```

### Scenario 5: Stale Configuration on Sidecars

Sidecars are running but have outdated configuration:

```bash
# Check sync status
istioctl proxy-status

# Look for STALE entries
istioctl proxy-status | grep STALE

# Force a config push by restarting the sidecar
kubectl exec <pod-name> -n <namespace> -c istio-proxy -- \
  curl -s -X POST localhost:15000/quitquitquit
# This kills the sidecar, and Kubernetes restarts it with fresh config

# Or restart the entire pod
kubectl delete pod <pod-name> -n <namespace>
```

For widespread staleness:

```bash
# Restart istiod to trigger a full config push
kubectl rollout restart deployment/istiod -n istio-system

# If that does not help, rolling restart of affected workloads
kubectl rollout restart deployment -n <namespace>
```

### Scenario 6: Recovering After Node Failure

When a node comes back after a failure, pods may have connectivity issues:

```bash
# Check pods on the recovered node
NODE_NAME=<node-name>
kubectl get pods --all-namespaces --field-selector spec.nodeName=$NODE_NAME

# Verify sidecars on those pods are connected to istiod
istioctl proxy-status | grep $NODE_NAME

# If pods are running but sidecars are disconnected, restart them
kubectl get pods --field-selector spec.nodeName=$NODE_NAME -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}' | while read pod; do
  ns=$(echo $pod | cut -d/ -f1)
  name=$(echo $pod | cut -d/ -f2)
  kubectl delete pod $name -n $ns
done
```

### Post-Recovery Validation

After resolving any data plane issue:

```bash
# 1. All pods running with sidecars (2/2 containers)
kubectl get pods --all-namespaces | grep -E "1/2|0/2"
# Should return no results for meshed namespaces

# 2. All proxies synced
istioctl proxy-status | grep -v SYNCED
# Should be empty

# 3. Test connectivity between services
kubectl exec <pod-a> -c <container> -- curl -s http://<service-b>:<port>/health

# 4. Check metrics are flowing
istioctl proxy-config listener <pod> -n <namespace> | head -10

# 5. Verify mTLS
istioctl proxy-config secret <pod> -n <namespace> | head -5
```

### Prevention

1. **Set appropriate resource limits** on sidecars based on actual usage
2. **Use PodDisruptionBudgets** for critical workloads
3. **Monitor sidecar health** with alerts on restarts and OOM kills
4. **Test configuration changes** in staging before production
5. **Use `istioctl analyze`** before applying any Istio configuration

```yaml
# Alert on sidecar restarts
- alert: SidecarRestarts
  expr: increase(kube_pod_container_status_restarts_total{container="istio-proxy"}[1h]) > 3
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Sidecar proxy restarting frequently"
    description: "Pod {{ $labels.pod }} istio-proxy has restarted {{ $value }} times in the last hour"
```

Data plane recovery is usually faster than control plane recovery because you can fix individual pods without affecting the entire mesh. The key is having good monitoring so you catch issues before they spread.
