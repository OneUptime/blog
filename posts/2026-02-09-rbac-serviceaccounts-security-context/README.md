# How to Implement RBAC for ServiceAccounts with Pod-Level Security Context Constraints

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, RBAC, Security

Description: Implement RBAC for ServiceAccounts combined with Pod Security Context constraints to enforce both API access control and runtime security policies.

---

ServiceAccount RBAC controls what APIs pods can access, while security contexts control how pods run. Combining both creates defense in depth where you limit both API permissions and runtime capabilities. This prevents compromised pods from escalating privileges or accessing resources they shouldn't.

## Understanding the Security Layers

RBAC governs API access through roles assigned to service accounts. Security contexts control runtime behavior like running as specific users, dropping capabilities, and making filesystems read-only. Together they enforce the principle of least privilege at both the API and process levels.

A pod with minimal RBAC and restricted security context has limited blast radius if compromised. Even if an attacker gains code execution, they cannot call dangerous APIs or escalate privileges.

## Creating Restricted ServiceAccount with Security Context

Define a service account with minimal RBAC and enforce security constraints.

```yaml
# sa-restricted.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: restricted-app
  namespace: production
automountServiceAccountToken: true
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: restricted-app-role
  namespace: production
rules:
# Only read own config
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["app-config"]
  verbs: ["get"]

# Only read own secrets
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["app-credentials"]
  verbs: ["get"]

# Create events for logging
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: restricted-app-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: restricted-app-role
subjects:
- kind: ServiceAccount
  name: restricted-app
  namespace: production
```

Use this service account in a pod with security constraints.

```yaml
# pod-restricted.yaml
apiVersion: v1
kind: Pod
metadata:
  name: restricted-app
  namespace: production
spec:
  serviceAccountName: restricted-app

  # Pod-level security context
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 3000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault

  containers:
  - name: app
    image: myapp:1.0.0

    # Container-level security context
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - ALL
      runAsNonRoot: true
      runAsUser: 1000

    # Mount read-only volumes
    volumeMounts:
    - name: config
      mountPath: /etc/config
      readOnly: true
    - name: secrets
      mountPath: /etc/secrets
      readOnly: true
    - name: tmp
      mountPath: /tmp

  volumes:
  - name: config
    configMap:
      name: app-config
  - name: secrets
    secret:
      secretName: app-credentials
  - name: tmp
    emptyDir: {}
```

## Implementing ServiceAccount for Read-Only Workloads

Create a service account for applications that only read cluster state.

```yaml
# sa-readonly.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: readonly-observer
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: readonly-observer-role
rules:
# Read pods across cluster
- apiGroups: [""]
  resources: ["pods", "pods/status"]
  verbs: ["get", "list", "watch"]

# Read deployments
- apiGroups: ["apps"]
  resources: ["deployments", "replicasets", "daemonsets"]
  verbs: ["get", "list", "watch"]

# Read services
- apiGroups: [""]
  resources: ["services", "endpoints"]
  verbs: ["get", "list", "watch"]

# Read metrics
- apiGroups: ["metrics.k8s.io"]
  resources: ["pods", "nodes"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: readonly-observer-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: readonly-observer-role
subjects:
- kind: ServiceAccount
  name: readonly-observer
  namespace: monitoring
```

Deploy with strict security context.

```yaml
# deployment-readonly.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-observer
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: observer
  template:
    metadata:
      labels:
        app: observer
    spec:
      serviceAccountName: readonly-observer

      securityContext:
        runAsNonRoot: true
        runAsUser: 65534  # nobody user
        fsGroup: 65534
        seccompProfile:
          type: RuntimeDefault

      containers:
      - name: observer
        image: observer:1.0.0
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
          runAsNonRoot: true

        resources:
          limits:
            cpu: 100m
            memory: 128Mi
          requests:
            cpu: 50m
            memory: 64Mi

        volumeMounts:
        - name: tmp
          mountPath: /tmp

      volumes:
      - name: tmp
        emptyDir: {}
```

## Creating Job Runner ServiceAccount

Build a service account for running batch jobs with controlled permissions.

