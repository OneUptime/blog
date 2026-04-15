# How to Debug Dapr Cryptography Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cryptography, Debugging, Troubleshooting, Error Handling, Security

Description: Learn how to diagnose and resolve common Dapr Cryptography issues including key not found errors, authentication failures, component misconfiguration, and ciphertext corruption.

---

## Common Dapr Cryptography Issues

Debugging cryptography issues requires understanding the chain: application request -> Dapr sidecar -> key provider -> cryptographic operation. Failures can occur at any stage, and each has distinct error patterns.

## Enabling Debug Logging

Start the Dapr sidecar with debug logging to see detailed cryptography operation traces:

```bash
dapr run \
  --app-id my-app \
  --log-level debug \
  --resources-path ./components \
  -- python app.py
```

In Kubernetes:

```yaml
annotations:
  dapr.io/log-level: "debug"
```

Look for log lines containing `crypto` in the output.

## Issue 1: Component Not Found

**Error:** `component 'my-crypto' not found`

**Cause:** The component name in your code does not match the component YAML metadata name, or the component file is not in the resources path.

**Debug:**

```bash
# List loaded components
curl http://localhost:3500/v1.0/metadata | jq '.components'

# Check that your crypto component appears
curl http://localhost:3500/v1.0/metadata | jq '.components[] | select(.type | startswith("crypto"))'
```

**Fix:**

```yaml
# Ensure this matches the name used in your code
metadata:
  name: my-crypto   # Must match componentName in API calls
spec:
  type: crypto.dapr.localstorage
```

## Issue 2: Key Not Found

**Error:** `key 'my-key' not found in component`

**Cause:** The key name does not match the file name (local storage) or the key does not exist in the vault.

**Debug for local storage:**

```bash
# List available keys (file names without .json extension are key names)
ls ./keys/
# my-key.json  -> keyName: "my-key"
# data-key.json -> keyName: "data-key"
```

**Debug for Azure Key Vault:**

```bash
az keyvault key list --vault-name my-vault --query "[].name"
```

**Debug for Kubernetes secrets:**

```bash
kubectl get secret crypto-keys -o jsonpath='{.data}' | jq 'keys'
# Key name format: "secret-name/key-name-in-secret"
```

## Issue 3: Authentication Failed

**Error:** `AADSTS70011: The provided value for the input parameter 'scope' is not valid`

**Cause:** The managed identity or service principal does not have permission to access the key vault.

**Debug:**

```bash
# Test Key Vault access from within the pod
kubectl exec -it <pod> -- curl \
  "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2019-06-01&resource=https://vault.azure.net" \
  -H "Metadata: true"

# Check Key Vault access policy
az keyvault show --name my-vault --query "properties.accessPolicies"
```

**Fix:**

```bash
az keyvault set-policy \
  --name my-vault \
  --object-id <managed-identity-object-id> \
  --key-permissions get encrypt decrypt wrapKey unwrapKey
```

## Issue 4: Invalid Key Format

**Error:** `invalid key format: expected JWK`

**Cause:** The key file is not valid JWK JSON.

**Debug:**

```bash
# Validate JWK format
python3 -c "
import json
with open('./keys/my-key.json') as f:
    data = json.load(f)
print('kty:', data.get('kty'))
print('kid:', data.get('kid'))
print('use:', data.get('use'))
"
```

**Fix:** Ensure the key file has the required JWK fields:

```json
{
  "kty": "RSA",
  "kid": "my-key",
  "use": "enc",
  "alg": "RSA-OAEP-256",
  "n": "...",
  "e": "AQAB",
  "d": "..."
}
```

## Issue 5: Ciphertext Corruption

**Error:** `authentication tag verification failed` or `cipher: message authentication failed`

**Cause:** The ciphertext was corrupted, truncated, or modified after encryption. Also occurs if you try to decrypt data with the wrong key.

**Debug:**

```python
import base64

# Check ciphertext is intact
ciphertext_b64 = "..."  # from your database
try:
    ciphertext = base64.b64decode(ciphertext_b64)
    print(f"Ciphertext length: {len(ciphertext)} bytes")
    # A valid Dapr AES-GCM ciphertext is at least 28 bytes (12 nonce + 16 tag)
    if len(ciphertext) < 28:
        print("ERROR: Ciphertext too short - data was truncated")
except Exception as e:
    print(f"ERROR: Invalid base64: {e}")
```

## Issue 6: Wrong Algorithm Specified

**Error:** `key algorithm mismatch`

**Cause:** The key supports a different algorithm than what was specified in the encrypt request.

```python
# Correct: match algorithm to key type
# AES key -> keyWrapAlgorithm: "A256KW"
# RSA key -> keyWrapAlgorithm: "RSA-OAEP-256"
options = {
    "componentName": "my-crypto",
    "keyName": "rsa-key",
    "keyWrapAlgorithm": "RSA-OAEP-256"  # Must match key type
}
```

## Healthcheck for Crypto Component

```bash
# Test the crypto component with a simple encrypt/decrypt round-trip
ENCRYPTED=$(curl -s -X POST http://localhost:3500/v1.0-alpha1/crypto/my-crypto/encrypt \
  -H "Content-Type: application/octet-stream" \
  -H "dapr-key-name: my-key" \
  -H "dapr-key-wrap-algorithm: A256KW" \
  --data-binary "healthcheck" | base64)

echo $ENCRYPTED | base64 -d | curl -s -X POST \
  http://localhost:3500/v1.0-alpha1/crypto/my-crypto/decrypt \
  -H "Content-Type: application/octet-stream" \
  -H "dapr-key-name: my-key" \
  --data-binary @-
# Should print: healthcheck
```

## Summary

Debugging Dapr Cryptography issues follows a layered approach: verify the component loads correctly, confirm the key exists and is accessible, check authentication permissions, validate key file format, and test ciphertext integrity. Enabling debug logging and using the metadata API to list loaded components quickly narrows down most configuration problems.
