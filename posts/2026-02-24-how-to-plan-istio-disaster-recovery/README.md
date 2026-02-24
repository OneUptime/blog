# How to Plan Istio Disaster Recovery

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Disaster Recovery, Kubernetes, High Availability, Operations

Description: Plan and implement disaster recovery for your Istio service mesh covering control plane failures, configuration backup, certificate recovery, and mesh reconstruction.

---

What happens when istiod goes down? What if someone accidentally deletes all your Istio CRDs? What if the cluster hosting your control plane has a catastrophic failure? These are the questions that disaster recovery planning answers. The good news is that Istio is reasonably resilient. The bad news is that "reasonably resilient" is not the same as "you do not need a plan."

## Understanding Istio Failure Modes

Before planning recovery, understand what can fail:

### Control Plane (istiod) Failure

When istiod becomes unavailable, the data plane continues to function with its last known configuration. Envoy proxies cache their configuration and keep routing traffic. However:

- New pods will not get sidecar injection (the webhook fails)
- Configuration changes will not propagate
- Certificate rotation will stop (certificates have a default 24-hour lifetime)
- New services will not be discoverable by existing proxies

You have roughly 24 hours before certificate expiration starts causing mTLS failures. In practice, you want to recover much faster than that.

### Configuration Loss

If Istio custom resources (VirtualServices, DestinationRules, etc.) are accidentally deleted, traffic management and security policies stop working immediately. Envoy proxies receive updated configuration (with the resources removed) and revert to default behavior.

### Complete Cluster Loss

If you lose the entire cluster, you need to rebuild everything: the Istio control plane, all configuration, certificates, and the applications themselves.

## Backup Strategy

### Configuration Backup

All Istio configuration should live in Git. This is your primary backup:

```bash
# Export all Istio resources as a secondary backup
for resource in virtualservices destinationrules gateways serviceentries authorizationpolicies peerauthentications requestauthentications envoyfilters sidecars; do
  kubectl get $resource -A -o yaml > backup/istio-${resource}-$(date +%Y%m%d).yaml
done
```

Run this as a CronJob for defense in depth:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: istio-config-backup
  namespace: istio-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: istio-backup
          containers:
            - name: backup
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  for resource in virtualservices destinationrules gateways serviceentries authorizationpolicies peerauthentications; do
                    kubectl get $resource -A -o yaml > /backup/istio-${resource}.yaml
                  done
              volumeMounts:
                - name: backup-volume
                  mountPath: /backup
          volumes:
            - name: backup-volume
              persistentVolumeClaim:
                claimName: istio-backup-pvc
          restartPolicy: OnFailure
```

### Certificate Backup

Istio uses a CA certificate to sign workload certificates. If you lose this CA certificate, all mTLS communication breaks because new certificates will not be trusted by existing proxies.

Back up the CA certificate:

```bash
# Back up the Istio CA secret
kubectl get secret istio-ca-secret -n istio-system -o yaml > backup/istio-ca-secret.yaml

# For Istio installations using cacerts
kubectl get secret cacerts -n istio-system -o yaml > backup/cacerts.yaml
```

Store these backups securely (encrypted, with restricted access). The CA private key is the most sensitive piece of the entire mesh.

### IstioOperator Backup

If you use IstioOperator for installation, back up the operator configuration:

```bash
kubectl get istiooperator -n istio-system -o yaml > backup/istio-operator.yaml
```

This allows you to recreate the exact same Istio installation.

## Recovery Procedures

### Scenario 1: istiod Pod Failure

**Impact**: Temporary. Data plane continues working.

**Recovery**:

```bash
# Check istiod status
kubectl get pods -n istio-system -l app=istiod

# If pods are in CrashLoopBackOff, check logs
kubectl logs deploy/istiod -n istio-system --previous

# Try restarting
kubectl rollout restart deploy/istiod -n istio-system

# If restart does not help, check resource limits
kubectl describe deploy/istiod -n istio-system
```

**Recovery time**: Minutes.

### Scenario 2: istiod Deployment Deleted

**Impact**: No new configuration pushes, no sidecar injection, certificates start expiring.

**Recovery**:

```bash
# Reinstall istiod
istioctl install --set profile=default -y

