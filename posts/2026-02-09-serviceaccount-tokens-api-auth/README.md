# How to Use ServiceAccount Tokens for Kubernetes API Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Authentication, API

Description: Master Kubernetes API authentication using ServiceAccount tokens including token retrieval, API requests, and security best practices for programmatic cluster access.

---

ServiceAccount tokens are the primary method for authenticating pods and applications with the Kubernetes API server. Understanding how to properly use these tokens enables secure programmatic access to cluster resources while maintaining strong authentication practices.

## How ServiceAccount Token Authentication Works

When a pod needs to communicate with the Kubernetes API, it uses a ServiceAccount token for authentication. The token is a JSON Web Token (JWT) that contains claims about the ServiceAccount identity, including the namespace, account name, and other metadata.

The Kubernetes API server validates the token by verifying its signature against the cluster's signing keys. If the signature is valid and the token hasn't expired, the API server accepts the authentication and proceeds to authorization checks based on RBAC rules.

Modern Kubernetes clusters use bound tokens by default. These tokens are bound to specific pods and have limited lifetimes, typically one hour. The kubelet automatically rotates these tokens before they expire, providing seamless authentication without manual intervention.

## Retrieving ServiceAccount Tokens

The most common way to access a ServiceAccount token is from within a pod. Kubernetes automatically mounts the token at a well-known location:

```bash
# From within a container
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
echo $TOKEN
```

For external access or troubleshooting, you can retrieve tokens using kubectl:

```bash
# Create a short-lived token (Kubernetes 1.24+)
kubectl create token app-service-account -n production

# Create a token with custom duration (2 hours)
kubectl create token app-service-account -n production --duration=2h

# Create a token with specific audience
kubectl create token app-service-account -n production --audience=https://example.com
```

The kubectl create token command generates bound tokens that are more secure than legacy long-lived tokens. These tokens are scoped to the ServiceAccount and respect RBAC rules.

## Making API Requests with ServiceAccount Tokens

Once you have a token, use it to authenticate API requests. Here's a basic example using curl:

```bash
#!/bin/bash
# api-request.sh

# Get the token
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

# Get the API server address
APISERVER=https://kubernetes.default.svc

# Get the CA certificate
CACERT=/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Make an API request to list pods
curl --cacert $CACERT \
     --header "Authorization: Bearer $TOKEN" \
     -X GET $APISERVER/api/v1/namespaces/default/pods
```

This script demonstrates the three key components needed for API authentication: the token for identity, the CA certificate to verify the server's identity, and the API server address.

## Using Tokens in Different Programming Languages

Here's how to use ServiceAccount tokens in a Go application:

```go
// main.go
package main

import (
    "context"
    "fmt"
    "io/ioutil"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func main() {
    // Create in-cluster config that automatically uses the ServiceAccount token
    config, err := rest.InClusterConfig()
    if err != nil {
        panic(err.Error())
    }

    // Create the clientset
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err.Error())
    }

    // List pods in the default namespace
    pods, err := clientset.CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{})
    if err != nil {
        panic(err.Error())
    }

    fmt.Printf("There are %d pods in the cluster\n", len(pods.Items))
}
```

The in-cluster configuration automatically handles token reading and API server discovery. This is the recommended approach for applications running in Kubernetes.

For Python applications, use the official Kubernetes client:

```python
# app.py
from kubernetes import client, config

def list_pods():
    # Load in-cluster configuration
    config.load_incluster_config()

    # Create API client
    v1 = client.CoreV1Api()

    # List pods
    pods = v1.list_namespaced_pod(namespace="default")

    for pod in pods.items:
        print(f"Pod: {pod.metadata.name}")

if __name__ == "__main__":
    list_pods()
```

Both examples automatically read the ServiceAccount token from the default location and handle authentication transparently.

## Token Validation and Introspection

You can validate and inspect ServiceAccount tokens to understand their properties:

```bash
# Decode the token (Note: this doesn't validate the signature)
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .

# Use the TokenReview API to validate the token
kubectl create -f - <<EOF
apiVersion: authentication.k8s.io/v1
kind: TokenReview
metadata:
  name: test-token-review
spec:
  token: "$TOKEN"
EOF
```

Token introspection reveals claims like the ServiceAccount name, namespace, issued-at time, and expiration. This information helps with debugging authentication issues.

## Handling Token Expiration

Bound tokens expire after their configured lifetime. Applications must handle token refresh:

```go
// token-refresh.go
package main

import (
    "context"
    "fmt"
    "time"

    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func createClientWithTokenRefresh() (*kubernetes.Clientset, error) {
    config, err := rest.InClusterConfig()
    if err != nil {
        return nil, err
    }

    // The client automatically handles token refresh
    // when using in-cluster config
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        return nil, err
    }

    return clientset, nil
}

func main() {
    clientset, err := createClientWithTokenRefresh()
    if err != nil {
        panic(err.Error())
    }

    // Use the client continuously - tokens refresh automatically
    for {
        _, err := clientset.CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{})
        if err != nil {
            fmt.Printf("Error: %v\n", err)
        } else {
            fmt.Println("API call successful")
        }
        time.Sleep(10 * time.Minute)
    }
}
```

The Kubernetes client libraries handle token refresh automatically when you use in-cluster configuration. The kubelet updates the token file before expiration, and the client reads the new token on subsequent requests.

## External API Access with ServiceAccount Tokens

For accessing the API from outside the cluster, you need to extract the token and configure kubectl or API clients:

```bash
#!/bin/bash
# setup-external-access.sh

# Create a ServiceAccount
kubectl create serviceaccount external-access -n default

# Create necessary RBAC bindings (example: read-only)
kubectl create rolebinding external-access-binding \
  --clusterrole=view \
  --serviceaccount=default:external-access \
  -n default

# Create a token
TOKEN=$(kubectl create token external-access -n default --duration=24h)

# Get cluster info
APISERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
CLUSTER_NAME=$(kubectl config view --minify -o jsonpath='{.clusters[0].name}')

# Configure kubectl to use the token
kubectl config set-credentials external-access --token=$TOKEN
kubectl config set-context external-access-context \
  --cluster=$CLUSTER_NAME \
  --user=external-access \
  --namespace=default
kubectl config use-context external-access-context

# Test access
kubectl get pods
```

This approach creates a time-limited token for external access. Remember to rotate these tokens regularly and limit their permissions using RBAC.

## Security Best Practices

Always use bound tokens instead of long-lived token secrets. Bound tokens are more secure because they expire and are tied to specific pods. Set appropriate token lifetimes based on your security requirements - shorter is better.

Never log or expose tokens in plain text. Treat ServiceAccount tokens like passwords. If a token is compromised, delete the ServiceAccount or rotate its keys immediately.

Use audience-scoped tokens when possible. This restricts where tokens can be used, preventing token replay attacks against unintended services.

Always validate API server certificates using the CA certificate mounted in pods. This prevents man-in-the-middle attacks.

## Conclusion

ServiceAccount tokens are the foundation of Kubernetes API authentication. By understanding how to retrieve, use, and manage these tokens properly, you enable secure programmatic access to your cluster. Use the Kubernetes client libraries when possible - they handle token refresh and security details automatically. For external access, create short-lived tokens with minimal permissions following the principle of least privilege.
