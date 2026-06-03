# Validation Summary: How to use Vault AppRole auth method for CI/CD secret access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HashiCorp Vault AppRole auth method
- Vault CLI and HTTP API
- Vault ACL policies
- Vault response wrapping and audit logging
- Vault dynamic database credentials
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- Go with the HashiCorp Vault API client

## Sources Consulted
- HashiCorp Vault AppRole documentation: https://developer.hashicorp.com/vault/docs/auth/approle
- HashiCorp Vault AppRole HTTP API documentation: https://developer.hashicorp.com/vault/api-docs/auth/approle
- HashiCorp Vault AppRole best practices: https://developer.hashicorp.com/vault/docs/auth/approle/approle-pattern
- HashiCorp Vault policy documentation: https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault `kv get` command documentation: https://developer.hashicorp.com/vault/docs/commands/kv/get
- HashiCorp Vault `unwrap` command documentation: https://developer.hashicorp.com/vault/docs/commands/unwrap
- HashiCorp Vault audit logging documentation: https://developer.hashicorp.com/vault/docs/audit
- GitHub Actions workflow command documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub `actions/checkout` documentation: https://github.com/actions/checkout
- GitLab CI `rules` documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab CI YAML syntax documentation: https://docs.gitlab.com/ci/yaml/
- Jenkins Pipeline syntax documentation: https://www.jenkins.io/doc/book/pipeline/syntax/

## Issues Found
- The introduction described both RoleIDs and SecretIDs as short-lived. Vault RoleIDs are fixed identifiers by default, while SecretIDs and issued tokens can be short-lived. Updated the wording to distinguish RoleID from short-lived SecretID and tokens.
- The sample Vault policy granted read access and then added a broader `deny` rule for `secret/data/*`. Vault `deny` capabilities take precedence, so that rule would block the earlier read grants. Removed the broad deny stanza and clarified that no write capabilities are granted.
- The Go sample imported `github.com/hashicorp/vault/api` without an alias but called it as `vault.NewClient`, which would not compile. Added the `vault` import alias.
- The Go sample used undefined helper functions. Added minimal `validateToken` and `getVaultToken` helpers based on environment variables so the example is complete.
- The Go sample ignored JSON decoding and Vault client creation errors. Added error handling for both.
- The Go sample sent AppRole SecretID metadata as a map, but the AppRole API expects metadata as a JSON-formatted string. Updated the sample to marshal metadata and pass it as a string.
- The GitHub Actions example used `actions/checkout@v3`, which is no longer the current documented major version. Updated it to `actions/checkout@v6`.
- The GitLab CI example used deprecated `only`. Replaced it with `rules` using `$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH`.
- The GitLab CI dynamic database credential example read only the password and did not preserve the username from the same lease. Updated it to read the database credential once as JSON and extract both username and password from that single response.
- The Jenkins example read dynamic database username and password with two separate `vault read` calls, which can create two different credential leases. Updated it to read once and write username/password from the same response.
- The audit-log failed-login filter used `.error != ""`, which also matches `null`. Updated it to `(.error // "") != ""`.

## Review Notes
- The examples assume `jq`, `curl`, Vault CLI, and Jenkins Pipeline Utility Steps are available where used.
- GitLab's built-in Vault secrets integration now commonly uses ID tokens/JWT, but the AppRole flow shown remains technically valid when a separate SecretID issuer is used.
- Vault audit logs HMAC most string values by default, so role IDs and some fields may appear hashed unless audit tuning is configured.
