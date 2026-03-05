# How to Configure Flux with Pod Security Admission

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Security, Pod Security Admission, PSA

Description: Learn how to configure Pod Security Admission in Kubernetes namespaces managed by Flux CD to enforce security profiles on workloads.

---

Pod Security Admission (PSA) is the built-in Kubernetes mechanism for enforcing Pod Security Standards. It replaced PodSecurityPolicy starting in Kubernetes 1.25. When combined with Flux CD, PSA ensures that all workloads deployed through GitOps comply with your chosen security profile. This guide shows you how to configure PSA for Flux-managed namespaces.

## Understanding Pod Security Admission Modes

PSA operates in three modes per namespace:

- **enforce**: Pods violating the policy are rejected.
- **warn**: Pods violating the policy are admitted, but a warning is shown.
- **audit**: Pods violating the policy are admitted, but violations are recorded in audit logs.

## Step 1: Configure Namespaces with PSA Labels Through Flux

Manage namespace PSA labels through your Git repository so they are version-controlled:

```yaml
# namespaces/production.yaml
# Production namespace with Restricted Pod Security Standard enforced
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.28
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: v1.28
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: v1.28
---
# namespaces/staging.yaml
# Staging namespace with Baseline enforcement and Restricted warnings
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/enforce-version: v1.28
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: v1.28
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: v1.28
---
# namespaces/development.yaml
# Development namespace with Baseline warnings only
apiVersion: v1
kind: Namespace
metadata:
  name: development
  labels:
    pod-security.kubernetes.io/enforce: baseline
    pod-security.kubernetes.io/warn: baseline
    pod-security.kubernetes.io/audit: restricted
```

## Step 2: Deploy Namespaces with Flux

Create a Flux Kustomization to manage namespaces:

```yaml
# kustomization-namespaces.yaml
# Flux Kustomization to manage namespace configurations
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: namespaces
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./namespaces
  prune: false  # Do not delete namespaces when removed from Git
```

## Step 3: Ensure Flux-Deployed Workloads Comply

All workloads deployed by Flux into PSA-enforced namespaces must comply with the Restricted profile. Here is a compliant Deployment:

```yaml
# deployment-compliant.yaml
# Deployment that complies with the Restricted Pod Security Standard
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  namespace: production
  labels:
    app.kubernetes.io/name: webapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: webapp
  template:
    metadata:
      labels:
        app.kubernetes.io/name: webapp
    spec:
      # Pod-level security context for Restricted compliance
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: webapp
          image: ghcr.io/myorg/webapp:v1.0.0
          ports:
            - containerPort: 8080
          # Container-level security context for Restricted compliance
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop: ["ALL"]
            readOnlyRootFilesystem: true
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              memory: 256Mi
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
```

## Step 4: Configure PSA for the Flux System Namespace

Protect the flux-system namespace with PSA:

```yaml
# flux-system-psa.yaml
# Apply Restricted PSA to the flux-system namespace
apiVersion: v1
kind: Namespace
metadata:
  name: flux-system
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: v1.28
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

Apply it directly since Flux manages itself:

```bash
# Apply PSA labels to flux-system
kubectl apply -f flux-system-psa.yaml

# Verify all Flux pods still run correctly under Restricted
kubectl get pods -n flux-system
```

## Step 5: Handle Helm Charts That Violate PSA

Some Helm charts may deploy pods that violate the Restricted profile. Use Flux HelmRelease values to fix compliance issues:

```yaml
# helmrelease-with-psa-fixes.yaml
# HelmRelease with values overridden to comply with Restricted PSA
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: redis
  namespace: flux-system
spec:
  interval: 30m
  chart:
    spec:
      chart: redis
      version: "18.x"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  targetNamespace: production
  values:
    # Override security contexts to comply with Restricted PSA
    master:
      podSecurityContext:
        runAsNonRoot: true
        runAsUser: 1001
        fsGroup: 1001
        seccompProfile:
          type: RuntimeDefault
      containerSecurityContext:
        allowPrivilegeEscalation: false
        capabilities:
          drop: ["ALL"]
        readOnlyRootFilesystem: true
```

## Step 6: Monitor PSA Violations

Set up monitoring for PSA violations in your cluster:

```bash
# Check for PSA warnings when applying resources
kubectl apply --dry-run=server -f deployment.yaml -n production

# View audit logs for PSA violations (location depends on cluster setup)
# For managed Kubernetes, check your cloud provider's audit log service

# Check Flux Kustomization status for PSA-related failures
flux get kustomizations -A | grep False

# View detailed reconciliation errors
kubectl get kustomization -n flux-system -o json | jq '.items[] | select(.status.conditions[]?.status=="False") | {name: .metadata.name, message: .status.conditions[].message}'
```

## Step 7: Gradually Roll Out PSA

Use a phased approach to roll out PSA across your namespaces:

```bash
# Phase 1: Audit only - no impact on workloads
kubectl label namespace production \
  pod-security.kubernetes.io/audit=restricted \
  --overwrite

# Phase 2: Add warnings - users see warnings but workloads are not blocked
kubectl label namespace production \
  pod-security.kubernetes.io/warn=restricted \
  --overwrite

# Phase 3: Enforce - non-compliant workloads are rejected
kubectl label namespace production \
  pod-security.kubernetes.io/enforce=restricted \
  --overwrite
```

## Best Practices

1. **Start with audit mode**: Roll out PSA gradually using audit, then warn, then enforce.
2. **Version-pin PSA profiles**: Always use `enforce-version` labels to prevent surprise changes during Kubernetes upgrades.
3. **Manage labels via GitOps**: Store namespace PSA labels in Git so they are reviewed and version-controlled.
4. **Fix Helm charts**: Override Helm chart values to comply with PSA rather than weakening the security profile.
5. **Protect flux-system**: Apply the Restricted profile to the flux-system namespace since Flux controllers are designed to comply.
6. **Combine with Kyverno or Gatekeeper**: PSA covers pod-level security. Use a policy engine for broader resource validation.

Pod Security Admission provides a built-in, zero-dependency way to enforce security baselines on Flux-managed workloads. By managing PSA labels through GitOps, you ensure consistent security enforcement across all your namespaces.
