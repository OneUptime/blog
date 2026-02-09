# How to Use automountServiceAccountToken to Disable Unnecessary Token Mounts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Service Accounts

Description: Learn how to disable automatic service account token mounting in Kubernetes pods to improve security by reducing the attack surface and following the principle of least privilege.

---

Every Kubernetes pod runs with a service account, and by default, the service account token is automatically mounted into the pod at `/var/run/secrets/kubernetes.io/serviceaccount/token`. While this enables pods to interact with the Kubernetes API, most pods don't actually need this access. Mounting unnecessary tokens increases your security risk because a compromised container could use the token to query or manipulate cluster resources.

The `automountServiceAccountToken` field gives you fine-grained control over whether service account tokens are mounted into your pods, helping you follow the principle of least privilege.

## Understanding the Default Behavior

When you create a pod without specifying a service account, Kubernetes uses the default service account in the namespace:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example-pod
spec:
  containers:
  - name: nginx
    image: nginx:1.25
```

If you exec into this pod, you'll find:

```bash
kubectl exec -it example-pod -- ls -la /var/run/secrets/kubernetes.io/serviceaccount/
# Output shows:
# ca.crt
# namespace
# token
```

The token file contains a JWT that can be used to authenticate with the Kubernetes API server. You can verify this:

```bash
kubectl exec -it example-pod -- cat /var/run/secrets/kubernetes.io/serviceaccount/token
# Shows a long JWT token
```

This token has whatever permissions the service account has been granted through RBAC roles.

## Disabling Token Mounting at Pod Level

To prevent the token from being mounted in a specific pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  automountServiceAccountToken: false
  containers:
  - name: nginx
    image: nginx:1.25
    ports:
    - containerPort: 80
```

Now the service account directory won't exist:

```bash
kubectl exec -it secure-pod -- ls -la /var/run/secrets/kubernetes.io/serviceaccount/
# Output: No such file or directory
```

This is appropriate for pods that only serve HTTP traffic, run batch jobs, or perform other tasks that don't require Kubernetes API access.

## Disabling Token Mounting at ServiceAccount Level

You can also disable automatic mounting at the service account level:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: restricted-sa
  namespace: production
automountServiceAccountToken: false
---
apiVersion: v1
kind: Pod
metadata:
  name: app-pod
  namespace: production
spec:
  serviceAccountName: restricted-sa
  containers:
  - name: app
    image: myapp:1.0
```

This ensures that any pod using this service account won't have the token mounted unless explicitly overridden.

## Override Hierarchy

The pod-level setting takes precedence over the service account setting:

```yaml
# Service account has automount disabled
apiVersion: v1
kind: ServiceAccount
metadata:
  name: no-mount-sa
automountServiceAccountToken: false
---
# But this pod explicitly enables it
apiVersion: v1
kind: Pod
metadata:
  name: override-pod
spec:
  serviceAccountName: no-mount-sa
  automountServiceAccountToken: true  # Overrides service account setting
  containers:
  - name: kubectl-tool
    image: bitnami/kubectl:1.28
    command: ["kubectl", "get", "pods"]
```

This gives you flexibility to disable mounting by default but enable it for specific pods that need API access.

## Practical Example: Web Application

Here's a realistic deployment of a web application that doesn't need API access:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: webapp-sa
  namespace: production
automountServiceAccountToken: false
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      serviceAccountName: webapp-sa
      # Token won't be mounted (inherited from service account)
      containers:
      - name: app
        image: webapp:2.0
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: webapp-service
  namespace: production
spec:
  selector:
    app: webapp
  ports:
  - port: 80
    targetPort: 8080
  type: LoadBalancer
```

This deployment serves web traffic and doesn't need to interact with the Kubernetes API, so disabling token mounting reduces the attack surface.

## When You DO Need the Token

Some pods legitimately need API access. For example, a controller or operator:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: backup-controller-sa
  namespace: backup-system
# Keep automount enabled (default)
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: backup-reader
  namespace: backup-system
