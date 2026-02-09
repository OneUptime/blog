# How to Implement ServiceAccount Token Review for Webhook Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Authentication, Webhooks

Description: Implement ServiceAccount token review using the TokenReview API to validate and authenticate webhook requests with Kubernetes identities for secure service integration.

---

The TokenReview API enables services to validate ServiceAccount tokens and extract identity information, making it essential for webhook authentication. By implementing token review, you create secure webhooks that authenticate requests using Kubernetes ServiceAccount tokens instead of static credentials.

## Understanding TokenReview API

The TokenReview API validates ServiceAccount tokens and returns authentication information. You send a token to the API, and it responds with whether the token is valid, which ServiceAccount it represents, and what permissions it has. This enables external services to trust Kubernetes identities without direct access to the cluster's signing keys.

This is particularly useful for webhooks. Admission webhooks, mutating webhooks, and custom API endpoints can validate that requests come from legitimate Kubernetes ServiceAccounts. This creates a unified authentication system where Kubernetes identities extend beyond the cluster boundary.

The API accepts a token and optional audience information. It validates the token's signature, checks expiration, verifies audience claims, and returns structured authentication data. This data includes the username (ServiceAccount identity), groups, and extra information.

## Basic TokenReview Implementation

Start with a simple token validation:

```go
// token-review.go
package main

import (
    "context"
    "fmt"

    authv1 "k8s.io/api/authentication/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func validateToken(clientset *kubernetes.Clientset, token string) (*authv1.TokenReview, error) {
    ctx := context.Background()

    // Create TokenReview request
    review := &authv1.TokenReview{
        Spec: authv1.TokenReviewSpec{
            Token: token,
        },
    }

    // Submit for validation
    result, err := clientset.AuthenticationV1().TokenReviews().Create(
        ctx,
        review,
        metav1.CreateOptions{},
    )
    if err != nil {
        return nil, fmt.Errorf("token review failed: %v", err)
    }

    return result, nil
}

func main() {
    config, err := rest.InClusterConfig()
    if err != nil {
        panic(err.Error())
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err.Error())
    }

    // Example token (in practice, extract from Authorization header)
    token := "eyJhbGc..."

    result, err := validateToken(clientset, token)
    if err != nil {
        panic(err.Error())
    }

    if result.Status.Authenticated {
        fmt.Printf("Token is valid\n")
        fmt.Printf("User: %s\n", result.Status.User.Username)
        fmt.Printf("Groups: %v\n", result.Status.User.Groups)
    } else {
        fmt.Printf("Token is invalid\n")
        if result.Status.Error != "" {
            fmt.Printf("Error: %s\n", result.Status.Error)
        }
    }
}
```

This validates a token and extracts identity information.

## Webhook Server with Token Authentication

Build a webhook server that authenticates using ServiceAccount tokens:

```go
// webhook-server.go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "strings"

    authv1 "k8s.io/api/authentication/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

type WebhookServer struct {
    clientset *kubernetes.Clientset
}

func (s *WebhookServer) authenticateRequest(r *http.Request) (*authv1.UserInfo, error) {
    // Extract Bearer token from Authorization header
    authHeader := r.Header.Get("Authorization")
    if authHeader == "" {
        return nil, fmt.Errorf("missing Authorization header")
    }

    parts := strings.SplitN(authHeader, " ", 2)
    if len(parts) != 2 || parts[0] != "Bearer" {
        return nil, fmt.Errorf("invalid Authorization header format")
    }

    token := parts[1]

    // Validate token using TokenReview
    review := &authv1.TokenReview{
        Spec: authv1.TokenReviewSpec{
            Token: token,
            Audiences: []string{"webhook-service"},
        },
    }

    result, err := s.clientset.AuthenticationV1().TokenReviews().Create(
        r.Context(),
        review,
        metav1.CreateOptions{},
    )
    if err != nil {
        return nil, fmt.Errorf("token review failed: %v", err)
    }

    if !result.Status.Authenticated {
        return nil, fmt.Errorf("authentication failed: %s", result.Status.Error)
    }

    return &result.Status.User, nil
}

func (s *WebhookServer) handleWebhook(w http.ResponseWriter, r *http.Request) {
    // Authenticate the request
    user, err := s.authenticateRequest(r)
    if err != nil {
        http.Error(w, fmt.Sprintf("Authentication failed: %v", err), http.StatusUnauthorized)
        return
    }

    fmt.Printf("Authenticated request from: %s\n", user.Username)

    // Check if user has required group membership
    hasRequiredGroup := false
    for _, group := range user.Groups {
        if group == "system:serviceaccounts:production" {
            hasRequiredGroup = true
            break
        }
    }

    if !hasRequiredGroup {
        http.Error(w, "Access denied: insufficient permissions", http.StatusForbidden)
        return
    }

    // Process the webhook
    response := map[string]interface{}{
        "status": "success",
        "user":   user.Username,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func main() {
    config, err := rest.InClusterConfig()
    if err != nil {
        panic(err.Error())
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err.Error())
    }

    server := &WebhookServer{clientset: clientset}

    http.HandleFunc("/webhook", server.handleWebhook)

    fmt.Println("Webhook server starting on :8443")
    if err := http.ListenAndServeTLS(":8443", "/certs/tls.crt", "/certs/tls.key", nil); err != nil {
        panic(err.Error())
    }
}
```