# Or if using IstioOperator
kubectl apply -f backup/istio-operator.yaml
```

Existing proxies will reconnect to the new istiod and receive a full configuration sync.

**Recovery time**: 5-15 minutes.

### Scenario 3: Istio CRDs Deleted

**Impact**: All Istio custom resources are gone. Traffic reverts to default behavior.

**Recovery**:

```bash
# Reinstall Istio (this recreates CRDs)
istioctl install --set profile=default -y

# Reapply configuration from Git
kubectl apply -f istio-config/ -R

# Or from backup
kubectl apply -f backup/
```

**Recovery time**: 15-30 minutes depending on configuration volume.

### Scenario 4: CA Certificate Lost

**Impact**: New workload certificates cannot be issued. After existing certificates expire (24 hours by default), mTLS breaks everywhere.

**Recovery if you have a backup**:

```bash
# Restore the CA secret
kubectl apply -f backup/cacerts.yaml

# Restart istiod to pick up the restored certificate
kubectl rollout restart deploy/istiod -n istio-system

# Restart all workloads to get new certificates signed by the restored CA
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl rollout restart deploy -n $ns
done
```

**Recovery if you do not have a backup**:

```bash
# Delete the old CA secret so istiod generates a new one
kubectl delete secret istio-ca-secret -n istio-system

# Restart istiod
kubectl rollout restart deploy/istiod -n istio-system

# Restart ALL workloads to get new certificates
for ns in $(kubectl get namespaces -l istio-injection=enabled -o jsonpath='{.items[*].metadata.name}'); do
  kubectl rollout restart deploy -n $ns
done
```

This is disruptive because every workload needs to be restarted to get a certificate from the new CA.

**Recovery time**: 30-60 minutes for a full restart across all namespaces.

### Scenario 5: Complete Cluster Loss

**Impact**: Everything is gone.

**Recovery**:

1. Provision a new cluster
2. Install Istio with the backed-up operator configuration:

```bash
istioctl install -f backup/istio-operator.yaml -y
```

3. Restore the CA certificate (critical for multi-cluster or if clients cache certificates):

```bash
kubectl apply -f backup/cacerts.yaml
kubectl rollout restart deploy/istiod -n istio-system
```

4. Apply all Istio configuration from Git:

```bash
kubectl apply -f istio-config/ -R
```

5. Deploy applications (using your existing deployment pipeline)

**Recovery time**: Depends on cluster provisioning and application deployment time. The Istio-specific part is 15-30 minutes.

## High Availability Configuration

Reduce the likelihood of needing disaster recovery by configuring Istio for high availability:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 3
        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - istiod
                topologyKey: kubernetes.io/hostname
        resources:
          requests:
            cpu: 500m
            memory: 2Gi
          limits:
            cpu: 2000m
            memory: 4Gi
  values:
    pilot:
      autoscaleEnabled: true
      autoscaleMin: 3
      autoscaleMax: 5
```

Add a PodDisruptionBudget:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod-pdb
  namespace: istio-system
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: istiod
```

## Testing Your Recovery Plan

A disaster recovery plan that has never been tested is just a wish. Schedule regular tests:

### Quarterly: Control Plane Recovery Test

1. In a staging cluster, delete the istiod deployment
2. Verify the data plane continues working
3. Reinstall istiod from your backed-up configuration
4. Verify all proxies reconnect and configuration syncs

### Annually: Full Recovery Test

1. Build a new cluster from scratch
2. Install Istio from your backup configuration
3. Restore CA certificates
4. Apply all Istio configuration from Git
5. Deploy a subset of applications
6. Verify traffic management and security policies work

### After Every Upgrade

After upgrading Istio, verify that your backup and recovery procedures still work with the new version.

## Recovery Time Objectives

Define clear RTOs for each scenario:

| Scenario | RTO | RPO |
|----------|-----|-----|
| istiod pod failure | 5 minutes (auto-recovery) | 0 (no data loss) |
| istiod deployment deleted | 15 minutes | 0 (config in Git) |
| CRDs deleted | 30 minutes | 0 (config in Git) |
| CA certificate lost | 60 minutes | Last backup |
| Complete cluster loss | 4 hours | Last Git commit |

Communicate these RTOs to your stakeholders so expectations are set correctly.

## Summary

Istio disaster recovery planning covers five main scenarios: istiod failure, deployment deletion, CRD loss, CA certificate loss, and complete cluster loss. The most important things you can do are store all configuration in Git, back up the CA certificate separately, configure istiod for high availability, and test your recovery procedures regularly. With these measures in place, even a worst-case scenario is recoverable within a known timeframe.
