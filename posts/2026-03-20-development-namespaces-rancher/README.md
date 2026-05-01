# How to Configure Development Namespaces in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Namespace, Developer Experience, Kubernetes, RBAC, Resource Quota

Description: Set up isolated development namespaces in Rancher for individual developers or teams with resource quotas, RBAC, and network policies.

## Introduction

Development namespaces give each developer or feature branch an isolated Kubernetes environment with its own set of deployments, services, and configuration. Proper namespace setup in Rancher includes resource quotas to prevent runaway costs, RBAC to limit blast radius, and network policies for security.

## Step 1: Create Developer Namespaces

```bash
# Create namespaces for individual developers

for dev in alice bob charlie; do
  kubectl create namespace "dev-${dev}"
  kubectl label namespace "dev-${dev}" \
    environment=development \
    developer="${dev}"
done
```

## Step 2: Apply Resource Quotas

Prevent development namespaces from consuming excessive resources:

```yaml
# dev-resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: dev-quota
  namespace: dev-alice
spec:
  hard:
    requests.cpu: "2"              # Total CPU requested by all pods
    requests.memory: 4Gi           # Total memory requested
    limits.cpu: "4"                # Total CPU limit
    limits.memory: 8Gi             # Total memory limit
    persistentvolumeclaims: "5"    # Max PVCs
    pods: "20"                     # Max pod count
    services: "10"                 # Max services
```

```bash
kubectl apply -f dev-resource-quota.yaml
```

## Step 3: Apply LimitRange Defaults

LimitRange sets default resource requests/limits for pods that don't specify them:

```yaml
# dev-limitrange.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-limits
  namespace: dev-alice
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"          # Default limit if not specified
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"          # Default request if not specified
        memory: "128Mi"
      max:
        cpu: "2"             # Maximum allowed limit
        memory: "4Gi"
```

## Step 4: Configure RBAC for Developer Access

Grant developers access only to their own namespace:

```yaml
# dev-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: alice-developer
  namespace: dev-alice
subjects:
  - kind: User
    name: alice@example.com    # Authenticated username used by the cluster
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: edit    # Kubernetes built-in edit role
  apiGroup: rbac.authorization.k8s.io
```

## Step 5: Apply Network Policy

Assuming your CNI plugin supports NetworkPolicy enforcement, restrict outbound traffic from development namespaces:

```yaml
# dev-network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dev-isolation
  namespace: dev-alice
spec:
  podSelector: {}    # Apply to all pods in namespace
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: dev-alice    # Same namespace
        - namespaceSelector:
            matchLabels:
              environment: shared-services    # Allow access to shared services
    - ports:
        - port: 53        # Allow DNS
          protocol: UDP
        - port: 53
          protocol: TCP
```

## Step 6: Automate with Rancher Projects

In Rancher UI, create a Project called "Development" and add all dev namespaces to it. Configure a project-level resource quota with both a Project Limit for the whole project and a Namespace Default Limit that Rancher propagates to namespaces in the project.

```bash
# Via kubectl - assign an existing namespace to a Rancher project
kubectl annotate namespace dev-alice \
  field.cattle.io/projectId="c-m-abc123:p-xxxxx"
```

## Conclusion

Development namespaces in Rancher balance isolation with access. Resource quotas prevent individual developers from consuming shared cluster resources, RBAC limits access to appropriate namespaces, and network policies help ensure development traffic doesn't accidentally reach production services.
