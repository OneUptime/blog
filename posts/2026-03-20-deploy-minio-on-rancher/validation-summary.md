# Validation Summary: How to Deploy Minio on Rancher

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- MinIO (distributed object storage, S3-compatible)
- Rancher / Kubernetes
- Helm (MinIO official chart at https://charts.min.io/)
- `mc` (MinIO Client) — admin, anonymous, and ILM commands
- NGINX Ingress + cert-manager (Let's Encrypt)
- Longhorn (storage class for persistent volumes)
- Erasure coding (EC:N parity scheme)

## Sources Consulted
- [MinIO Erasure Coding (AIStor docs)](https://docs.min.io/enterprise/aistor-object-store/operations/core-concepts/erasure-coding/)
- [`mc ilm rule add` reference](https://docs.min.io/enterprise/aistor-object-store/reference/cli/mc-ilm-rule/mc-ilm-rule-add/)
- [`mc admin heal` reference](https://docs.min.io/enterprise/aistor-object-store/reference/cli/admin/mc-admin-heal/)
- [`mc anonymous set` reference](https://docs.min.io/enterprise/aistor-object-store/reference/cli/mc-anonymous/mc-anonymous-set/)
- [minio/docs PR #597 — rename `mc policy` -> `mc anonymous`](https://github.com/minio/docs/pull/597)
- [MinIO Helm chart (charts.min.io / minio/minio repo)](https://github.com/minio/minio/tree/master/helm/minio)

## Issues Found
1. **Incorrect erasure-coding parity claim.** The post described an 8-drive distributed deployment as "4+2 (4 data, 2 parity), can lose 2 nodes." MinIO's default with 8 drives in an erasure set is EC:4 — 4 data + 4 parity, tolerating loss of up to 4 drives. Updated the comment block in `minio-values.yaml` to reflect the actual default (EC:4, 4+4, up to 4 drive failures).

2. **Invalid/misleading `mc admin heal` usage.** The post ran `mc admin heal --all local/` under the comment "View erasure set configuration." `--all` is not a valid flag (the correct one is `--all-drives` / `-a`), `mc admin heal` is deprecated in favor of MinIO's automatic healing, and in any case it heals data rather than displaying erasure set layout. Replaced with `mc admin info --json local/`, which actually surfaces server/pool/erasure-set details.

3. **Deprecated `mc policy set` syntax.** `mc policy set download …` was renamed to `mc anonymous set download …`; the old form prints a deprecation warning. Updated the command and its surrounding comment.

4. **Wrong flag name on the lifecycle rule.** The post used `--expiry-days "90"` for `mc ilm rule add`. The current flag is `--expire-days` (no quotes needed for the integer). Updated accordingly.

## Review Notes
- The Helm values shown (`mode`, `replicas`, `drivesPerNode`, `persistence`, `resources`, `rootUser`, `rootPassword`, `ingress`, `consoleIngress`) match the official MinIO chart's value names.
- `rootPassword: "securepassword"` is fine as a placeholder, but readers should be reminded (out of band or in a follow-up post) to use a Kubernetes Secret / `existingSecret` instead of inlining credentials in `values.yaml` for any real deployment.
- `mc admin user add` and `mc admin policy attach … --user=…` are current syntax; `mc admin policy set` is the older form. Left as-is.
- The chart deploys the MinIO server, but the in-pod `mc` client may be a slim image; the `mc` commands shown will still work via `kubectl exec` because the official MinIO server image bundles `mc` with a pre-configured `local/` alias.
- `mc admin heal` itself is being phased out in favor of MinIO's automatic background healing — operators relying on manual heal commands should plan for this transition.
