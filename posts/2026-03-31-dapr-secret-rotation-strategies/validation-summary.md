# Validation Summary: How to Implement Secret Rotation Strategies with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (secret store building block, Secrets API)
- HashiCorp Vault (KV secrets engine)
- Kubernetes (Deployments, CronJobs, rolling restarts)
- Python (application-level secret refresh pattern)
- Bash scripting

## Sources Consulted
- Dapr HashiCorp Vault secret store component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Secrets overview: https://docs.dapr.io/developing-applications/building-blocks/secrets/secrets-overview/
- Dapr components-contrib source code (vault.go) for caching behavior verification
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- HashiCorp Vault Docker image (hashicorp/vault): https://hub.docker.com/r/hashicorp/vault
- HashiCorp docker-vault Dockerfile: https://github.com/hashicorp/docker-vault

## Issues Found

1. **Incorrect claim that Dapr sidecars cache secrets**: The "How Dapr Fetches Secrets" section stated that "Dapr sidecars cache secrets to reduce load on secret stores" and referenced cache refresh intervals. This is incorrect — Dapr does not cache secrets in the sidecar. Each call to the Secrets API fetches directly from the backing store. Fixed the explanation to accurately describe Dapr's fetch-on-request behavior.

2. **Misleading section heading "Configure Secret Store with Refresh Interval"**: The YAML shown is a standard Vault component configuration with no refresh interval setting (Dapr secret stores do not support refresh intervals). Renamed the heading to "Configure Secret Store Component."

3. **Undefined `$OLD_VALUE` variable in Strategy 2**: The dual-write script used `$OLD_VALUE` without defining it, which would result in an empty value being written as the `previous` field. Added a `vault kv get -field=current` command to fetch the existing secret value before writing.

4. **CronJob image missing `kubectl`**: The CronJob used `hashicorp/vault:latest` as the container image but ran both `vault` and `kubectl` commands. The `hashicorp/vault` image does not include `kubectl`, so the rollout restart would fail with "command not found." Restructured the CronJob to use an initContainer with the Vault image for secret rotation and a main container with `bitnami/kubectl` for the deployment restart.

## Review Notes
- The Vault component YAML uses a hardcoded `vaultToken` value. In production, `vaultTokenMountPath` (reading the token from a file mounted via Kubernetes secret) is preferred over embedding the token in the component spec. This is acceptable for a tutorial but worth noting.
- The Python `SecretManager._fetch_secret` method uses `resp.json().get(secret_name, "")` to extract the secret value. The Dapr Secrets API response format varies by store type — for Vault with the default `map` value type, the response keys are the keys within the secret path, not necessarily the path name. This works when secrets are stored with a key matching the path name but may not generalize to all Vault secret structures.
- The CronJob's `serviceAccountName: secret-rotator` assumes a pre-configured service account with RBAC permissions to restart deployments — readers should ensure this is set up.
