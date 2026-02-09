# How to Implement Ambassador External Auth Service for Custom Authentication Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ambassador, Authentication, Kubernetes

Description: Learn how to implement custom authentication and authorization logic using Ambassador's External Auth Service, enabling centralized security policies and complex authentication workflows in Kubernetes.

---

Ambassador's External Auth Service pattern delegates authentication and authorization decisions to external microservices. This architecture enables complex authentication logic, custom authorization rules, and integration with existing identity systems without modifying backend services. Every request passes through the auth service before reaching backends, creating a centralized security checkpoint.

## Understanding External Auth Architecture

The External Auth flow works as follows:

1. Client sends request to Ambassador
2. Ambassador forwards request (headers, path, method) to auth service
3. Auth service validates credentials and makes allow/deny decision
4. If allowed, auth service returns 200 with optional headers to add
5. Ambassador forwards original request to backend with added headers
6. If denied, auth service returns 401/403 and Ambassador rejects request

This pattern centralizes authentication logic, keeping backends stateless and focused on business logic.

## Creating an External Auth Service

Build a simple auth service in Go:

```go
// auth-service.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "strings"
)

type AuthResponse struct {
    Allow   bool              `json:"allow"`
    Headers map[string]string `json:"headers"`
}

func authHandler(w http.ResponseWriter, r *http.Request) {
    // Extract Authorization header
    authHeader := r.Header.Get("Authorization")

    if authHeader == "" {
        // No auth provided
        w.WriteHeader(http.StatusUnauthorized)
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Authorization header required",
        })
        return
    }

    // Parse Bearer token
    parts := strings.Split(authHeader, " ")
    if len(parts) != 2 || parts[0] != "Bearer" {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Invalid authorization format",
        })
        return
    }

    token := parts[1]

    // Validate token (simplified example)
    user, valid := validateToken(token)
    if !valid {
        w.WriteHeader(http.StatusForbidden)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Invalid token",
        })
        return
    }

    // Check authorization rules
    if !isAuthorized(user, r.Header.Get("X-Original-URI")) {
        w.WriteHeader(http.StatusForbidden)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Insufficient permissions",
        })
        return
    }

    // Success - add user context headers
    w.Header().Set("X-Auth-User", user.Username)
    w.Header().Set("X-Auth-User-ID", user.ID)
    w.Header().Set("X-Auth-Roles", strings.Join(user.Roles, ","))
    w.WriteHeader(http.StatusOK)
}

func validateToken(token string) (*User, bool) {
    // Implement JWT validation, database lookup, etc.
    // This is a simplified example
    if token == "valid-token-123" {
        return &User{
            ID:       "user-123",
            Username: "john.doe",
            Roles:    []string{"user", "admin"},
        }, true
    }
    return nil, false
}

func isAuthorized(user *User, path string) bool {
    // Implement custom authorization logic
    if strings.HasPrefix(path, "/admin/") {
        return contains(user.Roles, "admin")
    }
    return true
}

func contains(slice []string, item string) bool {
    for _, s := range slice {
        if s == item {
            return true
        }
    }
    return false
}

type User struct {
    ID       string
    Username string
    Roles    []string
}

func main() {
    http.HandleFunc("/auth", authHandler)
    log.Println("Auth service starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

Build and containerize:

```dockerfile
# Dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY auth-service.go .
RUN go build -o auth-service auth-service.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/auth-service .
EXPOSE 8080
CMD ["./auth-service"]
```

```bash
docker build -t auth-service:v1 .
docker push your-registry/auth-service:v1
```

## Deploying the Auth Service

Deploy to Kubernetes:

```yaml
# auth-service-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: your-registry/auth-service:v1
        ports:
        - containerPort: 8080
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: default
spec:
  selector:
    app: auth-service
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

```bash
kubectl apply -f auth-service-deployment.yaml
```

## Configuring Ambassador to Use External Auth

Create an AuthService resource:

