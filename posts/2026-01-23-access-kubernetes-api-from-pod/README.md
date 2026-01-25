# How to Access Kubernetes API from Inside a Pod

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, API, ServiceAccount, RBAC, Development

Description: Learn how to access the Kubernetes API from within a running pod. This guide covers service accounts, tokens, RBAC permissions, and client libraries.

---

Applications running in Kubernetes sometimes need to interact with the cluster itself. Operators, controllers, CI/CD tools, and monitoring agents all need API access from inside pods. Kubernetes makes this possible through ServiceAccounts and automatic token mounting. This guide shows you how to set it up securely.

## How API Access Works from Pods

Every pod gets a ServiceAccount (default if not specified). Kubernetes mounts the ServiceAccount's token and CA certificate into the pod, and a special DNS name resolves to the API server:

```mermaid
flowchart LR
    subgraph Pod
        A[Application]
        B[/var/run/secrets/kubernetes.io/serviceaccount]
        B --> C[token]
        B --> D[ca.crt]
        B --> E[namespace]
    end
    A -->|HTTPS| F[kubernetes.default.svc]
    F --> G[kube-apiserver]
    A -.->|reads| B
```

## Method 1: Using curl from a Pod

The simplest way to test API access:

```bash
# Start a shell in a pod
kubectl run curl-test --rm -it --image=curlimages/curl -- sh

# Inside the pod, set up variables
APISERVER=https://kubernetes.default.svc
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
CACERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt
NAMESPACE=$(cat /var/run/secrets/kubernetes.io/serviceaccount/namespace)

# Make an API call
curl --cacert $CACERT --header "Authorization: Bearer $TOKEN" \
  $APISERVER/api/v1/namespaces/$NAMESPACE/pods
```

This will likely fail with "Forbidden" because the default ServiceAccount has no permissions. Let us fix that.

## Method 2: Create a ServiceAccount with Permissions

Create a ServiceAccount and grant it specific permissions:

```yaml
# serviceaccount-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: pod-reader
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader-role
  namespace: default
rules:
# Allow reading pods in this namespace
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
# Allow reading pod logs
- apiGroups: [""]
  resources: ["pods/log"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: pod-reader-binding
  namespace: default
subjects:
- kind: ServiceAccount
  name: pod-reader
  namespace: default
roleRef:
  kind: Role
  name: pod-reader-role
  apiGroup: rbac.authorization.k8s.io
```

Apply it:

```bash
kubectl apply -f serviceaccount-rbac.yaml
```

Now create a pod using this ServiceAccount:

```yaml
# test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: api-test
spec:
  serviceAccountName: pod-reader  # Use our ServiceAccount
  containers:
  - name: test
    image: curlimages/curl
    command: ["sleep", "3600"]
```

```bash
kubectl apply -f test-pod.yaml
kubectl exec -it api-test -- sh

# Now the API call should work
APISERVER=https://kubernetes.default.svc
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
CACERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

curl --cacert $CACERT --header "Authorization: Bearer $TOKEN" \
  $APISERVER/api/v1/namespaces/default/pods | jq .items[].metadata.name
```

## Method 3: Using Python Client

The official Kubernetes Python client handles authentication automatically:

```python
# app.py
from kubernetes import client, config

def list_pods():
    """List all pods in the current namespace."""
    # Load in-cluster configuration (uses mounted ServiceAccount)
    config.load_incluster_config()

    # Create API client
    v1 = client.CoreV1Api()

    # Read namespace from mounted file
    with open('/var/run/secrets/kubernetes.io/serviceaccount/namespace') as f:
        namespace = f.read()

    # List pods
    pods = v1.list_namespaced_pod(namespace=namespace)

    for pod in pods.items:
        print(f"Pod: {pod.metadata.name}")
        print(f"  Status: {pod.status.phase}")
        print(f"  IP: {pod.status.pod_ip}")

if __name__ == "__main__":
    list_pods()
```

Dockerfile for the application:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
RUN pip install kubernetes
COPY app.py .
CMD ["python", "app.py"]
```

## Method 4: Using Go Client

For Go applications:

```go
// main.go
package main

