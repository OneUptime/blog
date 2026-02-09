# How to Debug Kubernetes Service Account Token Mount Failures After Cluster Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Troubleshooting

Description: Learn how to diagnose and fix service account token mount failures that occur after Kubernetes cluster upgrades, including BoundServiceAccountTokenVolume changes.

---

Kubernetes cluster upgrades bring new features and security improvements, but they can also break existing workloads. Service account token mount failures are particularly common after upgrades that change token projection behavior or enable stricter security policies.

## Service Account Token Changes Over Time

Kubernetes has evolved its service account token handling significantly. Early versions used long-lived tokens stored as secrets, but recent versions use projected volumes with short-lived tokens that automatically rotate.

The BoundServiceAccountTokenVolume feature became stable in Kubernetes 1.21 and is now enabled by default. This feature projects service account tokens into pods using the TokenRequest API instead of static secrets. These tokens have bounded lifetimes and are audience-bound for improved security.

## Symptoms of Token Mount Failures

When service account tokens fail to mount, pods start but containers can't authenticate to the API server. Applications using the Kubernetes client libraries fail with authentication errors.

```bash
# Common error messages in application logs
Error from server (Forbidden): pods is forbidden:
User "system:serviceaccount:default:my-sa" cannot list resource "pods"

unable to load in-cluster configuration:
token file /var/run/secrets/kubernetes.io/serviceaccount/token does not exist
```

The pod appears healthy, but any operation requiring Kubernetes API access fails immediately.

## Checking Service Account Configuration

Start by verifying that the service account exists and is properly configured.

```bash
# List service accounts in namespace
kubectl get serviceaccount -n production

# Describe the service account
kubectl describe serviceaccount my-app-sa -n production

# Check if the service account has associated secrets
kubectl get secrets -n production | grep my-app-sa

# View pod specification to see service account usage
kubectl get pod my-app-pod -n production -o yaml | grep -A 5 serviceAccount
```

Modern Kubernetes no longer creates automatic token secrets for service accounts. If your application expects a secret to exist, this might cause issues.

## Understanding Token Projection

After upgrades, check how tokens are projected into pods. Modern clusters use projected volumes instead of secret volumes.

```bash
# Examine token volume mounts in a running pod
kubectl describe pod my-app-pod -n production | grep -A 10 Mounts

# Check the actual token file
kubectl exec my-app-pod -n production -- ls -la /var/run/secrets/kubernetes.io/serviceaccount/

# View token contents (non-sensitive metadata)
kubectl exec my-app-pod -n production -- cat /var/run/secrets/kubernetes.io/serviceaccount/token | \
  cut -d '.' -f 2 | base64 -d | jq .
```

The token should show an expiration time (exp claim) and audience (aud claim). If these fields are missing or incorrect, token projection isn't working properly.

## Example: Legacy Token Secret Configuration

Older applications might depend on service account token secrets that no longer get created automatically.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: legacy-app-sa
  namespace: production
---
apiVersion: v1
kind: Pod
metadata:
  name: legacy-app
  namespace: production
spec:
  serviceAccountName: legacy-app-sa
  containers:
  - name: app
    image: legacy-app:1.0
    env:
    # Application tries to read token from secret
    - name: KUBE_TOKEN
      valueFrom:
        secretKeyRef:
          name: legacy-app-sa-token-xxxxx
          key: token
```

This fails after upgrade because the secret doesn't exist. Fix it by switching to projected tokens.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: legacy-app-fixed
  namespace: production
spec:
  serviceAccountName: legacy-app-sa
  containers:
  - name: app
    image: legacy-app:1.0
    env:
    # Read token from mounted path
    - name: KUBE_TOKEN_PATH
      value: /var/run/secrets/kubernetes.io/serviceaccount/token
    volumeMounts:
    - name: kube-api-access
      mountPath: /var/run/secrets/kubernetes.io/serviceaccount
      readOnly: true
  volumes:
  - name: kube-api-access
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 3600
      - configMap:
          name: kube-root-ca.crt
          items:
          - key: ca.crt
            path: ca.crt
      - downwardAPI:
          items:
          - path: namespace
            fieldRef:
              fieldPath: metadata.namespace
```

Modern Kubernetes automatically injects this projected volume, but explicitly defining it ensures compatibility.

## Manually Creating Token Secrets

If you need a long-lived token secret for legacy applications, create it manually. This approach is discouraged but sometimes necessary during migrations.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: legacy-app-sa-token
  namespace: production
  annotations:
    kubernetes.io/service-account.name: legacy-app-sa
type: kubernetes.io/service-account-token
```

Kubernetes automatically populates this secret with a token. The token doesn't rotate and lacks the security benefits of projected tokens.

```bash
# Verify secret was populated
kubectl get secret legacy-app-sa-token -n production -o jsonpath='{.data.token}' | base64 -d

# Check token validity
kubectl exec test-pod -- curl -k https://kubernetes.default.svc/api/v1/namespaces/default \
  --header "Authorization: Bearer $(kubectl get secret legacy-app-sa-token -n production -o jsonpath='{.data.token}' | base64 -d)"
