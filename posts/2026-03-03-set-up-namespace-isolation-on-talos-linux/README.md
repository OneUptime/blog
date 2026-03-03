# How to Set Up Namespace Isolation on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Namespace Isolation, Security, Multi-Tenancy

Description: A practical guide to implementing namespace isolation on Talos Linux clusters using network policies, RBAC, and resource controls.

---

Kubernetes namespaces provide a logical boundary for organizing workloads, but by default they offer almost no isolation. A pod in one namespace can freely communicate with pods in any other namespace, access cluster-wide resources, and potentially interfere with workloads it has no business touching. On a Talos Linux cluster where you run workloads for multiple teams or applications, proper namespace isolation is essential for security and stability.

This post walks through how to set up meaningful namespace isolation on Talos Linux, covering network policies, RBAC restrictions, resource quotas, and other controls that turn namespaces from organizational labels into actual security boundaries.

## Why Default Namespaces Are Not Isolated

Out of the box, Kubernetes namespaces only separate resources for naming purposes. You can have a Service named "api" in both the "team-a" and "team-b" namespaces without conflict. But that is where the separation ends.

By default, any pod can send traffic to any other pod in the cluster, regardless of namespace. Any user with cluster-level permissions can see and modify resources in any namespace. There are no limits on how much CPU or memory a namespace can consume. This is fine for single-team clusters but becomes a problem as soon as you share a Talos cluster between multiple teams or environments.

## Step 1: Network Isolation with Network Policies

The first and most important isolation mechanism is network policies. These control which pods can communicate with which other pods.

Start by deploying a CNI that supports network policies. On Talos Linux, Cilium is a popular choice.

```bash
# Install Cilium with network policy support
helm install cilium cilium/cilium \
  --namespace kube-system \
  --set policyEnforcementMode=default
```

### Default Deny Policy

The foundation of network isolation is a default deny policy in each namespace. This blocks all ingress and egress traffic unless explicitly allowed.

```yaml
# default-deny.yaml
# Apply this to every namespace that needs isolation
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

```bash
# Apply to multiple namespaces
for ns in team-a team-b team-c; do
  kubectl -n $ns apply -f default-deny.yaml
done
```

### Allow Intra-Namespace Traffic

After applying the default deny, pods within the same namespace cannot communicate with each other either. Add a policy to allow traffic within the namespace.

```yaml
# allow-same-namespace.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow traffic from pods in the same namespace
    - from:
        - podSelector: {}
  egress:
    # Allow traffic to pods in the same namespace
    - to:
        - podSelector: {}
    # Allow DNS resolution (required for service discovery)
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

### Allow Specific Cross-Namespace Traffic

Sometimes namespaces need to communicate with each other. Define explicit policies for allowed cross-namespace traffic.

```yaml
# allow-from-ingress.yaml
# Allow traffic from the ingress namespace to team-a
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-ingress
  namespace: team-a
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: ingress-nginx
```

## Step 2: RBAC Isolation

Network policies control pod communication. RBAC controls what human users and service accounts can do.

### Create Namespace-Scoped Roles

Define roles that limit access to a single namespace.

```yaml
# team-a-role.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-admin
  namespace: team-a
rules:
  # Full access to common resources within the namespace
  - apiGroups: ["", "apps", "batch"]
    resources: ["pods", "deployments", "services", "configmaps",
                "secrets", "jobs", "cronjobs", "replicasets",
                "statefulsets", "persistentvolumeclaims"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  # Read-only access to events
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "watch"]
  # Allow exec into pods for debugging
  - apiGroups: [""]
    resources: ["pods/exec", "pods/log", "pods/portforward"]
    verbs: ["get", "create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: team-a-admin
  namespace: team-a
subjects:
  - kind: Group
    name: team-a-developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: namespace-admin
  apiGroup: rbac.authorization.k8s.io
```

```bash
kubectl apply -f team-a-role.yaml
```

### Restrict Cluster-Level Access

Make sure users who should only have namespace-level access do not have any cluster-level roles.

```bash
# Check for overly broad ClusterRoleBindings
kubectl get clusterrolebindings -o custom-columns=\
NAME:.metadata.name,\
ROLE:.roleRef.name,\
SUBJECTS:.subjects[*].name

# Remove any unnecessary cluster-admin bindings
# kubectl delete clusterrolebinding unnecessary-binding
```

## Step 3: Resource Quotas

Without resource quotas, a single namespace can consume all cluster resources, starving other namespaces. Apply quotas to limit resource consumption per namespace.

```yaml
# resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
  namespace: team-a
spec:
  hard:
    # CPU limits
    requests.cpu: "8"
    limits.cpu: "16"
    # Memory limits
    requests.memory: 16Gi
    limits.memory: 32Gi
    # Object count limits
    pods: "50"
    services: "20"
    configmaps: "50"
    secrets: "50"
    persistentvolumeclaims: "10"
```

```bash
kubectl apply -f resource-quota.yaml
```

## Step 4: Limit Ranges

Resource quotas control the total for a namespace. Limit ranges control the defaults and limits for individual pods and containers.

```yaml
# limit-range.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: team-a
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
    - type: Pod
      max:
        cpu: "8"
        memory: 16Gi
```

## Step 5: Pod Security Standards

Use Kubernetes Pod Security Standards to prevent pods from running with elevated privileges.

```yaml
# Label the namespace with the appropriate Pod Security Standard
apiVersion: v1
kind: Namespace
metadata:
  name: team-a
  labels:
    # Enforce restricted Pod Security Standard
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    # Warn on baseline violations
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
```

```bash
# Apply the Pod Security Standard labels
kubectl label namespace team-a \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=latest
```

## Automation Script

Here is a script that sets up all isolation controls for a new namespace.

```bash
#!/bin/bash
# setup-isolated-namespace.sh
# Usage: ./setup-isolated-namespace.sh <namespace-name> <team-group>

NAMESPACE=$1
TEAM_GROUP=$2

if [ -z "$NAMESPACE" ] || [ -z "$TEAM_GROUP" ]; then
  echo "Usage: $0 <namespace> <team-group>"
  exit 1
fi

# Create the namespace with Pod Security Standards
kubectl create namespace "$NAMESPACE"
kubectl label namespace "$NAMESPACE" \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest \
  name="$NAMESPACE"

# Apply default deny network policy
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
EOF

# Apply allow same-namespace policy
kubectl -n "$NAMESPACE" apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-same-namespace
spec:
  podSelector: {}
  ingress:
    - from:
        - podSelector: {}
  egress:
    - to:
        - podSelector: {}
    - to:
        - namespaceSelector: {}
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
EOF

# Apply resource quota
kubectl -n "$NAMESPACE" apply -f - <<EOF
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
spec:
  hard:
    requests.cpu: "8"
    limits.cpu: "16"
    requests.memory: 16Gi
    limits.memory: 32Gi
    pods: "50"
EOF

echo "Namespace $NAMESPACE created with full isolation controls."
```

## Conclusion

Namespace isolation on Talos Linux requires a multi-layered approach. Network policies control communication between pods, RBAC restricts what users can access, resource quotas prevent resource hogging, limit ranges enforce per-pod limits, and pod security standards prevent privilege escalation. None of these work well on their own, but together they create meaningful isolation that turns namespaces into real security boundaries. Use the automation script to apply these controls consistently as you create new namespaces, and regularly audit existing namespaces to make sure the policies are still in place.
