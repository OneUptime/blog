# How to Use Vault Response Wrapping for Secure Secret Distribution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, Security, Response Wrapping, Secret Distribution, Zero Trust

Description: Master HashiCorp Vault response wrapping to securely distribute secrets with single-use tokens and audit trails, implementing zero-trust secret delivery in Kubernetes environments.

---

HashiCorp Vault response wrapping provides a secure mechanism for distributing secrets without exposing them during transit or storage. When you wrap a response, Vault returns a single-use token instead of the actual secret. The recipient uses this token once to unwrap and retrieve the secret. This pattern enables zero-trust secret distribution and provides audit trails for secret delivery. This guide covers implementing response wrapping in Kubernetes environments.

## Understanding Response Wrapping

Response wrapping creates a cubbyhole token that stores the response data. The cubbyhole is tied to the wrapping token, which can be used exactly once within a specified TTL. After unwrapping, both the token and cubbyhole are destroyed automatically.

This provides several security benefits. The actual secret never appears in logs or transit. You can detect if someone intercepts and uses the token before the intended recipient. The wrapping token has a short TTL, limiting the window of opportunity for attackers.

Response wrapping is ideal for secret bootstrapping, CI/CD pipelines, automated provisioning systems, and any scenario where secrets must traverse untrusted networks.

## Creating Wrapped Responses

Wrap any Vault API response using the `X-Vault-Wrap-TTL` header:

```bash
# Wrap a secret read with 5-minute TTL
vault kv get -wrap-ttl=5m secret/database/credentials

# The response contains only the wrapping token
Key                              Value
---                              -----
wrapping_token:                  s.abc123def456
wrapping_accessor:               accessor_abc123
wrapping_token_ttl:              5m
wrapping_token_creation_time:    2026-02-09T10:00:00Z
wrapping_token_creation_path:    secret/data/database/credentials
```

Wrap dynamic secret generation:

```bash
# Wrap database credential generation
vault read -wrap-ttl=10m database/creds/readonly

# Wrap PKI certificate generation
vault write -wrap-ttl=15m pki/issue/example-dot-com \
    common_name=app.example.com
```

## Unwrapping Secrets

The recipient unwraps the secret using the wrapping token:

```bash
# Unwrap using the token
vault unwrap s.abc123def456

# This reveals the actual secret
Key              Value
---              -----
username         vault-user-abc123
password         super-secret-password
```

The wrapping token is consumed and cannot be used again. Attempting to unwrap twice fails:

```bash
vault unwrap s.abc123def456
Error unwrapping: Error making API request.

Code: 400. Errors:
* wrapping token is not valid or does not exist
```

## Implementing Response Wrapping in Go

Create a client that wraps and unwraps secrets:

```go
package main

import (
    "fmt"
    "time"
    "github.com/hashicorp/vault/api"
)

type SecretDistributor struct {
    client *api.Client
}

func NewSecretDistributor(vaultAddr, token string) (*SecretDistributor, error) {
    config := api.DefaultConfig()
    config.Address = vaultAddr

    client, err := api.NewClient(config)
    if err != nil {
        return nil, fmt.Errorf("failed to create client: %w", err)
    }

    client.SetToken(token)

    return &SecretDistributor{
        client: client,
    }, nil
}

// WrapSecret reads a secret and returns a wrapped token
func (sd *SecretDistributor) WrapSecret(path string, ttl time.Duration) (string, error) {
    // Set wrap TTL
    sd.client.SetWrappingLookupFunc(func(operation, path string) string {
        return ttl.String()
    })

    // Read the secret (will be wrapped)
    secret, err := sd.client.Logical().Read(path)
    if err != nil {
        return "", fmt.Errorf("failed to read secret: %w", err)
    }

    if secret == nil || secret.WrapInfo == nil {
        return "", fmt.Errorf("no wrapping info returned")
    }

    return secret.WrapInfo.Token, nil
}

// UnwrapSecret unwraps a token and returns the secret
func (sd *SecretDistributor) UnwrapSecret(wrappedToken string) (*api.Secret, error) {
    // Set the wrapping token
    sd.client.SetToken(wrappedToken)

    // Unwrap the secret
    secret, err := sd.client.Logical().Unwrap("")
    if err != nil {
        return nil, fmt.Errorf("failed to unwrap: %w", err)
    }

    return secret, nil
}

// LookupWrappingToken returns info about a wrapping token without unwrapping
func (sd *SecretDistributor) LookupWrappingToken(wrappedToken string) (*api.Secret, error) {
    originalToken := sd.client.Token()
    defer sd.client.SetToken(originalToken)

    sd.client.SetToken(wrappedToken)

    secret, err := sd.client.Logical().Write("sys/wrapping/lookup", map[string]interface{}{
        "token": wrappedToken,
    })
    if err != nil {
        return nil, fmt.Errorf("failed to lookup: %w", err)
    }

    return secret, nil
}

// RewrapToken creates a new wrapping token from an existing one
func (sd *SecretDistributor) RewrapToken(wrappedToken string) (string, error) {
    secret, err := sd.client.Logical().Write("sys/wrapping/rewrap", map[string]interface{}{
        "token": wrappedToken,
    })
    if err != nil {
        return "", fmt.Errorf("failed to rewrap: %w", err)
    }

    if secret == nil || secret.WrapInfo == nil {
        return "", fmt.Errorf("no wrapping info in response")
    }

    return secret.WrapInfo.Token, nil
}
```

