# Validation Summary: How to Configure Private Container Registries in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration `machine.registries`)
- containerd
- Kubernetes (image pull secrets, ServiceAccount patching, CronJob)
- AWS ECR (`aws ecr get-login-password`)
- Google Artifact Registry (`_json_key` auth)
- Azure Container Registry (service principal auth)
- mTLS / x509 client certificates
- `talosctl` CLI

## Sources Consulted
- Talos Linux v1alpha1 configuration reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos pull-through cache / registry guide: https://www.talos.dev/latest/talos-guides/configuration/pull-through-cache/
- Talos source: `RegistryAuthConfig`, `RegistryMirrorConfig`, `RegistryTLSConfig` (verified `auth.username`, `auth.password`, `mirrors.endpoints`, `tls.ca`, `tls.clientIdentity.crt`, `tls.clientIdentity.key`)
- talosctl CLI source (`cmd/talosctl/cmd/talos/logs.go`) and docs — verified `talosctl logs <service>` with global `--nodes` flag, and `talosctl apply-config --nodes --file`
- AWS ECR docs — confirmed authentication tokens are valid for 12 hours
- Google Artifact Registry docs — confirmed `_json_key` username for JSON service-account key auth
- Microsoft ACR docs — confirmed service principal app ID / password for `docker login`-style auth
- POSIX cron(5) syntax for verifying CronJob schedule expression

## Issues Found
- **CronJob schedule was wrong.** The example used `schedule: "*/6 * * * *"` with the comment "Every 6 hours". `*/6` in the first field means *every 6 minutes*, not every 6 hours, which would have caused the token-refresh job to run 10× per hour and rapidly delete/recreate the secret. Changed to `schedule: "0 */6 * * *"` (every 6 hours at minute 0), which matches the comment and the stated intent of refreshing the 12-hour ECR token well before expiry.

## Review Notes
- All Talos config field names (`machine.registries.config.<host>.auth.{username,password}`, `mirrors.<host>.endpoints`, `tls.ca`, `tls.clientIdentity.{crt,key}`) match the current v1alpha1 schema.
- All `talosctl` invocations are correct.
- Cloud provider auth patterns (ECR token rotation, GCP `_json_key`, ACR service principal) are all accurate.
- Minor cosmetic note (not fixed, not an error): the ECR YAML block has the two leading `#` comments separated by a blank line, which renders oddly but is valid YAML.
- The post does not mention that Talos `tls.ca` is expected to be base64-encoded when written via the API in some contexts; the multi-line PEM-with-`|` form shown is accepted and gets encoded by Talos. Worth noting in a future revision but not incorrect as written.