```yaml
# external-auth-config.yaml
apiVersion: getambassador.io/v3alpha1
kind: AuthService
metadata:
  name: authentication
  namespace: default
spec:
  auth_service: auth-service.default:80
  path_prefix: /auth
  timeout_ms: 5000

  # Headers to send to auth service
  allowed_request_headers:
  - Authorization
  - X-Original-URI
  - X-Forwarded-For

  # Headers to include in backend requests
  allowed_authorization_headers:
  - X-Auth-User
  - X-Auth-User-ID
  - X-Auth-Roles

  # Add original request info
  add_linkerd_headers: false
  include_body:
    max_bytes: 4096
    allow_partial: true
```

Apply global authentication:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Module
metadata:
  name: ambassador
  namespace: ambassador
spec:
  config:
    auth_service: authentication
```

Or apply per-mapping:

```yaml
apiVersion: getambassador.io/v3alpha1
kind: Mapping
metadata:
  name: protected-api
  namespace: default
spec:
  prefix: /api/
  service: backend-service:8080
  auth_service: authentication
```

## Implementing JWT Validation

Extend the auth service with JWT validation:

```go
import (
    "github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("your-secret-key")

func validateToken(tokenString string) (*User, bool) {
    token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, fmt.Errorf("unexpected signing method")
        }
        return jwtSecret, nil
    })

    if err != nil || !token.Valid {
        return nil, false
    }

    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok {
        return nil, false
    }

    user := &User{
        ID:       claims["sub"].(string),
        Username: claims["username"].(string),
        Roles:    interfaceToStringSlice(claims["roles"]),
    }

    return user, true
}
```

## OAuth2 Integration

Implement OAuth2 flow in the auth service:

```go
func authHandler(w http.ResponseWriter, r *http.Request) {
    authHeader := r.Header.Get("Authorization")

    if authHeader == "" {
        // No token - initiate OAuth flow
        redirectToOAuth(w, r)
        return
    }

    // Exchange OAuth token for user info
    user, err := validateOAuthToken(authHeader)
    if err != nil {
        w.WriteHeader(http.StatusUnauthorized)
        return
    }

    // Set user context headers
    w.Header().Set("X-Auth-User", user.Email)
    w.Header().Set("X-Auth-Provider", "google")
    w.WriteHeader(http.StatusOK)
}

func redirectToOAuth(w http.ResponseWriter, r *http.Request) {
    originalURL := r.Header.Get("X-Original-URI")
    state := generateState()

    // Store state and return URL in session/cache

    authURL := fmt.Sprintf(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id=%s&redirect_uri=%s&response_type=code&scope=openid email profile&state=%s",
        oauthClientID,
        oauthRedirectURI,
        state,
    )

    w.Header().Set("Location", authURL)
    w.WriteHeader(http.StatusFound)
}
```

## API Key Authentication

Implement API key validation:

```go
func authHandler(w http.ResponseWriter, r *http.Request) {
    apiKey := r.Header.Get("X-API-Key")

    if apiKey == "" {
        w.WriteHeader(http.StatusUnauthorized)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "API key required",
        })
        return
    }

    // Validate API key against database
    client, err := validateAPIKey(apiKey)
    if err != nil {
        w.WriteHeader(http.StatusForbidden)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Invalid API key",
        })
        return
    }

    // Check rate limits for this API key
    if !checkRateLimit(client.ID) {
        w.WriteHeader(http.StatusTooManyRequests)
        json.NewEncoder(w).Encode(map[string]string{
            "error": "Rate limit exceeded",
        })
        return
    }

    // Add client context
    w.Header().Set("X-Client-ID", client.ID)
    w.Header().Set("X-Client-Tier", client.Tier)
    w.WriteHeader(http.StatusOK)
}

func validateAPIKey(key string) (*APIClient, error) {
    // Query database or cache
    var client APIClient
    err := db.QueryRow("SELECT id, tier FROM api_clients WHERE api_key = $1 AND active = true", key).
        Scan(&client.ID, &client.Tier)
    return &client, err
}
```

## Caching Auth Decisions

Implement caching to reduce latency:

```go
import (
    "github.com/go-redis/redis/v8"
    "time"
)

var rdb = redis.NewClient(&redis.Options{
    Addr: "redis:6379",
})

