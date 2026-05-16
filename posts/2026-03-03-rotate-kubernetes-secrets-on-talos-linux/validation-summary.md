# Validation Summary: How to Rotate Kubernetes Secrets on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (talosctl, machine config secrets, kubelet certificate rotation)
- Kubernetes (Secrets, Deployments, CronJobs, ServiceAccount, RBAC)
- kubectl
- External Secrets Operator (ESO)
- AWS Secrets Manager
- cert-manager
- MySQL 8.0+ dual-password rotation
- Bash, openssl, jq

## Sources Consulted
- Kubernetes Secrets documentation — https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes CronJob GA in 1.21 — https://kubernetes.io/blog/2021/04/09/kubernetes-release-1.21-cronjob-ga/
- cert-manager Certificate resource — https://cert-manager.io/docs/usage/certificate/
- External Secrets Operator deprecation policy — https://external-secrets.io/latest/introduction/deprecation-policy/
- Talos CA rotation guide (v1.10) — https://docs.siderolabs.com/talos/v1.10/security/ca-rotation
- Talos talosctl reference — https://docs.siderolabs.com/talos/v1.10/reference/cli
- Talos certificate management — https://www.talos.dev/v1.10/talos-guides/howto/cert-management/
- MySQL 8.0 password management — https://dev.mysql.com/doc/refman/8.0/en/password-management.html
- PostgreSQL ALTER ROLE — https://www.postgresql.org/docs/current/sql-alterrole.html
- "Why Kubernetes secrets take so long to update" — https://ahmet.im/blog/kubernetes-secret-volumes-delay/

## Issues Found

1. **Dual-Password Rotation Pattern used PostgreSQL incorrectly.** The original example issued `ALTER USER ... WITH PASSWORD` against PostgreSQL and claimed "the database accepts both passwords during the transition." Standard PostgreSQL has no native dual-password capability — `ALTER USER ... WITH PASSWORD` replaces the existing password immediately. Rewrote the example to use MySQL 8.0.14+, which does support this pattern via the `RETAIN CURRENT PASSWORD` and `DISCARD OLD PASSWORD` clauses, and added a short note explaining why PostgreSQL needs a different approach (create a second role, migrate, then drop the old role).

2. **cert-manager `duration` / `renewBefore` values used invalid units.** The original `duration: 90d` and `renewBefore: 30d` would be rejected by the API. cert-manager parses these fields with Go's `time.ParseDuration`, which only accepts `ns`, `us`, `ms`, `s`, `m`, `h` — no `d`. Updated to `duration: 2160h` and `renewBefore: 720h` (with inline comments noting the equivalent days) to match the official cert-manager docs.

3. **Talos secrets rotation example used the wrong subcommand.** The original `talosctl gen secrets --from-controlplane-config controlplane.yaml > new-secrets.yaml` does the opposite of what the comment claimed — it *extracts* existing secrets from a controlplane config to recover a secrets bundle, it does not generate new ones. The correct command to rotate Talos CAs in place is `talosctl rotate-ca` with `--talos` / `--kubernetes` flags. Replaced the example with the official dry-run-first pattern from the Talos docs and added a note that root CAs have a 10-year default lifetime so this is typically only needed on suspected compromise.

## Review Notes

- The `external-secrets.io/v1beta1` API version is still functional in current ESO releases but has been deprecated in favor of `external-secrets.io/v1`; v1beta1 is scheduled for removal in v0.17.0. Left as-is since it remains valid in the deployed versions most readers will be running, but readers on the newest ESO should prefer `v1`.
- The "Kubelet certificate rotation" bullet is accurate for client certs (auto-rotated). Kubelet *serving* certificate rotation also requires an external CSR-approver controller, but the post only claims rotation is "enabled by default," which is correct at the kubelet flag level.
- The `secret-monitor` ServiceAccount referenced in the monitoring CronJob is not defined with accompanying RBAC in the post. Not technically incorrect (readers can model it on the earlier `secret-rotator` RBAC), but worth a future cleanup.
- The kubelet-volume sync estimate of "1–2 minutes" is a reasonable rule-of-thumb (default `syncFrequency` is 60s with jitter, plus cache propagation).
