# How to Use ServiceAccount Token Request API for Short-Lived Tokens

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, API

Description: Master the Kubernetes TokenRequest API to programmatically create short-lived ServiceAccount tokens with custom audiences and expiration times for secure credential management.

---

The TokenRequest API provides programmatic access to create ServiceAccount tokens on demand. This enables applications and automation systems to generate short-lived, audience-scoped tokens without relying on long-lived token secrets, significantly improving security.

## Understanding the TokenRequest API

The TokenRequest API is a Kubernetes resource that creates bound ServiceAccount tokens. Unlike legacy token secrets that live indefinitely, TokenRequest generates tokens with specific properties: they expire after a set duration, they're bound to specific audiences, and they can include pod information for additional security.

This API is what the kubelet uses internally to provision tokens for pods. By using it directly, you gain the same security benefits in CI/CD pipelines, operator controllers, and external integrations.

The API accepts several parameters. You specify the ServiceAccount, the desired expiration time, the token audience, and optionally pod binding information. The API server validates your request, generates a signed token, and returns it. The token is valid until expiration and follows RBAC rules for the ServiceAccount.

## Using kubectl to Request Tokens

The simplest way to use the TokenRequest API is through kubectl:

```bash
# Create a 1-hour token for a ServiceAccount
kubectl create token app-service-account -n production

# Create a token with custom duration
kubectl create token app-service-account -n production --duration=2h

# Create a token with specific audience
kubectl create token app-service-account -n production --audience=https://example.com

# Create a token bound to a specific pod
kubectl create token app-service-account -n production --bound-object-kind=Pod --bound-object-name=my-pod
```

These commands return the raw JWT token. Use them in scripts or save them for external system access:

```bash
# Save token to file
kubectl create token cicd-deployer -n cicd --duration=24h > /tmp/k8s-token

# Use in API requests
TOKEN=$(kubectl create token app-sa -n production)
curl -H "Authorization: Bearer $TOKEN" \
     --cacert ca.crt \
     https://kubernetes-api:6443/api/v1/namespaces
```

## Using the TokenRequest API Programmatically

Access the API directly in Go applications:

```go
// token-request.go
package main

import (
    "context"
    "fmt"
    "time"

    authv1 "k8s.io/api/authentication/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func requestToken(clientset *kubernetes.Clientset, namespace, serviceAccount string) (string, error) {
    ctx := context.Background()

    // Create TokenRequest
    expirationSeconds := int64(3600) // 1 hour
    tokenRequest := &authv1.TokenRequest{
        Spec: authv1.TokenRequestSpec{
            Audiences:         []string{"api"},
            ExpirationSeconds: &expirationSeconds,
        },
    }

    // Request the token
    resp, err := clientset.CoreV1().ServiceAccounts(namespace).CreateToken(
        ctx,
        serviceAccount,
        tokenRequest,
        metav1.CreateOptions{},
    )
    if err != nil {
        return "", fmt.Errorf("failed to request token: %v", err)
    }

    return resp.Status.Token, nil
}

func main() {
    // Create in-cluster config
    config, err := rest.InClusterConfig()
    if err != nil {
        panic(err.Error())
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err.Error())
    }

    // Request a token
    token, err := requestToken(clientset, "production", "app-service-account")
    if err != nil {
        panic(err.Error())
    }

    fmt.Printf("Token received (length: %d)\n", len(token))
    fmt.Printf("Token expires at: %s\n", time.Now().Add(1*time.Hour).Format(time.RFC3339))

    // Use the token for API requests
    // ...
}
```

This creates tokens dynamically as needed.

## Python Implementation

For Python applications:

```python
# token_request.py
from kubernetes import client, config
from datetime import datetime, timedelta

def request_token(namespace, service_account, expiration_seconds=3600, audience="api"):
    """Request a ServiceAccount token using the TokenRequest API"""

    # Load Kubernetes configuration
    config.load_incluster_config()

    v1 = client.CoreV1Api()

    # Create TokenRequest
    token_request = client.V1TokenRequest(
        spec=client.V1TokenRequestSpec(
            audiences=[audience],
            expiration_seconds=expiration_seconds
        )
    )

    # Request the token
    response = v1.create_namespaced_service_account_token(
        name=service_account,
        namespace=namespace,
        body=token_request
    )

    return response.status.token

def main():
    # Request a 2-hour token
    token = request_token(
        namespace="production",
        service_account="app-service-account",
        expiration_seconds=7200,
        audience="api"
    )

    print(f"Token received (length: {len(token)})")
    expiration = datetime.now() + timedelta(hours=2)
    print(f"Token expires at: {expiration.isoformat()}")

    # Use the token
    # ...

if __name__ == "__main__":
    main()
```