func authHandler(w http.ResponseWriter, r *http.Request) {
    token := extractToken(r)

    // Check cache first
    cacheKey := fmt.Sprintf("auth:%s", token)
    cached, err := rdb.Get(ctx, cacheKey).Result()

    if err == nil {
        // Cache hit - return cached result
        var user User
        json.Unmarshal([]byte(cached), &user)
        setAuthHeaders(w, &user)
        w.WriteHeader(http.StatusOK)
        return
    }

    // Cache miss - validate token
    user, valid := validateToken(token)
    if !valid {
        w.WriteHeader(http.StatusUnauthorized)
        return
    }

    // Cache the result
    userData, _ := json.Marshal(user)
    rdb.Set(ctx, cacheKey, userData, 5*time.Minute)

    setAuthHeaders(w, user)
    w.WriteHeader(http.StatusOK)
}
```

## Path-Based Authorization

Implement fine-grained authorization:

```go
type AuthRule struct {
    PathPrefix string
    Roles      []string
    Methods    []string
}

var authRules = []AuthRule{
    {PathPrefix: "/api/admin", Roles: []string{"admin"}, Methods: []string{"GET", "POST", "PUT", "DELETE"}},
    {PathPrefix: "/api/users", Roles: []string{"user", "admin"}, Methods: []string{"GET"}},
    {PathPrefix: "/api/users", Roles: []string{"admin"}, Methods: []string{"POST", "PUT", "DELETE"}},
}

func isAuthorized(user *User, path, method string) bool {
    for _, rule := range authRules {
        if strings.HasPrefix(path, rule.PathPrefix) {
            // Check if user has required role
            if !hasAnyRole(user.Roles, rule.Roles) {
                return false
            }
            // Check if method is allowed
            if !contains(rule.Methods, method) {
                return false
            }
        }
    }
    return true
}
```

## Testing External Auth

Test authentication flow:

```bash
# Get Ambassador address
AMBASSADOR=$(kubectl get svc ambassador -n ambassador -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Request without auth (should fail)
curl -i http://${AMBASSADOR}/api/data
# HTTP/1.1 401 Unauthorized

# Request with invalid token (should fail)
curl -i -H "Authorization: Bearer invalid-token" \
  http://${AMBASSADOR}/api/data
# HTTP/1.1 403 Forbidden

# Request with valid token (should succeed)
curl -i -H "Authorization: Bearer valid-token-123" \
  http://${AMBASSADOR}/api/data
# HTTP/1.1 200 OK
```

## Monitoring Auth Service

Add metrics and logging:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
    authAttempts = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "auth_attempts_total",
            Help: "Total authentication attempts",
        },
        []string{"status"},
    )
    authDuration = prometheus.NewHistogram(
        prometheus.HistogramOpts{
            Name: "auth_duration_seconds",
            Help: "Authentication check duration",
        },
    )
)

func init() {
    prometheus.MustRegister(authAttempts)
    prometheus.MustRegister(authDuration)
}

func authHandler(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    defer func() {
        authDuration.Observe(time.Since(start).Seconds())
    }()

    // ... authentication logic ...

    if valid {
        authAttempts.WithLabelValues("success").Inc()
    } else {
        authAttempts.WithLabelValues("failure").Inc()
    }
}

func main() {
    http.Handle("/metrics", promhttp.Handler())
    http.HandleFunc("/auth", authHandler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Best Practices

**Keep auth service lightweight** - Authentication checks happen on every request; optimize for low latency.

**Implement caching** - Cache validation results to reduce database load and improve response times.

**Use circuit breakers** - If auth service fails, decide whether to fail open (allow all) or fail closed (deny all).

**Monitor auth failures** - Track authentication failures for security monitoring and attack detection.

**Version your auth API** - Use API versioning to enable gradual rollouts of auth logic changes.

**Test failure scenarios** - Ensure proper behavior when auth service is slow, unavailable, or returning errors.

**Implement audit logging** - Log all authentication attempts for compliance and security analysis.

## Conclusion

Ambassador's External Auth Service pattern provides flexible, centralized authentication and authorization for Kubernetes APIs. By delegating auth decisions to dedicated microservices, you can implement complex authentication workflows, integrate with existing identity systems, and enforce sophisticated authorization policies without modifying backend services. This architecture scales horizontally, supports diverse authentication mechanisms, and maintains separation of concerns between security and business logic, making it ideal for microservices environments requiring fine-grained access control.
