# How to Use ServiceAccount Token Rotation for Security Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Security, Compliance

Description: Implement ServiceAccount token rotation strategies in Kubernetes to meet security compliance requirements and reduce the impact of token compromise.

---

Token rotation is a critical security practice that limits the lifetime of credentials. By regularly rotating ServiceAccount tokens, you reduce the window of opportunity for attackers to abuse compromised credentials and meet compliance requirements for credential management.

## Understanding Token Rotation

Token rotation means replacing existing authentication credentials with new ones on a regular schedule. For Kubernetes ServiceAccounts, this involves issuing new tokens before old ones expire and ensuring applications seamlessly transition to using the new credentials.

Modern Kubernetes implements automatic token rotation through bound ServiceAccount tokens. These tokens have limited lifetimes and the kubelet automatically refreshes them before expiration. This provides continuous rotation without application intervention.

However, some scenarios require manual token rotation: long-lived tokens used by external systems, tokens for service-to-service authentication outside Kubernetes, tokens stored in configuration management systems, or tokens used in CI/CD pipelines.

Understanding both automatic and manual rotation strategies helps you maintain security while ensuring uninterrupted service.

## Automatic Token Rotation with Bound Tokens

Kubernetes automatically rotates bound tokens mounted in pods. Configure the rotation period through projected volumes:

```yaml
# auto-rotating-token.yaml

apiVersion: v1
kind: Pod
metadata:
  name: app-with-rotation
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
          expirationSeconds: 3600  # 1 hour lifetime
          audience: api
```

The kubelet proactively requests rotation once this token is older than 48 minutes (80% of 60 minutes), or once the token is older than 24 hours, whichever happens first:

```bash
# Watch token rotation in action
kubectl exec -it app-with-rotation -n production -- sh -c '
  while true; do
    TOKEN=$(cat /var/run/secrets/tokens/api-token)
    EXP=$(python3 -c "import base64, json, sys; payload=sys.argv[1].split(\".\")[1]; payload += \"=\" * (-len(payload) % 4); print(json.loads(base64.urlsafe_b64decode(payload))[\"exp\"])" "$TOKEN")
    NOW=$(date +%s)
    TTL=$((EXP - NOW))
    echo "Token TTL: $TTL seconds"
    sleep 60
  done
'
```

You'll see the TTL drop toward around 720 seconds (20% of lifetime), then jump back up when rotation occurs.

## Implementing Application-Level Token Refresh

Applications must reload the token file periodically to get rotated tokens:

```go
// token-refresh-client.go
package main

import (
    "context"
    "fmt"
    "time"

    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/client-go/kubernetes"
    "k8s.io/client-go/rest"
)

func main() {
    // Create in-cluster config that reloads the token file automatically
    config, err := rest.InClusterConfig()
    if err != nil {
        panic(err.Error())
    }

    clientset, err := kubernetes.NewForConfig(config)
    if err != nil {
        panic(err.Error())
    }

    // Make continuous requests - token rotation happens transparently
    ticker := time.NewTicker(5 * time.Minute)
    defer ticker.Stop()

    for range ticker.C {
        pods, err := clientset.CoreV1().Pods("default").List(context.TODO(), metav1.ListOptions{})
        if err != nil {
            fmt.Printf("Error: %v\n", err)
            continue
        }
        fmt.Printf("%s - Listed %d pods\n", time.Now().Format(time.RFC3339), len(pods.Items))
    }
}
```

The rest.InClusterConfig() automatically handles token refresh by configuring the mounted token file as the bearer token source. Current client-go versions periodically re-read that file, so no application code changes are needed when you use the official client.

For custom HTTP clients, implement similar behavior:

```python
# rotating_token_client.py
import time
import requests
from datetime import datetime

class RotatingTokenAuth:
    def __init__(self, token_path):
        self.token_path = token_path
        self._token_cache = None
        self._last_read = 0
        self._cache_ttl = 60  # Reread token every 60 seconds

    def _read_token(self):
        """Read token from file with caching"""
        now = time.time()
        if self._token_cache is None or (now - self._last_read) > self._cache_ttl:
            with open(self.token_path, 'r') as f:
                self._token_cache = f.read().strip()
            self._last_read = now
        return self._token_cache

    def __call__(self, request):
        token = self._read_token()
        request.headers['Authorization'] = f'Bearer {token}'
        return request

def main():
    auth = RotatingTokenAuth('/var/run/secrets/kubernetes.io/serviceaccount/token')
    ca_cert = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt'

    while True:
        try:
            response = requests.get(
                'https://kubernetes.default.svc/api/v1/namespaces',
                auth=auth,
                verify=ca_cert,
                timeout=10
            )
            print(f"{datetime.now()} - Status: {response.status_code}")
        except Exception as e:
            print(f"Error: {e}")

        time.sleep(300)  # 5 minutes

if __name__ == "__main__":
    main()
```

