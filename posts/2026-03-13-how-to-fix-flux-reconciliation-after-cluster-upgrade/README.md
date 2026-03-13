# How to Fix Flux Reconciliation After Cluster Upgrade

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, ClusterUpgrade, Migration

Description: Restore Flux reconciliation after a Kubernetes cluster upgrade, handling API deprecations, controller restarts, and compatibility issues that arise during version transitions.

---

Kubernetes cluster upgrades are a routine but risky operation. Upgrading the control plane version can deprecate APIs, change default behaviors, and temporarily disrupt Flux controllers. This post covers the common reconciliation issues that arise after a cluster upgrade and how to fix them.

## Symptoms

After upgrading the Kubernetes cluster version, you may see:

```bash
flux get kustomizations
```

```
NAME        REVISION              SUSPENDED   READY   MESSAGE
my-app      main@sha1:abc123      False       False   resource mapping not found for name "my-ingress" ... no matches for kind "Ingress" in version "extensions/v1beta1"
```

Or controllers may be crashlooping:

```bash
kubectl get pods -n flux-system
```

```
NAME                                       READY   STATUS             RESTARTS   AGE
kustomize-controller-xxx                   0/1     CrashLoopBackOff   5          10m
source-controller-xxx                      0/1     CrashLoopBackOff   5          10m
```

## Diagnostic Commands

### Check the cluster version

```bash
kubectl version --short
```

### Check Flux controller status

```bash
kubectl get pods -n flux-system
kubectl describe pods -n flux-system -l app.kubernetes.io/part-of=flux
```

### Check for deprecated API usage in your manifests

```bash
kubectl get --raw /apis | jq -r '.groups[].versions[].groupVersion'
```

### Check Flux component versions

```bash
flux version
```

### Look for API deprecation warnings

```bash
kubectl logs -n flux-system deployment/kustomize-controller | grep -i "deprecated\|removed\|unsupported"
```

## Common Root Causes

### 1. Removed API versions

Kubernetes removes deprecated APIs on major version upgrades. If your manifests use removed APIs, Flux cannot apply them.

Common removals by version:
- **1.22**: Removed `extensions/v1beta1` Ingress, `rbac.authorization.k8s.io/v1beta1`
- **1.25**: Removed `policy/v1beta1` PodSecurityPolicy
- **1.26**: Removed `autoscaling/v2beta1` HPA
- **1.27**: Removed `storage.k8s.io/v1beta1` CSIStorageCapacity

### 2. Flux version incompatible with cluster version

An older Flux version may not support features or API changes in the new Kubernetes version.

### 3. Controller resource limits too low for new version

The new Kubernetes version may require more resources for API server communication, causing controllers to OOM.

### 4. Webhook compatibility issues

Admission webhooks compiled against old API versions may reject resources or crash after the upgrade.

### 5. etcd schema changes

Internal schema changes can affect how Flux reads and writes resource status.

## Step-by-Step Fixes

### Fix 1: Update deprecated API versions in manifests

Identify and update all deprecated APIs in your Git repository:

```bash
# Find deprecated Ingress API usage
grep -r "extensions/v1beta1" ./
grep -r "networking.k8s.io/v1beta1" ./

# Find deprecated PodSecurityPolicy
grep -r "policy/v1beta1" ./
```

Update to the current API versions:

```yaml
# Before
apiVersion: extensions/v1beta1
kind: Ingress

# After
apiVersion: networking.k8s.io/v1
kind: Ingress
```

Note that newer API versions often have structural changes. For example, the `networking.k8s.io/v1` Ingress requires an `ingressClassName` field and a different path specification format.

### Fix 2: Upgrade Flux to a compatible version

Check the Flux compatibility matrix and upgrade if needed:

```bash
flux version

# Upgrade Flux
flux install --version=v2.x.x
```

Or update via Git if you bootstrap Flux from a repository:

```bash
flux install --export > clusters/my-cluster/flux-system/gotk-components.yaml
git add . && git commit -m "Upgrade Flux components" && git push
```

### Fix 3: Increase controller resource limits

If controllers are OOMKilled after the upgrade:

```bash
kubectl describe pod -n flux-system -l app=kustomize-controller | grep -A 5 "Last State"
```

Increase limits:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          resources:
            limits:
              memory: 2Gi
              cpu: 2000m
            requests:
              memory: 512Mi
              cpu: 200m
```

### Fix 4: Fix webhook compatibility

Check for failing webhooks:

```bash
kubectl get validatingwebhookconfigurations
kubectl get mutatingwebhookconfigurations
```

If a webhook is failing, either upgrade the webhook controller or temporarily set its failure policy to Ignore:

```bash
kubectl patch validatingwebhookconfiguration my-webhook --type=json -p='[{"op":"replace","path":"/webhooks/0/failurePolicy","value":"Ignore"}]'
```

Upgrade the webhook controller to a version compatible with the new cluster version.

### Fix 5: Restart Flux controllers

After fixing the underlying issues, restart all Flux controllers:

```bash
kubectl rollout restart -n flux-system deployment/source-controller
kubectl rollout restart -n flux-system deployment/kustomize-controller
kubectl rollout restart -n flux-system deployment/helm-controller
kubectl rollout restart -n flux-system deployment/notification-controller
```

### Fix 6: Force full reconciliation

After all controllers are healthy:

```bash
flux reconcile source git --all
flux reconcile kustomization --all
```

## Prevention Strategies

1. **Run API deprecation checks before upgrading** using tools like `kubent` (kube-no-trouble):

```bash
kubent --cluster
```

This scans your cluster for resources using deprecated APIs.

2. **Upgrade Flux before the cluster** to ensure Flux supports the target Kubernetes version.
3. **Test upgrades in a staging cluster** with the same Flux configuration to catch issues before production.
4. **Maintain a compatibility matrix** documenting which Flux version runs on which Kubernetes version.
5. **Use CI to scan manifests** for deprecated API versions:

```bash
# In your CI pipeline
pluto detect-files -d ./manifests/ --target-versions k8s=v1.28
```

6. **Follow the Flux upgrade guide** for each Kubernetes version upgrade to understand any specific requirements or breaking changes.

Cluster upgrades are safest when you prepare in advance by checking for API deprecations, upgrading Flux first, and testing in a non-production environment. The extra preparation time pays for itself in avoided downtime.
