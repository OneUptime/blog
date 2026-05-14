# Validation Summary: How to Secure Flux CD Notification Provider Credentials

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD notification-controller Providers
- Flux CD Kustomization SOPS decryption
- Kubernetes Secrets and RBAC
- External Secrets Operator
- SOPS with age
- kubectl and flux CLI commands

## Sources Consulted
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Kustomization SOPS decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `reconcile kustomization` command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- Kubernetes kubectl command reference for `create secret generic`: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- SOPS documentation: https://getsops.io/docs/

## Issues Found
- Flux Provider manifests used `notification.toolkit.fluxcd.io/v1`, but the current Provider API is documented as `notification.toolkit.fluxcd.io/v1beta3`. Updated the Slack, PagerDuty, and GitHub Provider examples to `v1beta3`.
- The PagerDuty examples incorrectly modeled the routing key as a Kubernetes Secret with a `token` key referenced by `secretRef`. Flux's PagerDuty notifier uses the Provider `channel` field as the routing key and `address` for the PagerDuty Events API endpoint. Removed the invalid PagerDuty Secret, kubectl command, `secretRef`, ExternalSecret, and RBAC entry, and updated the Provider example to use `address` and `channel`.
- The Slack legacy webhook Provider example included `channel`, but Flux's legacy incoming webhook example stores the webhook `address` in the Secret and does not require `channel`. Removed the field from that example.
- ExternalSecret manifests used `external-secrets.io/v1beta1`; the current External Secrets Operator documentation uses `external-secrets.io/v1`. Updated both ExternalSecret examples to `v1`.
- Removing the invalid PagerDuty Secret and ExternalSecret left adjacent YAML documents without `---` separators. Restored the separators so the snippets remain valid multi-document YAML.

## Review Notes
PagerDuty routing keys remain sensitive, but Flux does not currently read that value from `secretRef`; if users store PagerDuty Provider manifests in Git, they should treat that manifest as sensitive and encrypt it with SOPS or manage it through another controlled workflow.