This pattern ensures applications always use current tokens even as they rotate.

## Manual Token Rotation for External Systems

External systems can't use automatically rotating file-based tokens. Instead, generate new tokens periodically:

```bash
#!/bin/bash
# rotate-external-token.sh

NAMESPACE="production"
SERVICE_ACCOUNT="external-api-access"
TOKEN_FILE="/secure/api-token"

# Request a new token with a 24-hour duration
NEW_TOKEN=$(kubectl create token "$SERVICE_ACCOUNT" -n "$NAMESPACE" --duration=24h)

# Save to secure location. The API server may issue a token with a shorter or
# longer lifetime than requested, depending on cluster configuration.
printf '%s\n' "$NEW_TOKEN" > "$TOKEN_FILE"
chmod 600 "$TOKEN_FILE"

echo "Token rotated at $(date)"
```

Run this script daily via cron:

```bash
# Crontab entry - rotate at 2 AM daily
0 2 * * * /path/to/rotate-external-token.sh >> /var/log/token-rotation.log 2>&1
```

For high-security environments, rotate more frequently:

```bash
# Rotate every 6 hours
0 */6 * * * /path/to/rotate-external-token.sh
```

## Implementing Token Rotation in CI/CD Pipelines

CI/CD pipelines typically use tokens for cluster access. Rotate these tokens regularly:

```yaml
# .github/workflows/deploy.yml
name: Deploy with Token Rotation
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    # Generate a fresh token for this deployment after authenticating kubectl
    # with your CI identity, such as cloud OIDC or a restricted bootstrap credential.
    - name: Generate ServiceAccount Token
      run: |
        kubectl create token cicd-deployer -n cicd --duration=1h > /tmp/token

    - name: Deploy Application
      env:
        KUBE_SERVER: ${{ secrets.KUBE_SERVER }}
        KUBE_CA_CERT: ${{ secrets.KUBE_CA_CERT }}
      run: |
        # Use the fresh token
        kubectl config set-cluster target --server="$KUBE_SERVER" --certificate-authority=<(echo "$KUBE_CA_CERT" | base64 -d) --embed-certs=true
        kubectl config set-credentials cicd-deployer --token="$(cat /tmp/token)"
        kubectl config set-context target --cluster=target --user=cicd-deployer --namespace=production
        kubectl config use-context target
        kubectl apply -f k8s/

    - name: Cleanup
      if: always()
      run: rm -f /tmp/token
```

This uses a new short-lived token for each deployment. The workflow still needs an initial, tightly scoped way to authenticate to the cluster before it can call `kubectl create token`.

## Rotating Long-Lived Token Secrets

Legacy long-lived token secrets should be rotated periodically:

```bash
#!/bin/bash
# rotate-token-secret.sh

NAMESPACE="production"
SERVICE_ACCOUNT="legacy-app"
SECRET_NAME="legacy-app-token"

# Delete the old secret
kubectl delete secret "$SECRET_NAME" -n "$NAMESPACE" --ignore-not-found

# Create a new long-lived service account token secret
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: $SECRET_NAME
  namespace: $NAMESPACE
  annotations:
    kubernetes.io/service-account.name: $SERVICE_ACCOUNT
type: kubernetes.io/service-account-token
EOF

# Wait for the control plane to populate the token
kubectl wait --for=jsonpath='{.data.token}' "secret/$SECRET_NAME" -n "$NAMESPACE" --timeout=60s

# Restart pods to pick up new token
kubectl rollout restart deployment -n "$NAMESPACE" -l app=legacy-app

echo "Token secret rotated and pods restarted"
```

Schedule this monthly or quarterly based on compliance requirements.

## Monitoring Token Age

Track token age to ensure rotation happens correctly:

