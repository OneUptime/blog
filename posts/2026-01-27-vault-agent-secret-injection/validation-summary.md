# Validation Summary: How to Use Vault Agent for Secret Injection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault Agent
- HashiCorp Vault (server, auth methods, KV v2, dynamic database secrets, PKI)
- consul-template (Vault Agent's template engine)
- Kubernetes (Deployments, ServiceAccounts, Secrets, annotations)
- Vault Agent Injector (mutating admission webhook)
- Helm (hashicorp/vault chart)
- AWS IAM auth method
- AppRole auth method
- Kubernetes auth method
- Systemd
- Docker / Docker Compose
- Python (`hvac` client)
- HCL configuration

## Sources Consulted
- HashiCorp Vault Agent overview: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent
- Vault Agent templates: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template
- Vault Agent auto-auth: https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth
- Vault Agent file sink: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/sinks/file
- Vault Agent persistent cache (Kubernetes): https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/caching/persistent-caches/kubernetes-persistent-cache
- Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/platform/k8s/injector/annotations
- Vault Kubernetes auth: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- Vault AppRole auth: https://developer.hashicorp.com/vault/docs/auth/approle
- Vault AWS auth: https://developer.hashicorp.com/vault/docs/auth/aws
- consul-template templating language: https://github.com/hashicorp/consul-template/blob/main/docs/templating-language.md
- consul-template source (`dependency/vault_pki.go`, `template/funcs.go`)
- hvac Python client documentation: https://hvac.readthedocs.io/
- Kubernetes ServiceAccount token Secret docs (kubernetes.io/service-account-token, 1.24+ changes)

## Issues Found

1. **`pkiCert` template referenced `{{ .Cert.NotAfter }}`** (PKI Certificate Template section).
   - The `pkiCert` function in consul-template returns a `PemEncoded` struct whose `Cert`, `Key`, and `CA` fields are plain PEM strings. There is no `NotAfter` accessor; the template would fail at execution with `can't evaluate field NotAfter in type string`.
   - **Fix:** Replaced `# Certificate (valid until {{ .Cert.NotAfter }})` with `# Certificate (PEM)`.

2. **`slice "stripe" "twilio" "sendgrid"`** used to construct a literal list for iteration (Loop Through Multiple Secrets section).
   - Go template's built-in `slice` slices an existing array/slice/string by indices; it does not combine variadic strings into a new list. consul-template does not document `slice`, `tuple`, or `list` for this purpose. The original snippet would fail at template execution.
   - **Fix:** Replaced with the documented `split` helper (which takes separator first, input string second per `consul-template/template/funcs.go`): `{{- $services := split "," "stripe,twilio,sendgrid" -}}` and `range` over `$services`.

## Review Notes

- HCL `mode = 0644` on the `sink "file"` block is accepted by Vault Agent's HCL parser (interpreted as octal); the value is consistent with HashiCorp's own examples.
- `persist "kubernetes" { ... }` (labeled-block form) inside `cache {}` is the documented syntax for Kubernetes-backed persistent caches; the unlabeled `persist = { type = "kubernetes", ... }` form is equivalent.
- The cache listener `127.0.0.1:8200` uses the same port number as the default Vault server (8200) — it's the local agent listener, so there's no actual collision when the Vault server is remote, but some readers may find the choice confusing. Many official examples use 8100 or 8007 to avoid this. Not corrected, since both work.
- `version: "3.8"` in `docker-compose.yaml` is accepted but deprecated in Compose Spec; left as-is.
- The Python hvac call `client.secrets.kv.v2.read_secret_version(path=..., mount_point=...)` will, in hvac 2.x, emit a `DeprecationWarning` about the `raise_on_deleted_version` argument default. The call still works; not a blocker.
- The Kubernetes 1.24+ note about creating a long-lived `kubernetes.io/service-account-token` Secret is accurate (auto-generated SA token Secrets were removed in 1.24).
- The Documentation URL in the systemd unit (`https://www.vaultproject.io/docs/agent`) currently redirects to `developer.hashicorp.com`. Left unchanged as a non-issue.
- `import os` is unused in the Python example. Stylistic only.
