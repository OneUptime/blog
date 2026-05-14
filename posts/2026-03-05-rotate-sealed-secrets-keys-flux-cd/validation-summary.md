# Validation Summary: How to Rotate Sealed Secrets Keys with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Sealed Secrets
- kubeseal
- Flux CD
- Kubernetes
- HelmRelease
- Kubernetes Secrets
- Kubernetes CronJob
- GitOps

## Sources Consulted
- Sealed Secrets official README and rotation documentation: https://github.com/bitnami-labs/sealed-secrets
- Sealed Secrets Helm chart values: https://raw.githubusercontent.com/bitnami-labs/sealed-secrets/main/helm/sealed-secrets/values.yaml
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `reconcile helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The original re-sealing script fetched live Kubernetes Secrets and piped them through `kubectl neat`, which is not part of kubectl and also contradicted the claim that original plaintext values were required. Replaced it with the official `kubeseal --re-encrypt` workflow for existing SealedSecret manifests.
- The post described restarting or deleting the controller pod as a way to trigger immediate key rotation. Official Sealed Secrets documentation says early key renewal should use `--key-cutoff-time` or `SEALED_SECRETS_KEY_CUTOFF_TIME`; the Helm chart exposes this as `keycutofftime`. Updated the manual rotation section to use an RFC1123 cutoff timestamp in the Flux HelmRelease and then reconcile it.
- The post did not mention that manually deleted or relabeled sealing keys are not picked up until the controller restarts. Added a controller restart after optional old-key deletion.
- Several references still called the updated manifests "re-sealed" after switching to `kubeseal --re-encrypt`. Updated those references to "re-encrypted" for technical precision.
- The troubleshooting command inferred the active sealing key by Secret creation timestamp. Current Sealed Secrets defaults to certificate `NotBefore` ordering, so the authoritative check is the certificate returned by `kubeseal --fetch-cert`. Updated the example accordingly.

## Review Notes
The post is technically relevant and remains a valid tutorial after the fixes. The Sealed Secrets documentation also cautions that re-encryption is not a substitute for rotating the actual secret values, especially if an old sealing private key was compromised.
