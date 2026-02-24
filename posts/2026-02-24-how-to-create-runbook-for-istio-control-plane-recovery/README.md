# How to Create Runbook for Istio Control Plane Recovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Runbook, Disaster Recovery, Control Plane

Description: A runbook for recovering the Istio control plane from various failure scenarios including pod crashes, certificate issues, and complete cluster recovery.

---

When the Istio control plane goes down, the data plane (your sidecar proxies) keeps running with their last known configuration. That gives you some time, but not unlimited time. Certificates will stop rotating, new pods will not get sidecars injected, and configuration changes will not propagate. Recovering the control plane quickly and correctly is critical for mesh stability.

This runbook covers the most common control plane failure scenarios and how to recover from each one.

## Runbook: Istio Control Plane Recovery

### Purpose
Restore the Istio control plane (istiod) to full functionality after various failure scenarios.

### Impact Assessment

When the control plane is down, these things stop working:
- Sidecar injection for new pods
- Configuration updates (VirtualService, DestinationRule, etc.)
- Certificate rotation (workload certs expire after 24 hours by default)
- Service discovery updates (new endpoints not propagated)

These things continue working:
- Existing service-to-service traffic (with last known config)
- mTLS (until certificates expire)
- Current routing rules

**Time sensitivity**: You have approximately 12-20 hours before workload certificates start expiring (they rotate at 80% of their lifetime, which is 24 hours by default).

### Scenario 1: istiod Pod Crash Loop

#### Diagnosis

```bash
# Check istiod pod status
kubectl get pods -n istio-system -l app=istiod

# Check crash reason
kubectl describe pod -n istio-system -l app=istiod

# Check logs from the crashed container
kubectl logs -n istio-system -l app=istiod --previous --tail=100

# Check events
kubectl get events -n istio-system --sort-by='.lastTimestamp' | grep istiod
```

#### Common Causes and Fixes

**Out of Memory:**
```bash
# Check if OOM killed
kubectl describe pod -n istio-system -l app=istiod | grep -A 5 "Last State"

# Fix: Increase memory limits
kubectl patch deployment istiod -n istio-system --type=json \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "4Gi"}]'
```

**Invalid configuration:**
```bash
# Check for bad Istio resources
istioctl analyze --all-namespaces

# If a specific resource is causing issues, remove it
kubectl delete <resource-type> <name> -n <namespace>
```

**Certificate secret missing or corrupted:**
```bash
# Check if the CA secret exists
kubectl get secret cacerts -n istio-system
kubectl get secret istio-ca-secret -n istio-system

# If missing, istiod will create a self-signed CA on restart
# If you need a specific CA, restore from backup:
kubectl apply -f cacerts-backup.yaml

# Restart istiod
kubectl rollout restart deployment/istiod -n istio-system
```

**Webhook conflicts:**
```bash
# Check for conflicting webhooks
kubectl get mutatingwebhookconfiguration
kubectl get validatingwebhookconfiguration

# If there are duplicate Istio webhooks, remove the extras
kubectl delete mutatingwebhookconfiguration <duplicate-name>
```

### Scenario 2: istiod Deployment Deleted

If the istiod deployment was accidentally deleted:

```bash
# Check if the IstioOperator resource still exists
kubectl get istiooperator -n istio-system

# If IstioOperator exists, reinstall from it:
istioctl install -f <your-istio-config.yaml> -y

# If IstioOperator does not exist, install with default production profile:
istioctl install --set profile=default \
  --set components.pilot.k8s.resources.requests.cpu=500m \
  --set components.pilot.k8s.resources.requests.memory=512Mi \
  --set components.pilot.k8s.hpaSpec.minReplicas=2 \
  -y

# Verify
kubectl get pods -n istio-system -l app=istiod
istioctl proxy-status
```

### Scenario 3: istio-system Namespace Issues

If the entire namespace is having problems:

```bash
# Check namespace status
kubectl get namespace istio-system -o yaml

# Check if namespace is stuck in Terminating state
kubectl get namespace istio-system -o json | jq '.status'

# If namespace is stuck terminating, check for finalizers
kubectl get namespace istio-system -o json | jq '.spec.finalizers'

# Remove stuck finalizers (use with caution)
kubectl get namespace istio-system -o json | \
  jq '.spec.finalizers = []' | \
  kubectl replace --raw "/api/v1/namespaces/istio-system/finalize" -f -
```

### Scenario 4: Complete Control Plane Reinstallation

When istiod cannot be recovered through simple restarts:

