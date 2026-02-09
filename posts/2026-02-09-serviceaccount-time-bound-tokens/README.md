# How to Implement ServiceAccount with Time-Bound Tokens

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Authentication

Description: Implement time-bound ServiceAccount tokens in Kubernetes with configurable expiration times to enhance security through credential lifetime management and automatic rotation.

---

Time-bound tokens are ServiceAccount tokens that expire after a specified duration. By limiting token lifetimes, you reduce the window of opportunity for attackers to abuse compromised credentials and enforce regular credential rotation as a security practice.

## Understanding Time-Bound Tokens

Traditional long-lived ServiceAccount tokens never expire. Once created, they remain valid indefinitely until manually deleted. This creates a significant security risk - a compromised token provides persistent access to your cluster.

Time-bound tokens solve this by embedding an expiration time in the token's claims. After this time, the API server rejects the token. Even if an attacker obtains the token, its usefulness is limited to the remaining lifetime.

Modern Kubernetes uses time-bound tokens by default for pods. The kubelet requests tokens with specific lifetimes and automatically refreshes them before expiration. This provides continuous service while maintaining short token lifetimes.

## Configuring Token Expiration in Pods

Set custom expiration times using projected volumes:

```yaml
# short-lived-token-pod.yaml
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
          expirationSeconds: 600  # 10 minutes
          audience: api
```

This token expires after 10 minutes. The kubelet refreshes it at 80% of its lifetime (8 minutes), ensuring the application always has a valid token.

## Different Lifetimes for Different Use Cases

Choose expiration times based on security requirements:

```yaml
# varied-lifetime-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: multi-service-app
  namespace: production
spec:
  serviceAccountName: app-service-account
  containers:
  - name: app
    image: myapp:latest
    volumeMounts:
    - name: tokens
      mountPath: /var/run/secrets/tokens
      readOnly: true
  volumes:
  - name: tokens
    projected:
      sources:
      # Critical operations - very short-lived
      - serviceAccountToken:
          path: admin-token
          expirationSeconds: 300  # 5 minutes
          audience: admin-api
      # Regular operations - short-lived
      - serviceAccountToken:
          path: api-token
          expirationSeconds: 1800  # 30 minutes
          audience: api
      # Read-only operations - medium-lived
      - serviceAccountToken:
          path: readonly-token
          expirationSeconds: 7200  # 2 hours
          audience: readonly-api
      # Batch processing - longer-lived
      - serviceAccountToken:
          path: batch-token
          expirationSeconds: 28800  # 8 hours
          audience: batch-processor
```

More sensitive operations get shorter token lifetimes.

## Creating Time-Bound Tokens with kubectl

Generate tokens with specific lifetimes for external use:

```bash
# Create a 1-hour token
TOKEN=$(kubectl create token app-service-account -n production --duration=1h)
echo $TOKEN

# Create a 24-hour token for CI/CD
kubectl create token cicd-deployer -n cicd --duration=24h

# Create a 5-minute token for temporary access
kubectl create token debug-account -n production --duration=5m

# Maximum allowed duration (varies by cluster, typically 24h)
kubectl create token app-service-account -n production --duration=24h
```

These tokens are bound to the ServiceAccount but not to a specific pod. They expire after the specified duration and cannot be renewed.

## Verifying Token Expiration Times

Check when a token expires:

```bash
#!/bin/bash
# check-token-expiration.sh

TOKEN_FILE="/var/run/secrets/kubernetes.io/serviceaccount/token"

# Read the token
TOKEN=$(cat $TOKEN_FILE)

# Decode the JWT payload (second part between dots)
PAYLOAD=$(echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null)

# Extract expiration time
EXP=$(echo $PAYLOAD | grep -o '"exp":[0-9]*' | cut -d':' -f2)
IAT=$(echo $PAYLOAD | grep -o '"iat":[0-9]*' | cut -d':' -f2)

# Current time
NOW=$(date +%s)

# Calculate time to expiration
TTL=$((EXP - NOW))
LIFETIME=$((EXP - IAT))

echo "Token issued at: $(date -d @$IAT)"
echo "Token expires at: $(date -d @$EXP)"
echo "Token lifetime: $LIFETIME seconds ($((LIFETIME / 60)) minutes)"
echo "Time remaining: $TTL seconds ($((TTL / 60)) minutes)"

if [ $TTL -lt 0 ]; then
    echo "WARNING: Token has expired!"
elif [ $TTL -lt 300 ]; then
    echo "WARNING: Token expires soon!"
fi
```