This webhook validates incoming requests using ServiceAccount tokens.

## Python Webhook Implementation

For Python-based webhooks:

```python
# webhook_server.py
from flask import Flask, request, jsonify
from kubernetes import client, config
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

# Load Kubernetes config
config.load_incluster_config()
v1_auth = client.AuthenticationV1Api()

def authenticate_request():
    """Extract and validate ServiceAccount token from request"""
    auth_header = request.headers.get('Authorization', '')

    if not auth_header.startswith('Bearer '):
        return None, "Missing or invalid Authorization header"

    token = auth_header[7:]  # Remove 'Bearer ' prefix

    try:
        # Create TokenReview
        token_review = client.V1TokenReview(
            spec=client.V1TokenReviewSpec(
                token=token,
                audiences=["webhook-service"]
            )
        )

        # Validate token
        result = v1_auth.create_token_review(body=token_review)

        if not result.status.authenticated:
            return None, result.status.error or "Authentication failed"

        return result.status.user, None

    except Exception as e:
        return None, f"Token validation error: {str(e)}"

@app.route('/webhook', methods=['POST'])
def webhook():
    # Authenticate the request
    user, error = authenticate_request()
    if error:
        return jsonify({"error": error}), 401

    logging.info(f"Authenticated request from: {user.username}")

    # Check namespace membership
    if not any(g.startswith('system:serviceaccounts:production') for g in user.groups):
        return jsonify({"error": "Access denied"}), 403

    # Process webhook
    data = request.json
    logging.info(f"Processing webhook data: {data}")

    response = {
        "status": "success",
        "user": user.username,
        "processed": True
    }

    return jsonify(response)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8443, ssl_context=('/certs/tls.crt', '/certs/tls.key'))
```

## Validating Tokens with Specific Audiences

Validate that tokens have the expected audience:

```go
// audience-validation.go
func validateTokenWithAudience(clientset *kubernetes.Clientset, token, expectedAudience string) error {
    review := &authv1.TokenReview{
        Spec: authv1.TokenReviewSpec{
            Token:     token,
            Audiences: []string{expectedAudience},
        },
    }

    result, err := clientset.AuthenticationV1().TokenReviews().Create(
        context.TODO(),
        review,
        metav1.CreateOptions{},
    )
    if err != nil {
        return fmt.Errorf("token review failed: %v", err)
    }

    if !result.Status.Authenticated {
        return fmt.Errorf("authentication failed")
    }

    // Verify audience
    audienceMatched := false
    for _, aud := range result.Status.Audiences {
        if aud == expectedAudience {
            audienceMatched = true
            break
        }
    }

    if !audienceMatched {
        return fmt.Errorf("token audience mismatch")
    }

    return nil
}
```

This ensures tokens are intended for your service.

## Implementing Permission Checks

After authentication, verify permissions:

```go
// permission-check.go
package main

import (
    "context"
    "fmt"

    authv1 "k8s.io/api/authorization/v1"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
)

func checkPermissions(clientset *kubernetes.Clientset, username, namespace, resource, verb string) (bool, error) {
    sar := &authv1.SubjectAccessReview{
        Spec: authv1.SubjectAccessReviewSpec{
            User: username,
            ResourceAttributes: &authv1.ResourceAttributes{
                Namespace: namespace,
                Verb:      verb,
                Resource:  resource,
            },
        },
    }

    result, err := clientset.AuthorizationV1().SubjectAccessReviews().Create(
        context.TODO(),
        sar,
        metav1.CreateOptions{},
    )
    if err != nil {
        return false, err
    }

    return result.Status.Allowed, nil
}

func handleAuthenticatedRequest(clientset *kubernetes.Clientset, user *authv1.UserInfo) error {
    // Check if user can create pods
    allowed, err := checkPermissions(
        clientset,
        user.Username,
        "production",
        "pods",
        "create",
    )
    if err != nil {
        return fmt.Errorf("permission check failed: %v", err)
    }

    if !allowed {
        return fmt.Errorf("user lacks required permissions")
    }

    fmt.Printf("User %s has permission to create pods\n", user.Username)
    return nil
}
```

Combine authentication with authorization for complete security.

## Caching Token Validation Results

Improve performance with caching:

```go
// token-cache.go
package main

import (
    "sync"
    "time"

    authv1 "k8s.io/api/authentication/v1"
)

type TokenCache struct {
    cache map[string]*CachedResult
    mutex sync.RWMutex
    ttl   time.Duration
}

type CachedResult struct {
    User      *authv1.UserInfo
    ExpiresAt time.Time
}

func NewTokenCache(ttl time.Duration) *TokenCache {
    return &TokenCache{
        cache: make(map[string]*CachedResult),
        ttl:   ttl,
    }
}

func (tc *TokenCache) Get(token string) (*authv1.UserInfo, bool) {
    tc.mutex.RLock()
    defer tc.mutex.RUnlock()

    result, exists := tc.cache[token]
    if !exists {
        return nil, false
    }

    if time.Now().After(result.ExpiresAt) {
        return nil, false
    }

    return result.User, true
}

func (tc *TokenCache) Set(token string, user *authv1.UserInfo) {
    tc.mutex.Lock()
    defer tc.mutex.Unlock()

    tc.cache[token] = &CachedResult{
        User:      user,
        ExpiresAt: time.Now().Add(tc.ttl),
    }
}

func (tc *TokenCache) Cleanup() {
    tc.mutex.Lock()
    defer tc.mutex.Unlock()

    now := time.Now()
    for token, result := range tc.cache {
        if now.After(result.ExpiresAt) {
            delete(tc.cache, token)
        }
    }
}
```

Use this cache in your webhook:

```go
cache := NewTokenCache(5 * time.Minute)

// Start cleanup goroutine
go func() {
    ticker := time.NewTicker(1 * time.Minute)
    defer ticker.Stop()
    for range ticker.C {
        cache.Cleanup()
    }
}()

// In webhook handler
if user, found := cache.Get(token); found {
    // Use cached result
} else {
    // Validate and cache
    result, _ := validateToken(clientset, token)
    cache.Set(token, &result.Status.User)
}
```

## Deploying the Webhook

Deploy your webhook service:

```yaml
# webhook-deployment.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: webhook-service
  namespace: webhook-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: token-reviewer
rules:
- apiGroups: ["authentication.k8s.io"]
  resources: ["tokenreviews"]
  verbs: ["create"]
- apiGroups: ["authorization.k8s.io"]
  resources: ["subjectaccessreviews"]
  verbs: ["create"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: webhook-token-reviewer
subjects:
- kind: ServiceAccount
  name: webhook-service
  namespace: webhook-system
roleRef:
  kind: ClusterRole
  name: token-reviewer
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webhook-service
  namespace: webhook-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: webhook-service
  template:
    metadata:
      labels:
        app: webhook-service
    spec:
      serviceAccountName: webhook-service
      containers:
      - name: webhook
        image: webhook-service:latest
        ports:
        - containerPort: 8443
        volumeMounts:
        - name: certs
          mountPath: /certs
          readOnly: true
      volumes:
      - name: certs
        secret:
          secretName: webhook-tls
---
apiVersion: v1
kind: Service
metadata:
  name: webhook-service
  namespace: webhook-system
spec:
  ports:
  - port: 443
    targetPort: 8443
  selector:
    app: webhook-service
```

## Testing Token Review

Test your webhook authentication:

```bash
# Get a ServiceAccount token
TOKEN=$(kubectl create token webhook-client -n production --duration=1h)

# Call the webhook
curl -X POST https://webhook-service.webhook-system.svc/webhook \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "test"}' \
  --cacert ca.crt

# Should return success if authenticated correctly
```

## Monitoring Token Reviews

Track token validation metrics:

```go
// metrics.go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

var (
    tokenReviewsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "token_reviews_total",
            Help: "Total number of token reviews",
        },
        []string{"status"},
    )

    tokenReviewDuration = promauto.NewHistogram(
        prometheus.HistogramOpts{
            Name: "token_review_duration_seconds",
            Help: "Token review duration in seconds",
        },
    )
)

func validateTokenWithMetrics(clientset *kubernetes.Clientset, token string) (*authv1.UserInfo, error) {
    start := time.Now()
    defer func() {
        tokenReviewDuration.Observe(time.Since(start).Seconds())
    }()

    result, err := validateToken(clientset, token)
    if err != nil {
        tokenReviewsTotal.WithLabelValues("error").Inc()
        return nil, err
    }

    if result.Status.Authenticated {
        tokenReviewsTotal.WithLabelValues("success").Inc()
        return &result.Status.User, nil
    }

    tokenReviewsTotal.WithLabelValues("failed").Inc()
    return nil, fmt.Errorf("authentication failed")
}
```

## Conclusion

The TokenReview API enables secure webhook authentication using ServiceAccount tokens. By implementing token validation in your webhooks, you create services that trust Kubernetes identities without managing separate credentials. Combine TokenReview with SubjectAccessReview for complete authentication and authorization. Use caching to improve performance, implement proper error handling, and monitor token validation metrics. This approach extends Kubernetes identity beyond the cluster, creating a unified authentication system for all your services.
