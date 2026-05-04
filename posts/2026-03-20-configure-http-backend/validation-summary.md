# Validation Summary: How to Configure the HTTP Backend in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (HTTP backend)
- Terraform (compatible HTTP backend protocol)
- HCL (backend configuration syntax)
- GitLab Managed Terraform State (HTTP-compatible backend)
- Python / Flask (example state server implementation)
- TLS / mTLS (client certificate authentication)
- HTTP Basic Authentication

## Sources Consulted
- OpenTofu HTTP backend documentation: https://opentofu.org/docs/language/settings/backends/http/
- GitLab Managed Terraform State documentation (URL/method conventions for the GitLab-hosted endpoint)
- HTTP status code references for the lock-contested response (`423 Locked`)

## Issues Found
- **"Custom Header (API Key)" section was outdated.** The post claimed the HTTP backend "doesn't natively support custom headers" and proposed embedding credentials in the URL as a workaround. OpenTofu's HTTP backend supports a `headers` argument — a map of additional headers sent with every request to the backend. I replaced the workaround with a correct `headers = {...}` example that uses the supported argument. The bash code-fence (which actually contained HCL) was also corrected to `hcl`.

## Review Notes
- All other backend arguments referenced in the post are accurate against the current OpenTofu HTTP backend documentation: `address`, `lock_address`, `unlock_address`, `lock_method` (default `LOCK`), `unlock_method` (default `UNLOCK`), `username`, `password`, `client_certificate_pem`, `client_private_key_pem`, `client_ca_certificate_pem`, `skip_cert_verification`, `retry_max`, `retry_wait_min`, `retry_wait_max`.
- Environment variables `TF_HTTP_USERNAME` and `TF_HTTP_PASSWORD` are correct.
- The GitLab section correctly uses the same `/lock` URL for both lock and unlock, with `lock_method = "POST"` and `unlock_method = "DELETE"`, matching GitLab's API.
- The Flask example uses the correct `423 Locked` status code for a held-lock response and registers Flask routes for the non-standard `LOCK`/`UNLOCK` methods, which Flask/Werkzeug accepts.
- The `ssl_context='adhoc'` shortcut in the Flask example requires `pyOpenSSL` (or `cryptography`) to be installed; this is standard Flask behavior and not strictly an error, but worth noting for readers who copy-paste.
- The TLS section sets `skip_cert_verification = false` (the safe default) with a comment that reads as if the option were being enabled. Technically correct (the value matches the comment's "never in production!" advice), but the wording could be clearer in a future revision.
- The post does not document `update_method` (default `POST`), but it doesn't need to — the focus is on lock/unlock behavior. Not an error.
