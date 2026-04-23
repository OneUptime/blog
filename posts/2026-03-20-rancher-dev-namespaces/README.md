# How to Configure Development Namespaces in Rancher - Dev

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Namespace, Development, Multi-Tenancy

Description: Configure dedicated development namespaces in Rancher with resource quotas, network policies, RBAC, and developer self-service capabilities.

## Introduction

Well-configured development namespaces in Rancher enable team isolation, resource governance, and self-service capabilities for developers. This guide covers creating namespaces with appropriate resource limits, RBAC permissions, network policies, and Rancher project assignments for development teams.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Cluster admin or project owner access in Rancher
- kubectl access to the cluster
- A CNI plugin that enforces Kubernetes NetworkPolicy rules

## Step 1: Create Development Namespace via Rancher UI

```bash
# Or create via kubectl

kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: dev-team-alpha
  annotations:
    field.cattle.io/projectId: c-m-abcde:p-vwxyz
  labels:
    env: development
    team: alpha
    managed-by: rancher
EOF
```

## Step 2: Configure Resource Quotas

```yaml
# dev-namespace-quota.yaml - Resource limits for development namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: dev-team-alpha
spec:
  hard:
    # Pod limits
    pods: "20"
    # Compute resources
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    # Storage
    persistentvolumeclaims: "10"
    requests.storage: 100Gi
    # Services
    services: "10"
    services.loadbalancers: "2"
    # Config/Secrets
    configmaps: "20"
    secrets: "20"
```

## Step 3: Set LimitRange Defaults

```yaml
# dev-limitrange.yaml - Default resource limits for containers
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-limits
  namespace: dev-team-alpha
spec:
  limits:
    # Container defaults
    - type: Container
      default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "4"
        memory: 4Gi
      min:
        cpu: 50m
        memory: 64Mi
    # Pod limits
    - type: Pod
      max:
        cpu: "8"
        memory: 8Gi
    # PVC size limits
    - type: PersistentVolumeClaim
      max:
        storage: 20Gi
      min:
        storage: 1Gi
```

## Step 4: Configure RBAC for Developers

```yaml
# dev-rbac.yaml - Developer access to their namespace
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer
  namespace: dev-team-alpha
rules:
  # Full access to common resources
  - apiGroups: ["", "apps", "batch"]
    resources:
      - pods
      - pods/log
      - pods/exec
      - pods/portforward
      - deployments
      - replicasets
      - statefulsets
      - daemonsets
      - jobs
      - cronjobs
      - services
      - configmaps
      - persistentvolumeclaims
    verbs: ["*"]
  # Read-only secrets
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list"]
  # Ingress management
  - apiGroups: ["networking.k8s.io"]
    resources: ["ingresses"]
    verbs: ["*"]
  # HPA management
  - apiGroups: ["autoscaling"]
    resources: ["horizontalpodautoscalers"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-alpha-developers
  namespace: dev-team-alpha
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: developer
subjects:
  - kind: Group
    name: team-alpha
    apiGroup: rbac.authorization.k8s.io
```

## Step 5: Configure Network Policies

```yaml
# dev-network-policy.yaml - Isolate development namespaces
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dev-isolation
  namespace: dev-team-alpha
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow traffic within the namespace
    - from:
        - podSelector: {}
    # Allow from monitoring namespace
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: cattle-monitoring-system
  egress:
    # Allow all egress (internet access for dev)
    - {}
```

## Step 6: Set Up Developer Self-Service with Namespace Templates

```yaml
# namespace-template.yaml - Template for new dev namespaces
# Apply this with kustomize or a custom controller

# Kustomization file
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: NAMESPACE_NAME

resources:
  - namespace.yaml
  - resourcequota.yaml
  - limitrange.yaml
  - networkpolicy.yaml
  - rolebinding.yaml
  - registry-secret.yaml

# Override the Namespace object name
patches:
  - patch: |-
      - op: replace
        path: /metadata/name
        value: NAMESPACE_NAME
    target:
      kind: Namespace
```

## Step 7: Configure Rancher Project Membership

```bash
# Grant Rancher project member access
# Replace the namespace in the URL with the project's backing namespace.
curl -X POST \
  -H "Authorization: Bearer ${RANCHER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "apiVersion": "management.cattle.io/v3",
    "kind": "ProjectRoleTemplateBinding",
    "metadata": {
      "generateName": "prtb-"
    },
    "projectName": "c-m-abcde:p-vwxyz",
    "roleTemplateName": "project-member",
    "groupPrincipalName": "keycloak_group://team-alpha"
  }' \
  "https://rancher.example.com/apis/management.cattle.io/v3/namespaces/c-m-abcde-p-vwxyz/projectroletemplatebindings"
```

## Step 8: Copy Registry Secrets

```bash
# Copy registry pull secrets to new namespace
kubectl get secret dev-registry-secret \
  -n default \
  -o yaml | \
  sed 's/namespace: default/namespace: dev-team-alpha/' | \
  kubectl apply -f -

# Patch default ServiceAccount to use the secret
kubectl patch serviceaccount default \
  -n dev-team-alpha \
  -p '{"imagePullSecrets": [{"name": "dev-registry-secret"}]}'
```

## Conclusion

Well-configured development namespaces in Rancher provide isolated, resource-bounded environments for development teams. By combining resource quotas, LimitRanges, RBAC, and network policies, you create a self-contained development environment that prevents resource starvation between teams while enabling developers to work autonomously. Rancher's project concept provides an additional layer for organizing namespaces and managing team access through a familiar UI.