## Using Response Wrapping in CI/CD Pipelines

Integrate response wrapping in CI/CD workflows. In the pipeline configuration service:

```go
// Pipeline service wraps secrets for jobs
func (ps *PipelineService) PrepareJobSecrets(jobID string) (string, error) {
    distributor, err := NewSecretDistributor(
        "http://vault.vault-system:8200",
        ps.vaultToken,
    )
    if err != nil {
        return "", err
    }

    // Wrap database credentials with 10-minute TTL
    wrappedToken, err := distributor.WrapSecret(
        fmt.Sprintf("secret/data/jobs/%s/database", jobID),
        10*time.Minute,
    )
    if err != nil {
        return "", err
    }

    // Store wrapped token in job configuration
    // The token itself is safe to store or transmit
    return wrappedToken, nil
}
```

In the CI/CD job:

```go
// CI/CD job unwraps secrets
func (job *CIJob) LoadSecrets(wrappedToken string) error {
    // Create client without authentication
    config := api.DefaultConfig()
    config.Address = "http://vault.vault-system:8200"

    client, err := api.NewClient(config)
    if err != nil {
        return fmt.Errorf("failed to create client: %w", err)
    }

    // Set the wrapping token
    client.SetToken(wrappedToken)

    // Unwrap to get actual secret
    secret, err := client.Logical().Unwrap("")
    if err != nil {
        return fmt.Errorf("failed to unwrap: %w", err)
    }

    // Extract secret data (KV v2 structure)
    data := secret.Data["data"].(map[string]interface{})

    job.DatabaseUser = data["username"].(string)
    job.DatabasePass = data["password"].(string)

    return nil
}
```

## Implementing Wrapped Token Distribution via Kubernetes Secrets

Store wrapped tokens in Kubernetes Secrets for pod consumption:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: wrapped-vault-token
  namespace: production
type: Opaque
stringData:
  wrapped_token: s.abc123def456
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      initContainers:
      - name: unwrap-secrets
        image: vault:1.15
        command:
        - sh
        - -c
        - |
          # Read wrapped token
          WRAPPED_TOKEN=$(cat /vault/wrapped/token)

          # Unwrap and save to shared volume
          export VAULT_ADDR=http://vault.vault-system:8200
          export VAULT_TOKEN=$WRAPPED_TOKEN

          vault unwrap -format=json | jq -r '.data.data' > /vault/secrets/config.json
        volumeMounts:
        - name: wrapped-token
          mountPath: /vault/wrapped
        - name: secrets
          mountPath: /vault/secrets
      containers:
      - name: app
        image: myapp:latest
        volumeMounts:
        - name: secrets
          mountPath: /vault/secrets
          readOnly: true
      volumes:
      - name: wrapped-token
        secret:
          secretName: wrapped-vault-token
          items:
          - key: wrapped_token
            path: token
      - name: secrets
        emptyDir:
          medium: Memory
```

## Creating a Wrapped Token Distribution Service

Build a service that generates wrapped tokens on demand:

```go
package main

import (
    "encoding/json"
    "net/http"
    "time"
    "github.com/gorilla/mux"
    "github.com/hashicorp/vault/api"
)

type TokenDistributionService struct {
    vaultClient *api.Client
}

type WrapRequest struct {
    Path string `json:"path"`
    TTL  string `json:"ttl"`
}

type WrapResponse struct {
    WrappedToken string `json:"wrapped_token"`
    Accessor     string `json:"accessor"`
    TTL          string `json:"ttl"`
    CreationTime string `json:"creation_time"`
}