```

## Token Audience Issues

BoundServiceAccountTokenVolume tokens are audience-bound. The default audience is the API server, but custom audiences can cause authentication failures.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-audience-pod
  namespace: production
spec:
  serviceAccountName: my-app-sa
  containers:
  - name: app
    image: my-app:2.0
    volumeMounts:
    - name: custom-token
      mountPath: /var/run/secrets/custom
      readOnly: true
  volumes:
  - name: custom-token
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 7200
          audience: "https://custom-api.example.com"
```

This token won't work for authenticating to the Kubernetes API server because its audience is set to a custom value. If your app needs to call both the API server and a custom service, mount two separate tokens.

```yaml
volumes:
- name: kube-api-token
  projected:
    sources:
    - serviceAccountToken:
        path: token
        expirationSeconds: 3600
        audience: "kubernetes.default.svc"
- name: custom-api-token
  projected:
    sources:
    - serviceAccountToken:
        path: token
        expirationSeconds: 3600
        audience: "https://custom-api.example.com"
```

## Debugging Token Request API Issues

The TokenRequest API must be functional for projected tokens to work. Check if the API is available.

```bash
# Test TokenRequest API directly
kubectl create token my-app-sa -n production --duration=600s

# If this fails, check API server configuration
kubectl get --raw /apis/authentication.k8s.io/v1
```

If the TokenRequest API isn't available, your cluster might have feature gates incorrectly configured. Check the API server configuration.

```bash
# Check API server pod (if using kubeadm)
kubectl get pod -n kube-system kube-apiserver-* -o yaml | grep feature-gates

# Check API server logs for errors
kubectl logs -n kube-system kube-apiserver-* --tail=100 | grep -i token
```

## AutomountServiceAccountToken Setting

Pods inherit the `automountServiceAccountToken` setting from their service account. If this is set to false, tokens won't mount automatically.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: no-token-sa
  namespace: production
automountServiceAccountToken: false  # Prevents automatic token mounting
---
apiVersion: v1
kind: Pod
metadata:
  name: no-token-pod
  namespace: production
spec:
  serviceAccountName: no-token-sa
  # This pod won't have a token mounted
  containers:
  - name: app
    image: my-app:1.0
```

Override this at the pod level if needed.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: force-token-pod
  namespace: production
spec:
  serviceAccountName: no-token-sa
  automountServiceAccountToken: true  # Override service account setting
  containers:
  - name: app
    image: my-app:1.0
```

## RBAC Permission Issues

Even with a valid token, RBAC policies might prevent the service account from accessing resources.

```bash
# Test if service account can list pods
kubectl auth can-i list pods --as=system:serviceaccount:production:my-app-sa -n production

# View all permissions for service account
kubectl get rolebinding,clusterrolebinding -A -o json | \
  jq -r '.items[] | select(.subjects[]?.name=="my-app-sa") | {name:.metadata.name, namespace:.metadata.namespace, role:.roleRef.name}'
```

Create appropriate RBAC rules for your service account.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: my-app-role
  namespace: production
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: my-app-binding
  namespace: production
subjects:
- kind: ServiceAccount
  name: my-app-sa
  namespace: production
roleRef:
  kind: Role
  name: my-app-role
  apiGroup: rbac.authorization.k8s.io
```

## Client Library Compatibility

Older Kubernetes client libraries might not handle projected tokens correctly. Ensure your application uses a recent client library version.

```go
// Example: Go client with proper token handling
package main

import (
    "context"
    "fmt"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/tools/clientcmd"
)

func main() {
    // InClusterConfig handles projected tokens correctly
    config, err := rest.InClusterConfig()
    if err != nil {
        panic(err.Error())
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err.Error())
    }

    // Token automatically refreshes when it expires
    pods, err := clientset.CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        panic(err.Error())
    }

    fmt.Printf("Found %d pods\n", len(pods.Items))
}
```

Client libraries handle token refresh automatically when using the in-cluster configuration.

## Token Expiration Handling

Projected tokens expire and must be refreshed. Applications that read the token once at startup will fail when it expires.

```python
# Bad: Reading token once
with open('/var/run/secrets/kubernetes.io/serviceaccount/token') as f:
    token = f.read()
    # Token expires after expiration time

# Good: Reading token for each request
def get_current_token():
    with open('/var/run/secrets/kubernetes.io/serviceaccount/token') as f:
        return f.read()

# Token file is updated by kubelet when it rotates
```

Always read the token from the file for each API request, or use a client library that handles this automatically.

## Best Practices

Use projected service account tokens instead of long-lived token secrets. Set appropriate expiration times based on your application's needs, typically 1-2 hours.

Configure your applications to read tokens from the mounted path on each request. Never cache tokens in memory for extended periods.

Test upgrades in a staging environment first. Verify that all applications can authenticate successfully before upgrading production clusters.

Document which applications use service account tokens and how they're configured. This helps during troubleshooting and future upgrades.

## Conclusion

Service account token mount failures after cluster upgrades typically result from changes in token projection behavior. Understanding the shift from static secrets to projected volumes helps you diagnose and fix these issues. Update your applications to use modern token handling patterns, test thoroughly after upgrades, and monitor for authentication failures. With proper configuration, projected tokens provide improved security without breaking your workloads.