import (
    "context"
    "fmt"
    "os"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func main() {
    // Create in-cluster config
    config, err := rest.InClusterConfig()
    if err != nil {
        panic(err.Error())
    }

    // Create clientset
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err.Error())
    }

    // Read namespace
    namespace, err := os.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/namespace")
    if err != nil {
        panic(err.Error())
    }

    // List pods
    pods, err := clientset.CoreV1().Pods(string(namespace)).List(
        context.TODO(),
        metav1.ListOptions{},
    )
    if err != nil {
        panic(err.Error())
    }

    for _, pod := range pods.Items {
        fmt.Printf("Pod: %s, Status: %s\n", pod.Name, pod.Status.Phase)
    }
}
```

## Method 5: Using kubectl from a Pod

For debugging, run kubectl inside a pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kubectl-pod
spec:
  serviceAccountName: pod-reader
  containers:
  - name: kubectl
    image: bitnami/kubectl:latest
    command: ["sleep", "3600"]
```

```bash
kubectl apply -f kubectl-pod.yaml
kubectl exec -it kubectl-pod -- kubectl get pods
```

## Common RBAC Configurations

### Read-Only Access to All Resources in Namespace

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: namespace-reader
rules:
- apiGroups: ["", "apps", "batch"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
```

### Cluster-Wide Access (ClusterRole)

For applications that need cross-namespace access:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-pod-reader
rules:
- apiGroups: [""]
  resources: ["pods", "namespaces"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cluster-pod-reader-binding
subjects:
- kind: ServiceAccount
  name: pod-reader
  namespace: default
roleRef:
  kind: ClusterRole
  name: cluster-pod-reader
  apiGroup: rbac.authorization.k8s.io
```

### Write Access for Operators

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployment-manager
rules:
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch", "delete"]
```

## Security Best Practices

### Disable Token Auto-Mounting

If a pod does not need API access:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: no-api-pod
spec:
  automountServiceAccountToken: false  # No token mounted
  containers:
  - name: app
    image: myapp:1.0
```

### Use Projected Service Account Tokens

Projected tokens are more secure (audience-bound, time-limited):

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-pod
spec:
  containers:
  - name: app
    image: myapp:1.0
    volumeMounts:
    - name: token
      mountPath: /var/run/secrets/tokens
  volumes:
  - name: token
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 3600  # Token expires in 1 hour
          audience: api  # Audience claim
```

### Principle of Least Privilege

Only grant the minimum permissions needed:

```yaml
# Bad: Too broad
rules:
- apiGroups: ["*"]
  resources: ["*"]
  verbs: ["*"]

# Good: Specific permissions
rules:
- apiGroups: [""]
  resources: ["configmaps"]
  resourceNames: ["my-config"]  # Only this specific ConfigMap
  verbs: ["get"]
```

## Troubleshooting

### Token Not Found

```bash
# Check if token is mounted
kubectl exec my-pod -- ls -la /var/run/secrets/kubernetes.io/serviceaccount/

# Verify automount is not disabled
kubectl get pod my-pod -o jsonpath='{.spec.automountServiceAccountToken}'
```

### Forbidden Errors

```bash
# Check ServiceAccount permissions
kubectl auth can-i list pods --as=system:serviceaccount:default:my-sa

# Check what the ServiceAccount can do
kubectl auth can-i --list --as=system:serviceaccount:default:my-sa
```

### Connection Refused

```bash
# Verify API server DNS resolves
kubectl exec my-pod -- nslookup kubernetes.default.svc

# Check API server is reachable
kubectl exec my-pod -- curl -k https://kubernetes.default.svc/healthz
```

## Summary

Accessing the Kubernetes API from a pod requires a ServiceAccount with appropriate RBAC permissions. Kubernetes automatically mounts the token and CA certificate. Use client libraries (Python, Go, etc.) that handle authentication automatically, or make raw HTTP calls with curl. Always follow the principle of least privilege when granting API access, and disable token auto-mounting for pods that do not need it.
