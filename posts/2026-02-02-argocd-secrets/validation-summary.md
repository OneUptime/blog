# Validation Summary: How to Handle ArgoCD Secret Management

## Status
validated

## Post Type
Tutorial / Guide — covers four secret-management approaches for ArgoCD with installation steps, YAML manifests, and CLI commands.

## Technologies Covered
- ArgoCD (Applications, repo-server, ConfigManagementPlugin)
- Bitnami Sealed Secrets + kubeseal CLI
- External Secrets Operator (ESO) — AWS Secrets Manager, HashiCorp Vault, GCP, Azure providers
- ArgoCD Vault Plugin (AVP)
- SOPS (getsops) + Age + KSOPS Kustomize plugin
- Kustomize
- HashiCorp Vault (policies, Kubernetes auth, audit devices)
- Helm
- gitleaks (pre-commit)
- Stakater Reloader

## Sources Consulted
- Bitnami Sealed Secrets repo and Helm chart: https://github.com/bitnami-labs/sealed-secrets
- kubeseal CLI documentation (`--re-encrypt`, `--fetch-cert`, `--format` flags)
- External Secrets Operator docs and API spec: https://external-secrets.io/
- ESO AWS Secrets Manager provider: https://external-secrets.io/latest/provider/aws-secrets-manager/
- ESO Vault provider documentation
- ArgoCD Vault Plugin docs: https://argocd-vault-plugin.readthedocs.io/
- HashiCorp Vault policies concepts: https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault audit docs: https://developer.hashicorp.com/vault/docs/audit
- SOPS (getsops) release pages: https://github.com/getsops/sops
- KSOPS (viaduct.ai) docs

## Issues Found

1. **Non-existent Helm flag** — `--set controller.create=true` in the Sealed Secrets install. The Bitnami chart has no such value (the related field was renamed to `createController` in chart v2.0.0 and defaults to `true`). Removed the unnecessary flag.

2. **Wrong deployment name in rotation example** — `kubectl rollout restart deployment sealed-secrets-controller` would fail; with `helm install sealed-secrets …` the Deployment is named `sealed-secrets`, not `sealed-secrets-controller`.

3. **Incorrect key-rotation mechanism** — Restarting the controller does NOT force key rotation. The controller renews keys on a timer (`--key-renew-period`, default 30 days) and retains old keys. Rewrote the section to (a) describe the automatic renewal accurately and (b) show the correct way to force a new active key: deleting the Secret labeled `sealedsecrets.bitnami.com/sealed-secrets-key=active`.

4. **Invalid Vault HCL policy syntax** — `audit = { enabled = true }` inside a `path` stanza is not valid Vault policy syntax. Vault path stanzas only accept `capabilities`, `allowed_parameters`, `denied_parameters`, `required_parameters`, `min_wrapping_ttl`, `max_wrapping_ttl`, `subscribe_event_types`, and `mfa_methods`. Audit logging is configured cluster-wide via `vault audit enable`, not per-policy. Replaced with a correct example showing `vault audit enable file …` plus the read policies.

## Review Notes

- **ESO API version**: The post uses `external-secrets.io/v1beta1`. Current ESO releases ship `external-secrets.io/v1` as the GA version; v1beta1 is still served but is the legacy version. Examples remain valid as-is, but future readers may want to migrate.
- **kubeseal default controller name mismatch**: With the default Helm install used here (`helm install sealed-secrets …`), the deployment is `sealed-secrets`, but the `kubeseal` CLI by default looks for a controller named `sealed-secrets-controller`. In real use, readers may need `kubeseal --controller-name sealed-secrets` or set `fullnameOverride: sealed-secrets-controller` in values. Not strictly an error in the post, but worth flagging.
- **AVP installation approach is a mix of legacy + sidecar**: The post installs the AVP binary into the `argocd-repo-server` pod (legacy `initContainer`/`emptyDir` pattern) but pairs it with a `ConfigManagementPlugin` CR (associated with the sidecar plugin model). Per official AVP docs both approaches are still supported; the configmap-plugins ConfigMap entry in `argocd-cm` is the truly deprecated piece (removed in newer ArgoCD versions), not addressed here. The example as written can work in older ArgoCD installs but readers targeting current ArgoCD should use the sidecar pattern end-to-end.
- **`installCRDs=true`** for ESO Helm chart is harmless but redundant — it defaults to `true`.
- **Version pins** in the post (kubeseal v0.24.0, sops v3.8.1, AVP v1.17.0, KSOPS v4.2.1, ksops, gitleaks v8.18.0, alpine:3.18) are plausible but will age — readers should check for newer releases when following the guide.
- **AVP discovery `find | xargs` pipeline**: Functional, though `xargs -I {} grep -l … {}` is slightly awkward; the official AVP example uses a simpler form. Not an error.