Run this script periodically to monitor token status.

## Application Token Refresh Strategy

Applications must handle token rotation properly:

```go
// token-refresh-handler.go
package main

import (
    "context"
    "fmt"
    "io/ioutil"
    "sync"
    "time"

    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

type TokenManager struct {
    tokenPath    string
    currentToken string
    mutex        sync.RWMutex
    refreshTicker *time.Ticker
}

func NewTokenManager(tokenPath string, refreshInterval time.Duration) *TokenManager {
    tm := &TokenManager{
        tokenPath: tokenPath,
        refreshTicker: time.NewTicker(refreshInterval),
    }

    // Load initial token
    tm.refresh()

    // Start background refresh
    go tm.refreshLoop()

    return tm
}

func (tm *TokenManager) refresh() error {
    token, err := ioutil.ReadFile(tm.tokenPath)
    if err != nil {
        return fmt.Errorf("failed to read token: %v", err)
    }

    tm.mutex.Lock()
    tm.currentToken = string(token)
    tm.mutex.Unlock()

    fmt.Printf("Token refreshed at %s\n", time.Now().Format(time.RFC3339))
    return nil
}

func (tm *TokenManager) refreshLoop() {
    for range tm.refreshTicker.C {
        if err := tm.refresh(); err != nil {
            fmt.Printf("Error refreshing token: %v\n", err)
        }
    }
}

func (tm *TokenManager) GetToken() string {
    tm.mutex.RLock()
    defer tm.mutex.RUnlock()
    return tm.currentToken
}

func (tm *TokenManager) Stop() {
    tm.refreshTicker.Stop()
}

func main() {
    // Refresh token every 30 seconds
    tm := NewTokenManager("/var/run/secrets/tokens/api-token", 30*time.Second)
    defer tm.Stop()

    // Use in-cluster config with automatic token refresh
    config, err := rest.InClusterConfig()
    if err != nil {
        panic(err.Error())
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err.Error())
    }

    // Make requests continuously
    ticker := time.NewTicker(1 * time.Minute)
    defer ticker.Stop()

    for range ticker.C {
        pods, err := clientset.CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{})
        if err != nil {
            fmt.Printf("Error: %v\n", err)
            continue
        }
        fmt.Printf("Listed %d pods with current token\n", len(pods.Items))
    }
}
```

This pattern ensures applications always use current tokens.

## Python Token Refresh Implementation

For Python applications:

```python
# token_refresh.py
import os
import time
import threading
from datetime import datetime

class TokenManager:
    def __init__(self, token_path, refresh_interval=30):
        self.token_path = token_path
        self.refresh_interval = refresh_interval
        self.current_token = None
        self.lock = threading.Lock()

        # Load initial token
        self.refresh()

        # Start background refresh thread
        self.refresh_thread = threading.Thread(target=self._refresh_loop, daemon=True)
        self.refresh_thread.start()

    def refresh(self):
        """Read token from file"""
        try:
            with open(self.token_path, 'r') as f:
                token = f.read().strip()

            with self.lock:
                self.current_token = token

            print(f"Token refreshed at {datetime.now()}")
            return True
        except Exception as e:
            print(f"Error refreshing token: {e}")
            return False

    def _refresh_loop(self):
        """Background loop to refresh token"""
        while True:
            time.sleep(self.refresh_interval)
            self.refresh()

    def get_token(self):
        """Get current token thread-safely"""
        with self.lock:
            return self.current_token

# Usage
token_manager = TokenManager('/var/run/secrets/tokens/api-token')

# Use in requests
import requests

def make_api_request():
    token = token_manager.get_token()
    headers = {'Authorization': f'Bearer {token}'}

    response = requests.get(
        'https://kubernetes.default.svc/api/v1/namespaces',
        headers=headers,
        verify='/var/run/secrets/kubernetes.io/serviceaccount/ca.crt'
    )
    return response.json()

# Make continuous requests
while True:
    try:
        data = make_api_request()
        print(f"Request successful at {datetime.now()}")
    except Exception as e:
        print(f"Error: {e}")
    time.sleep(60)
```

## Monitoring Token Rotation

Track token rotation events:

```go
// token-rotation-monitor.go
package main

import (
    "encoding/base64"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "strings"
    "time"
)

type TokenClaims struct {
    Exp int64  `json:"exp"`
    Iat int64  `json:"iat"`
    Sub string `json:"sub"`
    Aud []string `json:"aud"`
}

func parseToken(tokenPath string) (*TokenClaims, error) {
    tokenBytes, err := ioutil.ReadFile(tokenPath)
    if err != nil {
        return nil, err
    }

    // JWT has three parts: header.payload.signature
    parts := strings.Split(string(tokenBytes), ".")
    if len(parts) != 3 {
        return nil, fmt.Errorf("invalid token format")
    }

    // Decode payload
    payload, err := base64.RawURLEncoding.DecodeString(parts[1])
    if err != nil {
        return nil, err
    }

    var claims TokenClaims
    if err := json.Unmarshal(payload, &claims); err != nil {
        return nil, err
    }

    return &claims, nil
}

func monitorTokenRotation(tokenPath string) {
    var lastIat int64

    ticker := time.NewTicker(30 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        claims, err := parseToken(tokenPath)
        if err != nil {
            fmt.Printf("Error parsing token: %v\n", err)
            continue
        }

        now := time.Now().Unix()
        ttl := claims.Exp - now
        age := now - claims.Iat

        // Check if token was rotated
        if lastIat > 0 && claims.Iat != lastIat {
            fmt.Printf("TOKEN ROTATED at %s\n", time.Now().Format(time.RFC3339))
        }
        lastIat = claims.Iat

        fmt.Printf("Token status: age=%ds, ttl=%ds, exp=%s\n",
            age, ttl, time.Unix(claims.Exp, 0).Format(time.RFC3339))

        // Alert if token isn't rotating
        if age > 3600 {
            fmt.Printf("WARNING: Token hasn't rotated in over 1 hour!\n")
        }

        // Alert if close to expiration
        if ttl < 300 {
            fmt.Printf("WARNING: Token expires in less than 5 minutes!\n")
        }
    }
}

func main() {
    tokenPath := "/var/run/secrets/tokens/api-token"
    fmt.Printf("Monitoring token rotation at %s\n", tokenPath)
    monitorTokenRotation(tokenPath)
}
```

## Setting Appropriate Expiration Times

Choose expiration times based on your threat model:

- High security environments: 5-15 minutes
- Standard production workloads: 30 minutes to 2 hours
- Batch jobs and long-running tasks: 4-8 hours
- CI/CD pipelines: 1-24 hours
- Temporary debugging: 5-30 minutes

Shorter lifetimes provide better security but increase the frequency of rotation. Balance security with operational requirements.

## Handling Rotation Failures

Implement fallback mechanisms:

```go
// resilient-token-access.go
package main

import (
    "fmt"
    "io/ioutil"
    "time"
)

type ResilientTokenReader struct {
    primaryPath   string
    fallbackPath  string
    lastGoodToken string
    lastReadTime  time.Time
}

func (r *ResilientTokenReader) GetToken() (string, error) {
    // Try primary path
    if token, err := ioutil.ReadFile(r.primaryPath); err == nil {
        r.lastGoodToken = string(token)
        r.lastReadTime = time.Now()
        return string(token), nil
    }

    // Try fallback path
    if r.fallbackPath != "" {
        if token, err := ioutil.ReadFile(r.fallbackPath); err == nil {
            r.lastGoodToken = string(token)
            r.lastReadTime = time.Now()
            return string(token), nil
        }
    }

    // Use cached token if recent
    if time.Since(r.lastReadTime) < 5*time.Minute && r.lastGoodToken != "" {
        fmt.Println("WARNING: Using cached token due to read failure")
        return r.lastGoodToken, nil
    }

    return "", fmt.Errorf("unable to read token from any source")
}
```

This provides resilience during token rotation failures.

## Conclusion

Time-bound tokens significantly improve Kubernetes security by limiting credential lifetimes. Configure appropriate expiration times through projected volumes, ensure applications handle token rotation correctly, and monitor rotation to detect failures. The kubelet handles rotation automatically for pod tokens, providing seamless security. For external access, use kubectl to create short-lived tokens that expire automatically. By implementing time-bound tokens throughout your cluster, you reduce the risk of credential compromise and enforce regular credential rotation as a standard practice.
