# How to Use GitLab CI with HashiCorp Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitLab CI, HashiCorp Vault, Secrets, Security, CI/CD

Description: Learn how to fetch secrets from HashiCorp Vault in GitLab CI using JWT auth, short-lived tokens, and secure job templates.

---

Storing secrets in CI variables can be risky for large teams. HashiCorp Vault gives you centralized secret management with short-lived access. GitLab CI can authenticate to Vault and retrieve secrets at job runtime.

## Step 1: Enable JWT Auth in Vault

Configure Vault to trust GitLab as an identity provider. This allows GitLab jobs to exchange a JWT for a Vault token.

## Step 2: Define a Vault Role

Create a Vault role that allows access to specific secrets:

```bash
vault write auth/jwt/role/gitlab-ci \
  role_type=jwt \
  bound_audiences="https://gitlab.example.com" \
  user_claim="sub" \
  policies="ci-read" \
  ttl="15m"
```

## Step 3: Fetch Secrets in GitLab CI

Use the GitLab JWT to authenticate and fetch secrets at runtime.

```yaml
variables:
  VAULT_ADDR: "https://vault.example.com"

fetch-secrets:
  stage: build
  image: hashicorp/vault:latest
  script:
    - vault login -method=jwt role=gitlab-ci jwt=$CI_JOB_JWT
    - vault kv get -field=DATABASE_URL secret/data/app
```

## Step 4: Avoid Storing Secrets in Logs

- Use `set +x` for shell commands
- Avoid printing secret values
- Use masked GitLab variables when needed

## Best Practices

- Use short TTL tokens and least-privilege policies
- Scope access by project or environment
- Rotate secrets regularly

## Conclusion

GitLab CI plus Vault gives you short-lived, audited access to secrets. It is safer than static CI variables and scales well in regulated environments.
