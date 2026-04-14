# How to Implement Secret Rotation Strategies with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Secret, Rotation, Vault

Description: Learn how to implement secret rotation strategies with Dapr so credentials are automatically refreshed without service restarts or downtime.

---

Rotating secrets regularly limits the blast radius if credentials are compromised. Dapr fetches secrets from secret stores at runtime, but the timing of cache refresh and component reload needs careful consideration for zero-downtime rotation.

## How Dapr Fetches Secrets

Dapr does not cache secrets in the sidecar. Each call to the Secrets API fetches the value directly from the backing secret store. When a secret is rotated, any application code that re-fetches the secret via the Dapr API will get the new value immediately. However, applications that read secrets only at startup need a restart to pick up rotated values.

## Configure Secret Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-store
  namespace: default
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault:8200"
  - name: vaultToken
    value: "s.XXXXXXXX"
  - name: enginePath
    value: "secret"
  - name: vaultKVUsePrefix
    value: "false"
```

## Strategy 1: Rolling Update After Rotation

Rotate the secret in the store, then trigger a rolling restart:

```bash
#!/bin/bash
# Step 1: Rotate the secret in Vault
vault kv put secret/redis password="new-password-$(date +%s)"

# Step 2: Verify the new secret is in Vault
vault kv get secret/redis

# Step 3: Trigger rolling restart so sidecars reload secrets
kubectl rollout restart deployment/order-service
kubectl rollout status deployment/order-service --timeout=5m

echo "Secret rotation complete - new pods use new credentials"
```

## Strategy 2: Dual-Write During Rotation

Use a dual-write approach for zero-downtime rotation:

```bash
#!/bin/bash
SECRET_NAME="db-password"
NEW_VALUE="rotated-$(openssl rand -hex 16)"
OLD_VALUE=$(vault kv get -field=current secret/$SECRET_NAME)

# Step 1: Write new secret alongside old one
vault kv put secret/$SECRET_NAME \
  current="$NEW_VALUE" \
  previous="$OLD_VALUE"

# Step 2: Update database to accept both passwords temporarily
# (Application reads 'current' but DB accepts both during transition)

# Step 3: Rolling restart to pick up new current value
kubectl rollout restart deployment/api-service

# Step 4: After all pods restarted, invalidate old password
vault kv put secret/$SECRET_NAME current="$NEW_VALUE"
```

## Strategy 3: Application-Level Secret Refresh

Implement periodic secret refresh in your application:

```python
import threading
import time
import requests

class SecretManager:
    def __init__(self, dapr_port: int = 3500, refresh_interval: int = 300):
        self._secrets = {}
        self._lock = threading.Lock()
        self._dapr_port = dapr_port
        self._refresh_interval = refresh_interval
        self._start_refresh_loop()

    def _fetch_secret(self, secret_name: str) -> str:
        resp = requests.get(
            f"http://localhost:{self._dapr_port}/v1.0/secrets/vault-store/{secret_name}"
        )
        resp.raise_for_status()
        return resp.json().get(secret_name, "")

    def _start_refresh_loop(self):
        def refresh():
            while True:
                time.sleep(self._refresh_interval)
                with self._lock:
                    for name in list(self._secrets.keys()):
                        self._secrets[name] = self._fetch_secret(name)
                        print(f"Refreshed secret: {name}")
        thread = threading.Thread(target=refresh, daemon=True)
        thread.start()

    def get(self, secret_name: str) -> str:
        with self._lock:
            if secret_name not in self._secrets:
                self._secrets[secret_name] = self._fetch_secret(secret_name)
            return self._secrets[secret_name]

secret_manager = SecretManager(refresh_interval=300)
```

## Automate Rotation with a CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: secret-rotator
  namespace: default
spec:
  schedule: "0 2 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: secret-rotator
          initContainers:
          - name: rotate-secret
            image: hashicorp/vault:latest
            command:
            - /bin/sh
            - -c
            - |
              vault kv put secret/db-password \
                value="$(openssl rand -hex 32)"
          containers:
          - name: restart-deployment
            image: bitnami/kubectl:latest
            command:
            - kubectl
            - rollout
            - restart
            - deployment/api-service
          restartPolicy: OnFailure
```

## Summary

Secret rotation with Dapr involves updating the secret in the backing store and ensuring sidecars pick up the new value. The simplest approach is a rolling deployment restart after rotation. For zero-downtime rotation, use dual-write patterns that maintain both old and new credentials temporarily. Automate rotation with CronJobs and monitor for rotation failures with alerting.