```yaml
# sa-job-runner.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: job-runner
  namespace: production
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: job-runner-role
  namespace: production
rules:
# Can create and manage jobs
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["get", "list", "create", "delete"]

# Can read pods created by jobs
- apiGroups: [""]
  resources: ["pods", "pods/status"]
  verbs: ["get", "list"]

# Can read pod logs
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]

# Can read config and secrets
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get"]

# Cannot exec into pods
# Cannot modify pods directly
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: job-runner-binding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: job-runner-role
subjects:
- kind: ServiceAccount
  name: job-runner
  namespace: production
```

## Implementing Pod Security Standards

Use Pod Security Standards with RBAC for comprehensive controls.

```yaml
# namespace-security.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: secure-apps
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: secure-app
  namespace: secure-apps
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secure-app-role
  namespace: secure-apps
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["app-config"]
  verbs: ["get", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: secure-app-binding
  namespace: secure-apps
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: secure-app-role
subjects:
- kind: ServiceAccount
  name: secure-app
  namespace: secure-apps
```

Any pod using this service account must comply with the restricted security standard.

```yaml
# deployment-secure.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: secure-apps
spec:
  selector:
    matchLabels:
      app: secure
  template:
    metadata:
      labels:
        app: secure
    spec:
      serviceAccountName: secure-app

      # Required by restricted standard
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault

      containers:
      - name: app
        image: app:1.0.0

        # Required by restricted standard
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
          runAsNonRoot: true

        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 128Mi
```

## Creating Operator ServiceAccount

Operators need broader permissions but should still run with security constraints.

```yaml
# sa-operator.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-operator
  namespace: operators
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: myapp-operator-role
rules:
# Manage custom resources
- apiGroups: ["myapp.example.com"]
  resources: ["myapps", "myapps/status"]
  verbs: ["*"]

# Manage deployments
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Manage services
- apiGroups: [""]
  resources: ["services", "configmaps"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]

# Read secrets
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "watch"]

# Create events
- apiGroups: [""]
  resources: ["events"]
  verbs: ["create", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: myapp-operator-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: myapp-operator-role
subjects:
- kind: ServiceAccount
  name: myapp-operator
  namespace: operators
```

Run operator with security constraints despite elevated API access.

```yaml
# deployment-operator.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-operator
  namespace: operators
spec:
  replicas: 1
  selector:
    matchLabels:
      app: operator
  template:
    metadata:
      labels:
        app: operator
    spec:
      serviceAccountName: myapp-operator

      # Operator still runs with security constraints
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault

      containers:
      - name: operator
        image: myapp-operator:1.0.0

        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL

        volumeMounts:
        - name: tmp
          mountPath: /tmp

      volumes:
      - name: tmp
        emptyDir: {}
```

## Auditing ServiceAccount Security

Check service accounts for proper security configuration.

```bash
# Find service accounts with automountServiceAccountToken=true
kubectl get serviceaccounts --all-namespaces -o json | \
  jq -r '.items[] | select(.automountServiceAccountToken!=false) |
    "\(.metadata.namespace)/\(.metadata.name)"'

# Find pods running as root
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.securityContext.runAsUser==0 or
    .spec.containers[].securityContext.runAsUser==0) |
    "\(.metadata.namespace)/\(.metadata.name)"'

# Find pods with privilege escalation allowed
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.spec.containers[].securityContext.allowPrivilegeEscalation==true) |
    "\(.metadata.namespace)/\(.metadata.name)"'
```

## Testing Combined Security

Verify both RBAC and security contexts work together.

```bash
# Create test pod
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: security-test
  namespace: production
spec:
  serviceAccountName: restricted-app
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
  containers:
  - name: test
    image: busybox
    command: ['sleep', '3600']
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
EOF

# Test API access
kubectl exec -it security-test -n production -- sh
# Try to list pods (should fail)
wget -O- --header "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  https://kubernetes.default.svc/api/v1/namespaces/production/pods

# Try to escalate (should fail)
su -

# Try to write to root filesystem (should fail)
echo "test" > /test.txt
```

Combining RBAC with security context constraints creates defense in depth for Kubernetes workloads. Grant minimal API permissions through service accounts while enforcing runtime security through security contexts. Run containers as non-root, drop all capabilities, use read-only filesystems, and prevent privilege escalation to limit blast radius when applications are compromised.
