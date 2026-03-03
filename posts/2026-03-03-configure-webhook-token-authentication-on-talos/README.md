# How to Configure Webhook Token Authentication on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Webhook Authentication, Kubernetes, API Server, Security, Tokens

Description: A practical guide to setting up webhook token authentication on Talos Linux for custom authentication logic with external identity systems.

---

Webhook token authentication lets you delegate Kubernetes authentication to an external service. Instead of the API server validating tokens itself, it sends them to a webhook endpoint that you control, and that webhook decides whether the token is valid and who the user is. This is incredibly flexible because you can implement any authentication logic you need, from checking tokens against a database to validating custom JWT formats to integrating with proprietary identity systems.

## When to Use Webhook Authentication

Webhook authentication makes sense when:

- You have a custom identity system that does not speak OIDC
- You need to validate tokens against an external database
- You want to implement custom logic like IP-based restrictions alongside token validation
- You need to integrate with a legacy authentication system
- You want to bridge between different authentication protocols

If your identity provider supports OIDC, that is usually the simpler option. But when OIDC does not fit, webhooks give you full control.

## How Webhook Authentication Works

The flow is:

1. A user sends a request to the API server with a bearer token
2. The API server sends a TokenReview request to the webhook service
3. The webhook validates the token and returns the user information
4. The API server uses the returned identity for authorization (RBAC)

The TokenReview request looks like:

```json
{
  "apiVersion": "authentication.k8s.io/v1",
  "kind": "TokenReview",
  "spec": {
    "token": "the-bearer-token-from-the-request"
  }
}
```

The webhook responds with:

```json
{
  "apiVersion": "authentication.k8s.io/v1",
  "kind": "TokenReview",
  "status": {
    "authenticated": true,
    "user": {
      "username": "jane@example.com",
      "uid": "user-12345",
      "groups": ["developers", "team-frontend"],
      "extra": {
        "department": ["engineering"]
      }
    }
  }
}
```

## Step 1: Build the Webhook Service

Here is a simple webhook authenticator written in Go:

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"

    authv1 "k8s.io/api/authentication/v1"
)

// tokenDB simulates a token database
var tokenDB = map[string]authv1.UserInfo{
    "token-for-jane": {
        Username: "jane@example.com",
        UID:      "jane-001",
        Groups:   []string{"developers", "team-frontend"},
    },
    "token-for-bob": {
        Username: "bob@example.com",
        UID:      "bob-002",
        Groups:   []string{"operators", "team-platform"},
    },
}

func authenticate(w http.ResponseWriter, r *http.Request) {
    var review authv1.TokenReview

    if err := json.NewDecoder(r.Body).Decode(&review); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }

    // Look up the token
    userInfo, found := tokenDB[review.Spec.Token]

    review.Status = authv1.TokenReviewStatus{
        Authenticated: found,
    }

    if found {
        review.Status.User = userInfo
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(review)
}

func main() {
    http.HandleFunc("/authenticate", authenticate)
    log.Println("Webhook authenticator listening on :8443")
    log.Fatal(http.ListenAndServeTLS(":8443", "/etc/webhook/tls.crt", "/etc/webhook/tls.key", nil))
}
```

## Step 2: Deploy the Webhook Service

Deploy the webhook inside the cluster:

```yaml
# webhook-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: authn-webhook
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: authn-webhook
  template:
    metadata:
      labels:
        app: authn-webhook
    spec:
      containers:
      - name: webhook
        image: your-registry/authn-webhook:latest
        ports:
        - containerPort: 8443
        volumeMounts:
        - name: tls
          mountPath: /etc/webhook
          readOnly: true
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 5
        readinessProbe:
          httpGet:
            path: /healthz
            port: 8443
            scheme: HTTPS
          initialDelaySeconds: 5
      volumes:
      - name: tls
        secret:
          secretName: authn-webhook-tls
---
apiVersion: v1
kind: Service
metadata:
  name: authn-webhook
  namespace: kube-system
spec:
  selector:
    app: authn-webhook
  ports:
  - port: 443
    targetPort: 8443
    protocol: TCP
```

Generate TLS certificates for the webhook:

```bash
# Generate a CA for the webhook
openssl genrsa -out webhook-ca.key 2048
openssl req -x509 -new -key webhook-ca.key -out webhook-ca.crt -days 365 \
    -subj "/CN=authn-webhook-ca"

# Generate the webhook server certificate
openssl genrsa -out webhook-server.key 2048
openssl req -new -key webhook-server.key -out webhook-server.csr \
    -subj "/CN=authn-webhook.kube-system.svc" \
    -addext "subjectAltName=DNS:authn-webhook.kube-system.svc,DNS:authn-webhook.kube-system.svc.cluster.local"

openssl x509 -req -in webhook-server.csr -CA webhook-ca.crt -CAkey webhook-ca.key \
    -CAcreateserial -out webhook-server.crt -days 365

# Create the TLS secret
kubectl create secret tls authn-webhook-tls \
    -n kube-system \
    --cert=webhook-server.crt \
    --key=webhook-server.key
