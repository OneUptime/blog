# How to Implement Bound ServiceAccount Tokens for Improved Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Authentication

Description: Implement bound ServiceAccount tokens in Kubernetes for enhanced security through time-limited, pod-bound credentials that automatically rotate.

---

Bound ServiceAccount tokens represent a major security improvement over legacy long-lived tokens. These tokens are cryptographically bound to the pod using them, have limited lifetimes, and include audience restrictions. Understanding how to implement and use bound tokens is essential for securing modern Kubernetes clusters.

## The Problem with Legacy Tokens

Before Kubernetes 1.21, ServiceAccount tokens were long-lived secrets that never expired. Once created, these tokens remained valid indefinitely unless manually deleted. This created several security risks.

If an attacker obtained a legacy token, they could use it to access your cluster forever. The token wasn't bound to any specific pod, so it could be used from anywhere. These tokens had no audience restrictions, so they worked with any service that accepted Kubernetes authentication.

Legacy tokens also accumulated over time. Each ServiceAccount automatically received a persistent token secret, creating unnecessary secrets that increased the attack surface.

## How Bound Tokens Work

Bound ServiceAccount tokens solve these problems through several mechanisms. They're bound to the pod using them through a token binding mechanism that validates the pod's identity. They expire after a configured time, typically one hour. They include audience claims that restrict where they can be used.

The kubelet manages these tokens automatically. It requests tokens from the API server when pods start, mounts them into containers, and refreshes them before expiration. This happens transparently - applications just read the token file and always get a current, valid token.

Bound tokens are JWTs with specific claims that identify the ServiceAccount, namespace, pod, and other metadata. The API server validates these claims on each request, ensuring the token is being used in the correct context.

## Enabling Bound Tokens in Your Cluster

Modern Kubernetes versions (1.21+) use bound tokens by default. Verify your cluster configuration:

```bash
# Check API server configuration
kubectl get pods -n kube-system -l component=kube-apiserver -o yaml | grep -i service-account

# Look for these flags (should be enabled):
# --service-account-issuer
# --service-account-key-file
# --service-account-signing-key-file
```

If you're running an older cluster or custom configuration, ensure these API server flags are set:

```yaml
# kube-apiserver configuration
apiVersion: v1
kind: Pod
metadata:
  name: kube-apiserver
spec:
  containers:
  - name: kube-apiserver
    command:
    - kube-apiserver
    - --service-account-issuer=https://kubernetes.default.svc
    - --service-account-signing-key-file=/etc/kubernetes/pki/sa.key
    - --service-account-key-file=/etc/kubernetes/pki/sa.pub
    - --api-audiences=https://kubernetes.default.svc,api
```

These settings configure the API server to issue and validate bound tokens.

## Using Bound Tokens in Pods

Pods automatically receive bound tokens when using the default token mounting:

```yaml
# pod-with-bound-token.yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-app
  namespace: production
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    # Token automatically mounted at /var/run/secrets/kubernetes.io/serviceaccount/token
```

The kubelet creates a bound token for this pod. You can verify it's a bound token by examining its claims:

```bash
# From within the pod
TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .

# Look for these claims indicating a bound token:
# {
#   "aud": ["https://kubernetes.default.svc"],
#   "exp": 1234567890,
#   "iat": 1234567800,
#   "iss": "https://kubernetes.default.svc",
#   "kubernetes.io": {
#     "namespace": "production",
#     "pod": {
#       "name": "secure-app",
#       "uid": "abc-123"
#     },
#     "serviceaccount": {
#       "name": "app-service-account",
#       "uid": "def-456"
#     }
#   }
# }
```

The `exp` claim shows the expiration time. The `kubernetes.io.pod` claims bind the token to this specific pod.

## Configuring Token Expiration

Control token lifetime through projected volumes:

```yaml
# custom-expiration-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: custom-token-pod
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: token
      mountPath: /var/run/secrets/tokens
      readOnly: true
  volumes:
  - name: token
    projected:
      sources:
      - serviceAccountToken:
          path: api-token
          expirationSeconds: 1800  # 30 minutes
          audience: api
```

Shorter expiration times improve security but increase the frequency of token refresh. The kubelet begins refreshing the token when 80% of its lifetime has elapsed, so a 30-minute token starts refreshing after 24 minutes.

For highly sensitive workloads, use very short token lifetimes:

```yaml
# high-security-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: high-security-pod
spec:
  serviceAccountName: sensitive-app
  containers:
  - name: app
    image: sensitive-app:latest
    volumeMounts:
    - name: token
      mountPath: /var/run/secrets/tokens
  volumes:
  - name: token
    projected:
      sources:
      - serviceAccountToken:
          path: token
          expirationSeconds: 300  # 5 minutes
```

