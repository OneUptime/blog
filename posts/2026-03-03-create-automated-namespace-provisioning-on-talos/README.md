# How to Create Automated Namespace Provisioning on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Automation, Namespace Provisioning, GitOps

Description: Learn how to automate namespace provisioning on Talos Linux with RBAC, quotas, network policies, and limit ranges applied automatically.

---

Creating a namespace on Kubernetes is a single command. But creating a production-ready namespace with proper RBAC, resource quotas, limit ranges, network policies, and default configurations takes dozens of commands and YAML files. When you do this manually for every new team or project, mistakes happen. Policies get missed, quotas differ between similar namespaces, and security controls are inconsistent.

Automated namespace provisioning solves this by defining a standard set of controls and applying them every time a new namespace is created. On a Talos Linux cluster, this automation ensures that every namespace starts secure and properly configured from day one.

## What a Provisioned Namespace Needs

A properly configured namespace on a shared Talos cluster includes several components.

First, the namespace itself with appropriate labels. Second, RBAC roles and bindings for the team that owns it. Third, resource quotas to limit total consumption. Fourth, limit ranges to set per-container defaults. Fifth, network policies for traffic isolation. Sixth, default service accounts with minimal permissions. Seventh, any namespace-specific configurations like image pull secrets.

Setting all of this up manually every time is tedious and error-prone. Let us automate it.

## Approach 1: Shell Script Automation

The simplest approach is a shell script that takes parameters and creates everything.

```bash
#!/bin/bash
# provision-namespace.sh
# Usage: ./provision-namespace.sh <namespace> <team-name> <cpu-quota> <memory-quota>

set -euo pipefail

NAMESPACE=$1
TEAM=$2
CPU_QUOTA=${3:-"16"}
MEMORY_QUOTA=${4:-"32Gi"}

echo "Provisioning namespace: $NAMESPACE for team: $TEAM"

# Step 1: Create the namespace with labels
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | \
  kubectl apply -f -

kubectl label namespace "$NAMESPACE" \
  team="$TEAM" \
  managed-by=namespace-provisioner \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  --overwrite

# Step 2: Apply resource quota
kubectl -n "$NAMESPACE" apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
spec:
  hard:
    requests.cpu: "${CPU_QUOTA}"
    limits.cpu: "$((${CPU_QUOTA%[^0-9]*} * 2))"
    requests.memory: "${MEMORY_QUOTA}"
    limits.memory: "$((${MEMORY_QUOTA%[^0-9]*} * 2))Gi"
    pods: "100"
    services: "30"
    configmaps: "100"
    secrets: "100"
    persistentvolumeclaims: "20"
EOF

# Step 3: Apply limit ranges
kubectl -n "$NAMESPACE" apply -f - <<EOF
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
spec:
  limits:
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "4"
        memory: 8Gi
      min:
        cpu: 50m
        memory: 64Mi
EOF

# Step 4: Apply network policies
kubectl -n "$NAMESPACE" apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-intra-namespace
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector: {}
  egress:
    - to:
        - podSelector: {}
EOF

# Step 5: Apply RBAC
kubectl -n "$NAMESPACE" apply -f - <<EOF
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-admin
subjects:
  - kind: Group
    name: ${TEAM}-admins
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: namespace-admin
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-developers
subjects:
  - kind: Group
    name: ${TEAM}-devs
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: namespace-developer
  apiGroup: rbac.authorization.k8s.io
EOF

echo "Namespace $NAMESPACE provisioned successfully."
echo "  Team: $TEAM"
echo "  CPU Quota: $CPU_QUOTA"
echo "  Memory Quota: $MEMORY_QUOTA"
```

## Approach 2: GitOps with Argo CD or Flux

For a more robust and auditable approach, define namespace configurations in Git and use a GitOps tool to apply them.

```text
# Repository structure
namespaces/
  base/
    kustomization.yaml
    network-policies.yaml
    limit-range.yaml
  overlays/
    team-backend/
      kustomization.yaml
      namespace.yaml
      quota.yaml
      rbac.yaml
    team-frontend/
      kustomization.yaml
      namespace.yaml
      quota.yaml
      rbac.yaml
```

The base directory contains shared configurations. Each team overlay customizes the base for their specific needs.

```yaml
# namespaces/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - network-policies.yaml
  - limit-range.yaml

# namespaces/overlays/team-backend/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: team-backend
resources:
  - ../../base
  - namespace.yaml
  - quota.yaml
  - rbac.yaml
```

```yaml
# namespaces/overlays/team-backend/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: team-backend
  labels:
    team: backend
    managed-by: gitops
    pod-security.kubernetes.io/enforce: restricted
```

```yaml
# namespaces/overlays/team-backend/quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
spec:
  hard:
    requests.cpu: "16"
    limits.cpu: "32"
    requests.memory: 32Gi
    limits.memory: 64Gi
    pods: "100"
```

With Argo CD, create an Application for each namespace:

```yaml
# argo-app-team-backend.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: namespace-team-backend
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/cluster-config
    path: namespaces/overlays/team-backend
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Approach 3: Kubernetes Operator

For the most sophisticated automation, use a namespace provisioning operator. Several options exist, or you can build your own.

The Capsule operator is one popular choice for multi-tenant namespace management:

```yaml
# capsule-tenant.yaml
apiVersion: capsule.clastix.io/v1beta2
kind: Tenant
metadata:
  name: team-backend
spec:
  owners:
    - name: backend-admins
      kind: Group
  namespaceOptions:
    quota: 5
    additionalMetadata:
      labels:
        team: backend
  resourceQuotas:
    scope: Tenant
    items:
      - hard:
          requests.cpu: "16"
          limits.cpu: "32"
          requests.memory: 32Gi
          limits.memory: 64Gi
  limitRanges:
    items:
      - limits:
          - type: Container
            default:
              cpu: 500m
              memory: 512Mi
            defaultRequest:
              cpu: 100m
              memory: 128Mi
  networkPolicies:
    items:
      - policyTypes:
          - Ingress
          - Egress
        podSelector: {}
        ingress:
          - from:
              - podSelector: {}
        egress:
          - to:
              - podSelector: {}
```

With Capsule, the tenant owner can create namespaces within their tenant, and all the policies are automatically applied.

## Approach 4: Self-Service Portal

For organizations where teams should be able to request their own namespaces, build a self-service workflow.

```yaml
# A simple self-service request via a Kubernetes CRD
apiVersion: platform.company.com/v1
kind: NamespaceRequest
metadata:
  name: new-analytics-service
spec:
  team: data-engineering
  environment: production
  resources:
    cpuQuota: "8"
    memoryQuota: "16Gi"
  owners:
    - alice@company.com
    - bob@company.com
```

A controller watches for NamespaceRequest objects and triggers the provisioning pipeline.

## Deprovisioning Namespaces

Automated provisioning should include a deprovisioning process for namespaces that are no longer needed.

```bash
#!/bin/bash
# deprovision-namespace.sh
# Usage: ./deprovision-namespace.sh <namespace>

NAMESPACE=$1

echo "Checking namespace $NAMESPACE for active workloads..."

# Check for running pods
POD_COUNT=$(kubectl -n "$NAMESPACE" get pods --no-headers 2>/dev/null | wc -l)
if [ "$POD_COUNT" -gt 0 ]; then
  echo "WARNING: Namespace has $POD_COUNT running pods."
  echo "Are you sure you want to delete? (y/n)"
  read -r confirmation
  if [ "$confirmation" != "y" ]; then
    echo "Aborted."
    exit 1
  fi
fi

# Delete the namespace (this deletes everything inside it)
kubectl delete namespace "$NAMESPACE"

echo "Namespace $NAMESPACE deleted."
```

## Validating Provisioned Namespaces

After provisioning, validate that all controls are in place.

```bash
#!/bin/bash
# validate-namespace.sh
# Usage: ./validate-namespace.sh <namespace>

NAMESPACE=$1
ERRORS=0

echo "Validating namespace: $NAMESPACE"

# Check resource quota exists
if kubectl -n "$NAMESPACE" get resourcequota compute-quota > /dev/null 2>&1; then
  echo "  [OK] Resource quota exists"
else
  echo "  [FAIL] Resource quota missing"
  ERRORS=$((ERRORS + 1))
fi

# Check limit range exists
if kubectl -n "$NAMESPACE" get limitrange default-limits > /dev/null 2>&1; then
  echo "  [OK] Limit range exists"
else
  echo "  [FAIL] Limit range missing"
  ERRORS=$((ERRORS + 1))
fi

# Check network policies exist
NP_COUNT=$(kubectl -n "$NAMESPACE" get networkpolicies --no-headers 2>/dev/null | wc -l)
if [ "$NP_COUNT" -ge 2 ]; then
  echo "  [OK] Network policies exist ($NP_COUNT policies)"
else
  echo "  [FAIL] Insufficient network policies ($NP_COUNT found, need at least 2)"
  ERRORS=$((ERRORS + 1))
fi

# Check Pod Security Standard labels
PSS=$(kubectl get namespace "$NAMESPACE" -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/enforce}')
if [ "$PSS" = "restricted" ]; then
  echo "  [OK] Pod Security Standard: restricted"
else
  echo "  [FAIL] Pod Security Standard not set correctly (got: $PSS)"
  ERRORS=$((ERRORS + 1))
fi

if [ "$ERRORS" -eq 0 ]; then
  echo "Validation passed."
else
  echo "Validation failed with $ERRORS errors."
  exit 1
fi
```

## Conclusion

Automated namespace provisioning on Talos Linux ensures that every namespace in your cluster starts with the right security controls, resource limits, and access policies. Whether you use a simple shell script, a GitOps approach with Argo CD, a Kubernetes operator like Capsule, or a self-service portal, the goal is the same: consistent, repeatable namespace creation with no manual steps that could be forgotten. Pick the approach that matches your team's maturity level and scale, start with the basics, and evolve your automation as your needs grow.