```

## Step 3: Create the Webhook Configuration File

The API server needs a kubeconfig-style file that tells it where the webhook is:

```yaml
# webhook-authn-config.yaml
apiVersion: v1
kind: Config
clusters:
- name: authn-webhook
  cluster:
    server: https://authn-webhook.kube-system.svc:443/authenticate
    certificate-authority-data: <base64-encoded-webhook-ca.crt>
users:
- name: kube-apiserver
  user: {}
current-context: authn-webhook
contexts:
- context:
    cluster: authn-webhook
    user: kube-apiserver
  name: authn-webhook
```

Encode the CA certificate:

```bash
cat webhook-ca.crt | base64 | tr -d '\n'
```

## Step 4: Configure the Talos API Server

This is the critical step. You need to make the webhook configuration file available to the API server and configure it to use webhook authentication.

```yaml
# webhook-api-server-patch.yaml
cluster:
  apiServer:
    extraArgs:
      authentication-token-webhook-config-file: "/etc/kubernetes/authn-webhook-config.yaml"
      authentication-token-webhook-cache-ttl: "5m"
      authentication-token-webhook-version: "v1"
machine:
  files:
    - content: |
        apiVersion: v1
        kind: Config
        clusters:
        - name: authn-webhook
          cluster:
            server: https://authn-webhook.kube-system.svc:443/authenticate
            certificate-authority-data: <base64-ca>
        users:
        - name: kube-apiserver
          user: {}
        current-context: authn-webhook
        contexts:
        - context:
            cluster: authn-webhook
            user: kube-apiserver
          name: authn-webhook
      permissions: 0644
      path: /etc/kubernetes/authn-webhook-config.yaml
```

Apply to control plane nodes:

```bash
talosctl patch machineconfig \
    --patch @webhook-api-server-patch.yaml \
    -n 10.0.0.1
```

## Step 5: Test the Webhook Authentication

```bash
# Use a token to authenticate
kubectl --token="token-for-jane" get pods -n default

# Or set up a kubeconfig
kubectl config set-credentials webhook-user \
    --token="token-for-jane"
kubectl config set-context webhook-context \
    --cluster=my-cluster \
    --user=webhook-user
kubectl config use-context webhook-context

kubectl get pods
```

## Caching Considerations

The `authentication-token-webhook-cache-ttl` parameter controls how long the API server caches webhook responses. There is a trade-off:

- **Short TTL (30s-1m)**: More requests to the webhook, but faster token revocation
- **Long TTL (5m-15m)**: Fewer requests, better performance, but revoked tokens remain valid longer

```yaml
cluster:
  apiServer:
    extraArgs:
      authentication-token-webhook-cache-ttl: "2m"  # Balanced default
```

## High Availability for the Webhook

Since the API server depends on the webhook for authentication, the webhook must be highly available:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: authn-webhook
  namespace: kube-system
spec:
  replicas: 3  # Multiple replicas for HA
  selector:
    matchLabels:
      app: authn-webhook
  template:
    spec:
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - authn-webhook
            topologyKey: kubernetes.io/hostname
      # ... rest of pod spec
```

Also consider what happens if the webhook is unavailable. By default, the API server will fail open (allow the request) or fail closed (deny the request) depending on the configuration.

## Handling Webhook Failures

If the webhook is down, authentication through the webhook will fail. To prevent this from locking everyone out, make sure you have at least one other authentication method configured:

```yaml
cluster:
  apiServer:
    extraArgs:
      # Webhook as primary auth
      authentication-token-webhook-config-file: "/etc/kubernetes/authn-webhook-config.yaml"
      # OIDC as backup
      oidc-issuer-url: "https://auth.example.com"
      oidc-client-id: "kubernetes"
```

With multiple auth methods configured, if the webhook is down, users can fall back to OIDC.

## Monitoring Webhook Performance

Track webhook response times and error rates:

```bash
# Check API server logs for webhook errors
talosctl logs kube-apiserver -n <control-plane-ip> | grep -i "webhook\|authenticate"

# Monitor webhook pod health
kubectl get pods -n kube-system -l app=authn-webhook
kubectl logs -n kube-system -l app=authn-webhook
```

Set up Prometheus metrics in your webhook to track:
- Request count
- Response latency
- Authentication success/failure rates
- Cache hit/miss rates (if you implement your own caching)

## Security Considerations

- Always use TLS between the API server and the webhook
- Keep the webhook configuration file secure on the control plane nodes
- Implement rate limiting in the webhook to prevent token brute-forcing
- Log all authentication attempts for audit purposes
- Rotate the webhook TLS certificates regularly

## Conclusion

Webhook token authentication on Talos Linux gives you the ultimate flexibility in how you authenticate users to your Kubernetes cluster. It requires more setup than OIDC because you need to build, deploy, and maintain the webhook service. But when your authentication requirements do not fit neatly into OIDC or client certificates, webhooks let you implement exactly the logic you need. Just make sure the webhook is highly available, properly monitored, and that you have a backup authentication method in case the webhook goes down.