## Creating Tokens with Multiple Audiences

Some scenarios require tokens valid for multiple services:

```go
// multi-audience-token.go
func requestMultiAudienceToken(clientset *kubernetes.Clientset) (string, error) {
    ctx := context.Background()
    expirationSeconds := int64(3600)

    tokenRequest := &authv1.TokenRequest{
        Spec: authv1.TokenRequestSpec{
            Audiences: []string{
                "api",
                "vault",
                "https://example.com",
            },
            ExpirationSeconds: &expirationSeconds,
        },
    }

    resp, err := clientset.CoreV1().ServiceAccounts("production").CreateToken(
        ctx,
        "multi-service-account",
        tokenRequest,
        metav1.CreateOptions{},
    )
    if err != nil {
        return "", err
    }

    return resp.Status.Token, nil
}
```

Services validate the audience claim and accept tokens listing them in the audience array.

## Pod-Bound Tokens for Enhanced Security

Create tokens bound to specific pods:

```go
// pod-bound-token.go
func requestPodBoundToken(clientset *kubernetes.Clientset, podName string) (string, error) {
    ctx := context.Background()
    expirationSeconds := int64(3600)

    tokenRequest := &authv1.TokenRequest{
        Spec: authv1.TokenRequestSpec{
            Audiences:         []string{"api"},
            ExpirationSeconds: &expirationSeconds,
            BoundObjectRef: &authv1.BoundObjectReference{
                Kind:       "Pod",
                APIVersion: "v1",
                Name:       podName,
                UID:        "", // Filled by API server
            },
        },
    }

    resp, err := clientset.CoreV1().ServiceAccounts("production").CreateToken(
        ctx,
        "app-service-account",
        tokenRequest,
        metav1.CreateOptions{},
    )
    if err != nil {
        return "", err
    }

    return resp.Status.Token, nil
}
```

These tokens are only valid while the referenced pod exists, providing automatic invalidation.

## Token Caching Strategy

Cache tokens to avoid excessive API calls:

```go
// token-cache.go
package main

import (
    "context"
    "sync"
    "time"

    authv1 "k8s.io/api/authentication/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

type TokenCache struct {
    clientset         *kubernetes.Clientset
    namespace         string
    serviceAccount    string
    cachedToken       string
    expirationTime    time.Time
    refreshThreshold  time.Duration
    mutex             sync.RWMutex
}

func NewTokenCache(clientset *kubernetes.Clientset, namespace, serviceAccount string) *TokenCache {
    return &TokenCache{
        clientset:        clientset,
        namespace:        namespace,
        serviceAccount:   serviceAccount,
        refreshThreshold: 5 * time.Minute, // Refresh 5 minutes before expiry
    }
}

func (tc *TokenCache) GetToken() (string, error) {
    tc.mutex.RLock()
    if tc.cachedToken != "" && time.Until(tc.expirationTime) > tc.refreshThreshold {
        token := tc.cachedToken
        tc.mutex.RUnlock()
        return token, nil
    }
    tc.mutex.RUnlock()

    // Need to refresh
    return tc.refreshToken()
}

func (tc *TokenCache) refreshToken() (string, error) {
    tc.mutex.Lock()
    defer tc.mutex.Unlock()

    // Double-check after acquiring lock
    if tc.cachedToken != "" && time.Until(tc.expirationTime) > tc.refreshThreshold {
        return tc.cachedToken, nil
    }

    ctx := context.Background()
    expirationSeconds := int64(3600) // 1 hour

    tokenRequest := &authv1.TokenRequest{
        Spec: authv1.TokenRequestSpec{
            Audiences:         []string{"api"},
            ExpirationSeconds: &expirationSeconds,
        },
    }

    resp, err := tc.clientset.CoreV1().ServiceAccounts(tc.namespace).CreateToken(
        ctx,
        tc.serviceAccount,
        tokenRequest,
        metav1.CreateOptions{},
    )
    if err != nil {
        return "", err
    }

    tc.cachedToken = resp.Status.Token
    tc.expirationTime = resp.Status.ExpirationTimestamp.Time

    return tc.cachedToken, nil
}

func main() {
    config, _ := rest.InClusterConfig()
    clientset, _ := kubernetes.NewForConfig(config)

    cache := NewTokenCache(clientset, "production", "app-service-account")

    // Use the cache
    for i := 0; i < 100; i++ {
        token, err := cache.GetToken()
        if err != nil {
            panic(err)
        }
        fmt.Printf("Request %d: Got token (length: %d)\n", i, len(token))
        time.Sleep(30 * time.Second)
    }
}
```