rules:
- apiGroups: [""]
  resources: ["persistentvolumeclaims", "persistentvolumes"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: backup-reader-binding
  namespace: backup-system
subjects:
- kind: ServiceAccount
  name: backup-controller-sa
  namespace: backup-system
roleRef:
  kind: Role
  name: backup-reader
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: v1
kind: Pod
metadata:
  name: backup-controller
  namespace: backup-system
spec:
  serviceAccountName: backup-controller-sa
  # Token IS mounted (service account default)
  containers:
  - name: controller
    image: backup-controller:1.0
    env:
    - name: KUBERNETES_SERVICE_HOST
      value: kubernetes.default.svc
    - name: KUBERNETES_SERVICE_PORT
      value: "443"
```

This controller needs to list PVCs and pods, so it requires the token. The RBAC rules limit what it can do with the token.

## Security Best Practices

Here's a complete security-focused example:

```yaml
# Service account with minimal permissions
apiVersion: v1
kind: ServiceAccount
metadata:
  name: minimal-sa
  namespace: apps
automountServiceAccountToken: false
---
# Deployment using the secure service account
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: apps
spec:
  replicas: 2
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      serviceAccountName: minimal-sa
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
        seccompProfile:
          type: RuntimeDefault
      containers:
      - name: app
        image: secure-app:1.0
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

This deployment layers multiple security controls:
- No service account token mounted
- Runs as non-root user
- Read-only root filesystem
- Drops all capabilities
- Uses seccomp profile

## Auditing Your Cluster

Find all pods with mounted service account tokens:

```bash
# Check which pods have tokens mounted
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] |
    select(.spec.automountServiceAccountToken != false) |
    "\(.metadata.namespace)/\(.metadata.name)"'
```

Check service accounts that still automount tokens:

```bash
kubectl get serviceaccounts --all-namespaces -o json | \
  jq -r '.items[] |
    select(.automountServiceAccountToken != false) |
    "\(.metadata.namespace)/\(.metadata.name)"'
```

Create a policy check script:

```python
#!/usr/bin/env python3
from kubernetes import client, config
import sys

config.load_kube_config()
v1 = client.CoreV1Api()

def audit_token_mounts():
    """Find pods that might not need token mounts."""
    issues = []

    pods = v1.list_pod_for_all_namespaces(watch=False)

    for pod in pods.items:
        # Skip if explicitly disabled
        if pod.spec.automount_service_account_token == False:
            continue

        # Check if pod actually uses the API
        namespace = pod.metadata.namespace
        name = pod.metadata.name

        # Heuristic: web apps usually don't need tokens
        if any(c.name in ['nginx', 'httpd', 'webapp']
               for c in pod.spec.containers):
            issues.append(f"{namespace}/{name}: "
                         f"Web app with mounted token")

    return issues

if __name__ == "__main__":
    problems = audit_token_mounts()

    if problems:
        print("Pods that should disable automountServiceAccountToken:")
        for problem in problems:
            print(f"  - {problem}")
        sys.exit(1)
    else:
        print("No issues found")
        sys.exit(0)
```

## Migration Strategy

When disabling tokens in existing deployments, use a phased approach:

1. Identify pods that don't use the API by checking logs for API calls
2. Test in development environment first
3. Update service account to disable automount
4. Monitor for errors indicating API access attempts
5. Roll out to production gradually

```bash
# Check if a pod is making API calls
kubectl logs -n production webapp-7b8c9d | grep -i "kubernetes\|api-server"

# If no API calls found, it's safe to disable
kubectl patch serviceaccount webapp-sa -n production \
  -p '{"automountServiceAccountToken": false}'

# Restart deployment to apply changes
kubectl rollout restart deployment/webapp -n production

# Monitor for issues
kubectl logs -n production -l app=webapp --follow
```

## Common Pitfalls

Don't disable the token for pods that use client libraries. Many applications use the Kubernetes client to watch config changes or manage resources.

Remember that some sidecars need API access. If you're using Istio, Linkerd, or other service meshes, check if they require the token.

Test thoroughly before production. Some third-party applications expect the token to be present even if they don't use it.

Document your decision. Add annotations explaining why a pod has tokens disabled:

```yaml
metadata:
  annotations:
    security.company.com/no-api-access: "Web app does not need Kubernetes API"
```

Disabling unnecessary service account token mounts is a simple but effective security measure. By following the principle of least privilege and only granting API access to pods that need it, you significantly reduce the potential impact of a container compromise.