```go
// token-age-monitor.go
package main

import (
    "encoding/base64"
    "encoding/json"
    "fmt"
    "os"
    "strings"
    "time"
)

type TokenClaims struct {
    Exp int64 `json:"exp"`
    Iat int64 `json:"iat"`
}

func getTokenAge(tokenPath string) (time.Duration, error) {
    // Read token file
    tokenBytes, err := os.ReadFile(tokenPath)
    if err != nil {
        return 0, err
    }

    // JWT has three parts separated by dots
    parts := strings.Split(string(tokenBytes), ".")
    if len(parts) != 3 {
        return 0, fmt.Errorf("invalid token format")
    }

    // Decode the payload (second part)
    payload, err := base64.RawURLEncoding.DecodeString(parts[1])
    if err != nil {
        return 0, err
    }

    var claims TokenClaims
    if err := json.Unmarshal(payload, &claims); err != nil {
        return 0, err
    }

    // Calculate age
    issuedAt := time.Unix(claims.Iat, 0)
    age := time.Since(issuedAt)

    return age, nil
}

func main() {
    tokenPath := "/var/run/secrets/kubernetes.io/serviceaccount/token"

    ticker := time.NewTicker(1 * time.Minute)
    defer ticker.Stop()

    for range ticker.C {
        age, err := getTokenAge(tokenPath)
        if err != nil {
            fmt.Printf("Error: %v\n", err)
            continue
        }

        fmt.Printf("Token age: %s\n", age.Round(time.Second))

        // Alert if a one-hour projected token is too old
        if age > 2*time.Hour {
            fmt.Printf("WARNING: Token is older than expected!\n")
        }
    }
}
```

This monitoring helps detect rotation failures.

## Compliance Reporting

Generate reports for security audits:

```bash
#!/bin/bash
# token-rotation-report.sh

echo "ServiceAccount Token Rotation Report - $(date)"
echo "================================================"

for ns in $(kubectl get ns -o jsonpath='{.items[*].metadata.name}'); do
    echo ""
    echo "Namespace: $ns"

    for sa in $(kubectl get sa -n $ns -o jsonpath='{.items[*].metadata.name}'); do
        # Check if SA has automount disabled
        AUTOMOUNT=$(kubectl get sa $sa -n $ns -o jsonpath='{.automountServiceAccountToken}')

        echo "  ServiceAccount: $sa"
        echo "    AutoMount: ${AUTOMOUNT:-true}"

        # List pods using this SA
        PODS=$(kubectl get pods -n $ns -o json | \
          jq -r ".items[] | select(.spec.serviceAccountName==\"$sa\") | .metadata.name")

        if [ ! -z "$PODS" ]; then
            echo "    Pods: $(echo $PODS | tr '\n' ', ')"
        fi
    done
done
```

Run this monthly and archive results for compliance records.

## Handling Token Rotation Failures

Implement fallback mechanisms for rotation failures:

```python
# resilient_client.py
import time
import requests
from datetime import datetime

class ResilientTokenAuth:
    def __init__(self, token_paths):
        # Support multiple token locations for fallback
        self.token_paths = token_paths if isinstance(token_paths, list) else [token_paths]

    def _try_read_token(self, path):
        try:
            with open(path, 'r') as f:
                return f.read().strip()
        except:
            return None

    def __call__(self, request):
        # Try each token path in order
        for path in self.token_paths:
            token = self._try_read_token(path)
            if token:
                request.headers['Authorization'] = f'Bearer {token}'
                return request

        raise Exception("No valid token found in any configured path")

# Use with fallback paths
auth = ResilientTokenAuth([
    '/var/run/secrets/tokens/api-token',  # Primary
    '/var/run/secrets/kubernetes.io/serviceaccount/token'  # Fallback
])
```

This can preserve service continuity if the fallback token is valid for the same audience and has the required permissions.

## Conclusion

ServiceAccount token rotation is essential for security and compliance. Modern Kubernetes provides automatic rotation through bound tokens with configurable lifetimes. Applications using official Kubernetes clients get rotation automatically. For external systems, implement periodic manual rotation through scheduled token generation. Monitor token age, test rotation procedures regularly, and maintain fallback mechanisms. With proper token rotation in place, you significantly reduce the risk of credential compromise while meeting security compliance requirements.