This caches tokens and refreshes them automatically before expiration.

## Using TokenRequest in Operators

Operators often need to create tokens for workloads they manage:

```go
// operator-token-creation.go
package main

import (
    "context"
    "fmt"

    corev1 "k8s.io/api/core/v1"
    authv1 "k8s.io/api/authentication/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

func createWorkloadToken(clientset *kubernetes.Clientset, pod *corev1.Pod) (string, error) {
    ctx := context.Background()
    expirationSeconds := int64(3600)

    tokenRequest := &authv1.TokenRequest{
        Spec: authv1.TokenRequestSpec{
            Audiences:         []string{"workload"},
            ExpirationSeconds: &expirationSeconds,
            BoundObjectRef: &authv1.BoundObjectReference{
                Kind:       "Pod",
                APIVersion: "v1",
                Name:       pod.Name,
                UID:        string(pod.UID),
            },
        },
    }

    resp, err := clientset.CoreV1().ServiceAccounts(pod.Namespace).CreateToken(
        ctx,
        pod.Spec.ServiceAccountName,
        tokenRequest,
        metav1.CreateOptions{},
    )
    if err != nil {
        return "", fmt.Errorf("failed to create token: %v", err)
    }

    return resp.Status.Token, nil
}
```

This creates pod-bound tokens for custom workload injection.

## CI/CD Integration

Use TokenRequest for CI/CD pipeline authentication:

```bash
#!/bin/bash
# ci-deploy.sh

NAMESPACE="production"
SERVICE_ACCOUNT="cicd-deployer"
DURATION="1h"

# Request a token
echo "Requesting deployment token..."
TOKEN=$(kubectl create token $SERVICE_ACCOUNT -n $NAMESPACE --duration=$DURATION)

# Configure kubectl to use the token
kubectl config set-credentials cicd-user --token=$TOKEN

kubectl config set-context cicd-context \
    --cluster=$(kubectl config view -o jsonpath='{.clusters[0].name}') \
    --user=cicd-user \
    --namespace=$NAMESPACE

kubectl config use-context cicd-context

# Perform deployment
echo "Deploying application..."
kubectl apply -f deployment.yaml

# Verify deployment
kubectl rollout status deployment/my-app

echo "Deployment complete"
```

The token expires after one hour, limiting the window for misuse.

## RBAC for TokenRequest

Control who can request tokens with RBAC:

```yaml
# token-request-rbac.yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: token-requester
  namespace: production
rules:
# Allow creating tokens
- apiGroups: [""]
  resources: ["serviceaccounts/token"]
  verbs: ["create"]
  resourceNames: ["app-service-account"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: operator-token-requester
  namespace: production
subjects:
- kind: ServiceAccount
  name: operator-sa
  namespace: operator-system
roleRef:
  kind: Role
  name: token-requester
  apiGroup: rbac.authorization.k8s.io
```

This allows the operator to request tokens for specific ServiceAccounts only.

## Monitoring Token Requests

Track token request activity:

```bash
# Enable audit logging for TokenRequest
cat >> audit-policy.yaml <<EOF
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
- level: Metadata
  resources:
  - group: ""
    resources: ["serviceaccounts/token"]
  verbs: ["create"]
EOF

# Query audit logs
kubectl logs -n kube-system -l component=kube-apiserver | \
  grep "serviceaccounts/token"
```

Monitor for unusual token request patterns that might indicate compromised credentials.

## Best Practices

Request tokens with the shortest acceptable lifetime. Use audience restrictions to limit where tokens can be used. Cache tokens to reduce API load, but refresh before expiration. Use pod-bound tokens when possible for automatic invalidation. Grant minimal RBAC permissions for token creation.

Prefer TokenRequest over long-lived token secrets for all external access. The security benefits far outweigh the additional complexity.

## Conclusion

The TokenRequest API provides a secure, flexible way to create ServiceAccount tokens programmatically. By generating short-lived, audience-scoped tokens on demand, you eliminate the need for long-lived credentials while maintaining secure access to your cluster. Use the API in operators, CI/CD pipelines, and any external system that needs Kubernetes access. Combined with proper RBAC controls and monitoring, TokenRequest enables secure, scalable credential management for modern Kubernetes deployments.