This token expires every five minutes, significantly reducing the window for token misuse.

## Handling Token Rotation in Applications

Applications must handle token rotation gracefully. The simplest approach is to read the token file on each request:

```go
// token-rotation-aware.go
package main

import (
    "fmt"
    "io/ioutil"
    "time"

    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
    "k8s.io/client-go/transport"
)

// TokenSource reads the token file on each call
type TokenSource struct {
    tokenPath string
}

func (t *TokenSource) Token() (string, error) {
    token, err := ioutil.ReadFile(t.tokenPath)
    if err != nil {
        return "", err
    }
    return string(token), nil
}

func main() {
    config, err := rest.InClusterConfig()
    if err != nil {
        panic(err.Error())
    }

    // The default config already handles token rotation
    // It reads the token file on each request
    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err.Error())
    }

    // Use the client continuously - token rotation is automatic
    for {
        pods, err := clientset.CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{})
        if err != nil {
            fmt.Printf("Error: %v\n", err)
        } else {
            fmt.Printf("Found %d pods\n", len(pods.Items))
        }
        time.Sleep(5 * time.Minute)
    }
}
```

The Kubernetes client libraries handle token rotation automatically when using in-cluster configuration. They read the token file fresh on each request, so they always use the current token.

For custom HTTP clients, implement similar behavior:

```python
# token_rotation.py
import time
import requests

class RotatingTokenAuth:
    def __init__(self, token_path):
        self.token_path = token_path

    def __call__(self, request):
        # Read token fresh on each request
        with open(self.token_path, 'r') as f:
            token = f.read().strip()
        request.headers['Authorization'] = f'Bearer {token}'
        return request

def make_api_request():
    auth = RotatingTokenAuth('/var/run/secrets/kubernetes.io/serviceaccount/token')

    response = requests.get(
        'https://kubernetes.default.svc/api/v1/namespaces',
        auth=auth,
        verify='/var/run/secrets/kubernetes.io/serviceaccount/ca.crt'
    )

    return response.json()

# Make requests continuously
while True:
    try:
        data = make_api_request()
        print(f"API request successful: {len(data['items'])} namespaces")
    except Exception as e:
        print(f"Error: {e}")
    time.sleep(300)  # 5 minutes
```

This pattern ensures your application always uses a valid, current token.

## Migrating from Legacy Tokens

If your cluster has legacy long-lived tokens, migrate to bound tokens:

```bash
# Identify ServiceAccounts with legacy token secrets
kubectl get secrets --all-namespaces -o json | \
  jq -r '.items[] | select(.type=="kubernetes.io/service-account-token") |
  "\(.metadata.namespace)/\(.metadata.name)"'

# For each ServiceAccount, verify pods are using bound tokens
kubectl get pods -n <namespace> -o yaml | grep -A 5 serviceAccountToken

# Delete legacy token secrets after verifying bound tokens work
kubectl delete secret <token-secret-name> -n <namespace>
```

Test thoroughly before deleting legacy tokens. Ensure all applications work with bound tokens and that external integrations using legacy tokens are updated.

## Creating Short-Lived Tokens for External Use

For external access, create bound tokens with kubectl:

```bash
# Create a short-lived bound token
TOKEN=$(kubectl create token app-service-account -n production --duration=1h)

# Use the token for API access
curl -H "Authorization: Bearer $TOKEN" \
     --cacert ca.crt \
     https://kubernetes-api-server:6443/api/v1/namespaces
```

These tokens are bound to the ServiceAccount but not to a specific pod. They expire after the specified duration and cannot be renewed. This is perfect for temporary access or CI/CD pipelines.

## Validating Bound Token Properties

Verify that tokens have the expected properties:

```bash
#!/bin/bash
# validate-token.sh

TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

# Decode the payload
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2 | base64 -d)

# Check expiration
EXP=$(echo $PAYLOAD | jq -r '.exp')
NOW=$(date +%s)
TTL=$((EXP - NOW))

echo "Token expires in $TTL seconds"

# Check audience
AUD=$(echo $PAYLOAD | jq -r '.aud[]')
echo "Token audience: $AUD"

# Check pod binding
POD=$(echo $PAYLOAD | jq -r '.["kubernetes.io"].pod.name')
echo "Token bound to pod: $POD"
```

Run this script periodically to monitor token properties and ensure they meet your security requirements.

## Conclusion

Bound ServiceAccount tokens are a critical security improvement in Kubernetes. They provide time-limited, pod-bound credentials that automatically rotate, significantly reducing the risk of token compromise. By using projected volumes to configure token properties and ensuring your applications handle token rotation properly, you implement strong authentication that follows security best practices. Modern Kubernetes makes this easy - bound tokens are the default, and client libraries handle rotation automatically.