func (tds *TokenDistributionService) HandleWrapRequest(w http.ResponseWriter, r *http.Request) {
    var req WrapRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "Invalid request", http.StatusBadRequest)
        return
    }

    // Parse TTL
    ttl, err := time.ParseDuration(req.TTL)
    if err != nil {
        http.Error(w, "Invalid TTL", http.StatusBadRequest)
        return
    }

    // Set wrap TTL
    tds.vaultClient.SetWrappingLookupFunc(func(operation, path string) string {
        return ttl.String()
    })

    // Read and wrap secret
    secret, err := tds.vaultClient.Logical().Read(req.Path)
    if err != nil {
        http.Error(w, "Failed to read secret", http.StatusInternalServerError)
        return
    }

    if secret == nil || secret.WrapInfo == nil {
        http.Error(w, "Failed to wrap secret", http.StatusInternalServerError)
        return
    }

    // Return wrapped token
    response := WrapResponse{
        WrappedToken: secret.WrapInfo.Token,
        Accessor:     secret.WrapInfo.Accessor,
        TTL:          secret.WrapInfo.TTL.String(),
        CreationTime: secret.WrapInfo.CreationTime.Format(time.RFC3339),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func main() {
    config := api.DefaultConfig()
    config.Address = "http://vault.vault-system:8200"

    client, err := api.NewClient(config)
    if err != nil {
        panic(err)
    }

    client.SetToken(os.Getenv("VAULT_TOKEN"))

    tds := &TokenDistributionService{
        vaultClient: client,
    }

    r := mux.NewRouter()
    r.HandleFunc("/api/v1/wrap", tds.HandleWrapRequest).Methods("POST")

    http.ListenAndServe(":8080", r)
}
```

## Detecting Wrapped Token Misuse

Monitor for wrapped token misuse using audit logs:

```bash
# Enable detailed audit logging
vault audit enable file file_path=/vault/logs/audit.log log_raw=true

# Query for wrapped token operations
kubectl exec -n vault-system vault-0 -- cat /vault/logs/audit.log | \
    jq 'select(.request.path == "sys/wrapping/unwrap" or .request.path == "sys/wrapping/lookup")'
```

Set up alerts for suspicious activity:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vault-wrapping-alerts
  namespace: monitoring
data:
  wrapping-alerts.yaml: |
    groups:
    - name: vault-response-wrapping
      rules:
      - alert: MultipleUnwrapAttempts
        expr: |
          rate(vault_audit_unwrap_operations_total{error="true"}[5m]) > 0.1
        labels:
          severity: warning
        annotations:
          summary: "Multiple failed unwrap attempts detected"

      - alert: ExpiredWrappedToken
        expr: |
          vault_token_expired_wrapped_count > 0
        labels:
          severity: info
        annotations:
          summary: "Wrapped tokens expiring before use"
```

## Rewrapping Tokens for Extended Delivery

When the original TTL is insufficient, rewrap the token:

```python
import hvac
import time

def safe_secret_delivery(vault_client, secret_path, max_attempts=3):
    # Initial wrap with short TTL
    wrapped_response = vault_client.read(
        secret_path,
        wrap_ttl='5m'
    )
    wrapped_token = wrapped_response['wrap_info']['token']

    for attempt in range(max_attempts):
        try:
            # Deliver token to recipient
            deliver_token(wrapped_token)
            return True

        except DeliveryError as e:
            if attempt < max_attempts - 1:
                # Rewrap for another attempt
                rewrap_response = vault_client.sys.rewrap(wrapped_token)
                wrapped_token = rewrap_response['wrap_info']['token']
                time.sleep(60)  # Wait before retry
            else:
                raise

    return False
```

## Best Practices

Use the shortest TTL that accommodates your delivery mechanism. Shorter TTLs reduce the attack window but must allow time for legitimate use.

Always verify wrapped token integrity before distribution. Check the creation path and TTL to ensure they match expectations.

Log all wrapping and unwrapping operations. These audit trails help detect token interception and misuse.

Implement token rotation for long-running processes. Don't reuse wrapped tokens across multiple operations.

Consider using response wrapping for all secret distribution, even in trusted networks. This provides defense-in-depth and consistent security patterns.

## Conclusion

Response wrapping transforms Vault into a secure secret distribution mechanism. By replacing actual secrets with single-use tokens, you gain visibility into secret delivery, detect interception attempts, and implement zero-trust principles. This pattern is essential for CI/CD pipelines, automated provisioning systems, and any scenario where secrets must traverse potentially untrusted infrastructure.

Implement response wrapping as a standard practice in your secret distribution workflows to enhance security and auditability.
