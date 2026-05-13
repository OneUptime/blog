# Validation Summary: How to Encrypt Service Account Tokens with SOPS for Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Secrets
- Kubernetes ServiceAccounts and service account token Secrets
- Kubernetes Deployments and CronJobs
- Flux Kustomizations
- SOPS
- age encryption
- Kustomize
- Google Cloud service account keys
- AWS IAM access keys

## Sources Consulted
- Kubernetes ServiceAccount administration: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux guide for managing Kubernetes secrets with SOPS: https://fluxcd.io/flux/guides/mozilla-sops/
- SOPS documentation: https://github.com/getsops/sops

## Issues Found
- The Kubernetes service account token Secret example included a literal `stringData.token` value. Kubernetes documentation states that for a `kubernetes.io/service-account-token` Secret, the control plane populates the token data after creation. I removed the manual token value and clarified that Kubernetes populates the token data.
- The `apps/v1` Deployment examples omitted `spec.selector` and matching Pod template labels. Kubernetes requires a selector for `apps/v1` Deployments, and it must match the template labels. I added selectors and matching labels to both Deployment examples.
- The token rotation section said Pods could pick up Secret updates through "environment variable refresh." Kubernetes does not refresh Secret-derived environment variables in running containers. I changed the wording to state that environment-variable consumers need a restart, while Secret volume projections update eventually and applications must reload the files.
- The CronJob rotation section suggested rotating a Flux-managed Secret directly in-cluster. Because Flux continuously reconciles the Git source of truth, that can be overwritten unless the rotation also updates Git or Flux is not reconciling the same Secret data. I added that caveat.

## Review Notes
The SOPS `encrypted_regex: ^(data|stringData)$`, Flux `decryption.provider: sops`, `secretRef.name: sops-age`, and `sops --encrypt --in-place` examples match current official documentation. The guide still uses long-lived Kubernetes service account token Secrets as an example; Kubernetes documents this as supported but recommends TokenRequest-based tokens where possible.
