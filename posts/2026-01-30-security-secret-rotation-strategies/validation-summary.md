# Validation Summary: How to Create Secret Rotation Strategies

## Status
validated

## Post Type
Tutorial / Guide (covers the dual-credential rotation pattern with concrete code examples for databases, API keys, certificates, and Vault dynamic secrets, plus Kubernetes automation)

## Technologies Covered
- PostgreSQL (role/password management, `pg_roles`, `DO` blocks, default privileges)
- MySQL (`CREATE USER IF NOT EXISTS`, `ALTER USER`, `GRANT`)
- Node.js `pg` (node-postgres) connection pooling
- Python (boto3 / AWS Secrets Manager, `requests`)
- Stripe REST API (used as an illustrative provider example)
- SendGrid (Twilio) v3 API key endpoints
- cert-manager (`ClusterIssuer`, `Certificate`, ACME HTTP-01) on Kubernetes
- Let's Encrypt ACMEv2 directory
- OpenSSL (ECDSA P-256 key generation, CSR, x509 signing, `s_client`)
- HashiCorp Vault (database secrets engine, Vault Agent, Vault Agent Injector annotations, HCL configuration, consul-template syntax)
- Kubernetes (`CronJob` `batch/v1`, `Deployment`, `Secret`, RBAC `Role`/`RoleBinding`, `kubectl patch`/`rollout`)
- Bash scripting (`set -euo pipefail`, heredocs, parameter expansion)

## Sources Consulted
- Stripe API docs - API keys & restricted keys: https://docs.stripe.com/keys , https://docs.stripe.com/keys/restricted-api-keys
- Stripe Managed API Keys: https://docs.stripe.com/keys/managed-api-keys
- Stripe Ephemeral Keys API: https://docs.stripe.com/api/ephemeral_keys
- SendGrid API Keys reference: https://www.twilio.com/docs/sendgrid/api-reference/api-keys
- SendGrid API key permissions / scopes: https://www.twilio.com/docs/sendgrid/api-reference/api-key-permissions
- SendGrid users API (`/v3/user/profile`): https://www.twilio.com/docs/sendgrid/api-reference/users-api/get-a-users-profile
- cert-manager Certificate usage docs: https://cert-manager.io/docs/usage/certificate/
- cert-manager HTTP-01 solver docs: https://cert-manager.io/docs/configuration/acme/http01/
- HashiCorp Vault Agent template docs: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/platform/k8s/injector/annotations
- HashiCorp Vault database secrets engine (PostgreSQL plugin) docs
- PostgreSQL `CREATE ROLE` / `ALTER ROLE` / `ALTER DEFAULT PRIVILEGES` reference
- node-postgres `Pool` configuration docs (https://node-postgres.com/apis/pool)
- Kubernetes API reference for `batch/v1` CronJob and Vault Agent sidecar injection

## Issues Found
1. **Invalid SendGrid scope.** The `SendGridAPIKeyProvider.create_key` call requested `"scopes": ["mail.send", "sender_verification_eligible"]`. `sender_verification_eligible` is not a valid SendGrid scope and would cause the create-key request to fail. Removed it; left the valid `mail.send` scope.
2. **Stripe restricted-key API does not exist publicly.** The `StripeAPIKeyProvider` posted to `POST /v1/api_keys` with `permissions[...]` parameters and called `DELETE /v1/api_keys/{id}`. Stripe does not expose a public REST endpoint for creating or revoking restricted API keys — restricted keys are managed in the Dashboard. The code as written would 404. Rather than restructure the post, added a prominent docstring + inline comment to `StripeAPIKeyProvider` clarifying that this is illustrative pseudo-code showing the provider interface and pointing readers to the Dashboard (or Stripe's AWS Secrets Manager rotation integration) as the actual rotation path.
3. **Misleading Vault Agent template comment.** The comment above `error_on_missing_key = true` said "Re-render when credentials are about to expire", which misrepresents what the flag does. Per Vault docs, this flag controls whether templating errors on missing struct/map keys; credential renewal is driven by the lease duration, not this flag. Rewrote the comment to describe the flag accurately and noted that renewal is automatic.

## Review Notes
- **cert-manager `ingress.class: nginx`** still works in v1.14, but the modern, recommended field for nginx is `ingressClassName`. Not changed — it's not technically incorrect, just stylistically legacy.
- **cert-manager `privateKey.rotationPolicy: Always`** is correct for v1.14; it became the default in v1.18.
- **`SELECT FROM pg_roles WHERE rolname = ...`** (empty target list) is valid in modern PostgreSQL; left as-is.
- **`MYSQL_PWD` environment variable** is supported but discouraged by MySQL documentation in favor of `mysql_config_editor` / option files. Acceptable in an automated rotation script context.
- **`vault.hashicorp.com/agent-pre-populate-only: "false"`** is the default; including it explicitly is harmless and serves as documentation, though it doesn't "enable" renewal so much as keep the renewing sidecar.
- **Password generation via `openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32`** assumes enough alphanumeric chars survive `tr`; with 32 raw bytes (~44 base64 chars) this is essentially always true, but in theory could yield a shorter string. Acceptable.
- **SQL injection surface** in the PostgreSQL heredoc: usernames/passwords are interpolated into SQL without escaping. Safe given that they are generated by `openssl rand` and a fixed `app_user_${slot}` pattern, but worth noting that adapting this script to user-supplied inputs would require proper quoting/escaping.
- **node-postgres `Pool.end()`** waits for in-flight queries to drain, so the explicit 10s grace period before calling it is belt-and-suspenders but harmless.
- **`kubectl rollout restart`** in `rotate-client-cert.sh` is fine, but with credential hot-reload already implemented elsewhere in the post, restarting pods for mTLS rotation is a slightly different pattern than the dual-credential approach the post promotes for DB credentials. Not an error, just a stylistic inconsistency.
