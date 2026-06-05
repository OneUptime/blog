# Validation Summary: How to Store and Retrieve Backend Auth Credentials from HashiCorp Vault for

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol exporter
- HashiCorp Vault KV v2
- Vault Agent templates
- Vault Agent Injector for Kubernetes
- Vault Kubernetes auth method
- Kubernetes Deployments
- Vault audit devices

## Sources Consulted
- HashiCorp Vault KV put command: https://developer.hashicorp.com/vault/docs/commands/kv/put
- HashiCorp Vault KV secrets engine paths: https://developer.hashicorp.com/vault/docs/secrets/kv
- HashiCorp Vault Agent templates: https://developer.hashicorp.com/vault/docs/agent/template
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Agent Injector overview and examples: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- HashiCorp Vault Kubernetes auth API: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault audit enable command: https://developer.hashicorp.com/vault/docs/commands/audit/enable
- OpenTelemetry Collector configuration: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector TLS configuration reference: https://opentelemetry.io/docs/collector/configuration/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- OpenTelemetry Collector official releases: https://github.com/open-telemetry/opentelemetry-collector-releases

## Issues Found
- The Vault Agent environment template rendered plain shell variables, but the Deployment starts the Collector as a child process. I changed the rendered lines to `export ...` so the Collector can read them through OpenTelemetry Collector environment substitution.
- The Collector receiver was configured with the backend client certificate and key. OpenTelemetry receiver TLS uses `cert_file` and `key_file` as server-side certificate material, while the post is discussing backend authentication. I removed the receiver TLS block and kept the mTLS files on the exporter.
- The Kubernetes Deployment was missing the required `spec.selector` and matching pod template labels for `apps/v1`. I added a selector and labels.
- The Vault Agent Injector example only rendered the primary backend environment variables even though the Collector config also uses metrics credentials and TLS files. I added metrics variables and injected templates for `client.pem`, `client-key.pem`, and `ca.pem`.
- The container command used `source`, which is not portable for `/bin/sh`. I changed it to the POSIX `.` form and used `exec` for the Collector process.
- The Deployment referenced `/etc/otel/config.yaml` without mounting a configuration volume. I added a `collector-config` ConfigMap volume mount.
- The Collector image tag was pinned to the older `0.96.0` release. I updated it to the current official release tag available during review, `0.153.0`.

## Review Notes
The examples assume the Vault KV engine mounted at `secret/` is KV v2, which matches the `secret/data/...` policy and template paths. Vault Agent re-renders KV v2 static secrets on its static-secret render interval, but the Collector still needs restart or supported config reload behavior before environment-variable changes affect a running process.