```bash
# Step 1: Save the current CA certificates
kubectl get secret cacerts -n istio-system -o yaml > cacerts-backup.yaml 2>/dev/null
kubectl get secret istio-ca-secret -n istio-system -o yaml > istio-ca-secret-backup.yaml 2>/dev/null

# Step 2: Save all Istio configuration
for resource in virtualservices destinationrules gateways serviceentries sidecars authorizationpolicies peerauthentications requestauthentications envoyfilters; do
  kubectl get $resource --all-namespaces -o yaml > backup-$resource.yaml 2>/dev/null
done

# Step 3: Uninstall the broken control plane
istioctl uninstall --purge -y

# Step 4: Wait for cleanup
sleep 30
kubectl get pods -n istio-system
# Should be empty or only show terminating pods

# Step 5: Restore CA certificates first
kubectl create namespace istio-system 2>/dev/null
kubectl apply -f cacerts-backup.yaml 2>/dev/null

# Step 6: Reinstall istiod
istioctl install -f <your-istio-config.yaml> -y

# Step 7: Verify
kubectl get pods -n istio-system
istioctl proxy-status

# Step 8: Restore configuration resources
for resource in virtualservices destinationrules gateways serviceentries sidecars authorizationpolicies peerauthentications requestauthentications; do
  kubectl apply -f backup-$resource.yaml 2>/dev/null
done
```

### Scenario 5: Split-Brain Recovery (Multiple istiod Instances)

If istiod replicas are serving inconsistent configuration:

```bash
# Check which proxies are connected to which istiod instance
istioctl proxy-status

# Check istiod instances
kubectl get pods -n istio-system -l app=istiod -o wide

# Compare config across instances
for pod in $(kubectl get pods -n istio-system -l app=istiod -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== $pod ==="
  kubectl exec $pod -n istio-system -- curl -s localhost:15014/debug/configz | md5sum
done

# If instances have different configs, restart all of them
kubectl rollout restart deployment/istiod -n istio-system
kubectl rollout status deployment/istiod -n istio-system --timeout=120s
```

### Scenario 6: Recovery After Cluster Restore

If the Kubernetes cluster was restored from a backup:

```bash
# Step 1: Verify istio-system namespace exists
kubectl get namespace istio-system

# Step 2: Check if istiod is running
kubectl get pods -n istio-system

# Step 3: Check if CRDs are present
kubectl get crds | grep istio

# Step 4: If CRDs are missing, reinstall them
istioctl install -f <config.yaml> -y

# Step 5: Check certificate validity
kubectl get secret cacerts -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | \
  base64 -d | openssl x509 -noout -dates

# Step 6: Restart all meshed workloads to re-establish connections
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl rollout restart deployment -n $ns
done

# Step 7: Verify mesh connectivity
istioctl proxy-status
```

### Post-Recovery Validation

After any recovery scenario, run these checks:

```bash
# 1. All istiod pods running
kubectl get pods -n istio-system -l app=istiod

# 2. All proxies synced
istioctl proxy-status | grep -v SYNCED
# Should return no results

# 3. Sidecar injection working
kubectl run test-injection --image=busybox --restart=Never --dry-run=server -o yaml | \
  grep sidecar

# 4. Certificate issuance working
istioctl proxy-config secret <any-pod> | head -5

# 5. Configuration analysis clean
istioctl analyze --all-namespaces

# 6. Mesh metrics flowing
kubectl exec -n istio-system deploy/istiod -- \
  curl -s localhost:15014/metrics | grep pilot_xds_pushes
```

### Prevention Measures

To reduce the risk of control plane failures:

```yaml
# 1. Run multiple replicas with anti-affinity
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                podAffinityTerm:
                  labelSelector:
                    matchExpressions:
                      - key: app
                        operator: In
                        values:
                          - istiod
                  topologyKey: kubernetes.io/hostname
```

```yaml
# 2. Set up PodDisruptionBudget
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: istiod
```

```bash
# 3. Regular backups of critical secrets
kubectl get secret cacerts -n istio-system -o yaml > /backup/cacerts-$(date +%Y%m%d).yaml
```

### Recovery Time Estimates

| Scenario | Estimated Recovery Time |
|---|---|
| Pod restart (OOM, crash) | 2-5 minutes |
| Configuration fix | 5-15 minutes |
| Deployment recreation | 10-15 minutes |
| Full reinstallation | 30-60 minutes |
| Cluster restore + mesh recovery | 1-2 hours |

Practice these recovery scenarios in non-production environments. The worst time to discover that your recovery procedure does not work is during an actual outage.
