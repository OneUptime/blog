# How to Use Dapr Cryptography with Kubernetes Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, Kubernetes, Secret, Encryption, Security, Key Management

Description: Learn how to use Kubernetes Secrets as the key provider for Dapr Cryptography, enabling in-cluster encryption without external dependencies for development and staging.

---

## Kubernetes Secrets as a Crypto Key Provider

Dapr Cryptography supports Kubernetes Secrets as a key provider, allowing you to store encryption keys as Kubernetes secrets and use them for encryption/decryption operations via the Dapr API. This approach works well for environments where you want in-cluster key management without requiring an external vault service.

## Creating a Key as a Kubernetes Secret

First, generate a key in JWK format:

```bash
# Generate a 256-bit AES key in JWK format
cat > /tmp/generate-key.js << 'EOF'
const crypto = require("crypto");
const key = crypto.generateKeySync("aes", { length: 256 });
const jwk = key.export({ format: "jwk" });
console.log(JSON.stringify({ keys: [{ ...jwk, kid: "app-key-v1", use: "enc" }] }));
EOF
node /tmp/generate-key.js > app-key.jwks.json
```

Store the key as a Kubernetes secret:

```bash
kubectl create secret generic crypto-keys \
  --from-file=app-key-v1=./app-key.jwks.json \
  --namespace default
```

Or using a YAML manifest:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: crypto-keys
  namespace: default
type: Opaque
data:
  app-key-v1: <base64-encoded-jwk-json>
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: k8s-crypto
spec:
  type: crypto.dapr.kubernetes.secrets
  version: v1
  metadata:
  - name: defaultNamespace
    value: "default"
```

The key name used in API calls must follow the format `{secret-name}/{key-name}`:

```python
# Key name format: "secret-name/key-name-in-secret"
key_name = "crypto-keys/app-key-v1"
```

## RBAC for the Dapr Sidecar

Grant the Dapr sidecar permission to read the crypto secrets:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: dapr-crypto-reader
  namespace: default
rules:
- apiGroups: [""]
  resources: ["secrets"]
  resourceNames: ["crypto-keys"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: dapr-crypto-reader-binding
  namespace: default
subjects:
- kind: ServiceAccount
  name: default
  namespace: default
roleRef:
  kind: Role
  name: dapr-crypto-reader
  apiGroup: rbac.authorization.k8s.io
```

## Encrypting Data

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._crypto import EncryptOptions

def encrypt_field(value: str) -> bytes:
    with DaprClient() as d:
        encrypted = d.encrypt(
            data=value.encode(),
            options=EncryptOptions(
                component_name="k8s-crypto",
                key_name="crypto-keys/app-key-v1",
                key_wrap_algorithm="AES",
            ),
        )
        return encrypted.read()

# Encrypt PII before storing
encrypted_ssn = encrypt_field("123-45-6789")
db.execute("UPDATE users SET ssn_encrypted = %s WHERE id = %s",
           [encrypted_ssn, user_id])
```

## Decrypting Data

```python
from dapr.clients.grpc._crypto import DecryptOptions

def decrypt_field(ciphertext: bytes) -> str:
    with DaprClient() as d:
        decrypted = d.decrypt(
            data=ciphertext,
            options=DecryptOptions(
                component_name="k8s-crypto",
                key_name="crypto-keys/app-key-v1",
            ),
        )
        return decrypted.read().decode()

# Decrypt PII when reading
row = db.query("SELECT ssn_encrypted FROM users WHERE id = %s", user_id)
ssn = decrypt_field(row["ssn_encrypted"])
```

## Go SDK Example

```go
func encryptWithK8sSecret(data []byte) ([]byte, error) {
    client, _ := dapr.NewClient()
    defer client.Close()

    stream, err := client.Encrypt(
        context.Background(),
        bytes.NewReader(data),
        dapr.EncryptOptions{
            ComponentName:    "k8s-crypto",
            KeyName:          "crypto-keys/app-key-v1",
            KeyWrapAlgorithm: "AES",
        },
    )
    if err != nil {
        return nil, err
    }
    return io.ReadAll(stream)
}
```

## Namespace-Scoped Keys

For multi-tenant applications, create per-namespace keys:

```bash
kubectl create secret generic tenant-keys \
  --from-file=tenant-a-key=./tenant-a.jwks.json \
  --from-file=tenant-b-key=./tenant-b.jwks.json \
  -n default
```

```python
# Use tenant-specific key
def encrypt_for_tenant(value: str, tenant_id: str) -> bytes:
    with DaprClient() as d:
        encrypted = d.encrypt(
            data=value.encode(),
            options=EncryptOptions(
                component_name="k8s-crypto",
                key_name=f"tenant-keys/{tenant_id}-key",
                key_wrap_algorithm="AES",
            ),
        )
        return encrypted.read()
```

## Limitations vs. Azure Key Vault

Kubernetes Secrets are stored in etcd and should be encrypted at rest using KMS. For production workloads with strict compliance requirements, consider upgrading to Azure Key Vault or HashiCorp Vault. Kubernetes secrets work well for dev and staging environments.

## Summary

Dapr Cryptography with Kubernetes Secrets provides a simple in-cluster key management solution that works without external dependencies. RBAC controls restrict secret access to the Dapr sidecar, and the same Dapr API calls work regardless of whether the backend is Kubernetes Secrets, Azure Key Vault, or local storage.
