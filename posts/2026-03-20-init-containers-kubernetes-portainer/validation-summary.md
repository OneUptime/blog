# Validation Summary: How to Configure Init Containers in Kubernetes via Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Portainer
- Init containers
- `kubectl`
- HashiCorp Vault
- PostgreSQL

## Sources Consulted
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- `kubectl logs` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Portainer "Add a new application using code" documentation: https://docs.portainer.io/2.33-lts/user/kubernetes/applications/manifest
- Portainer "Inspect an application" documentation: https://docs.portainer.io/sts/user/kubernetes/applications/inspect
- Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- Vault `write` command documentation: https://developer.hashicorp.com/vault/docs/commands/write
- PostgreSQL `pg_isready` documentation: https://www.postgresql.org/docs/16/app-pg-isready.html

## Issues Found
- The post described init containers as suitable for "one-time" setup tasks without clarifying that init containers run once per Pod start, not once per Deployment or rollout. I corrected the wording to "per-Pod startup tasks" and added a note that migration commands should be idempotent, with a separate Kubernetes Job preferred for truly once-per-rollout migrations.
- The PostgreSQL readiness example used `busybox:1.36` with `nc -z`. That flag is not portable across BusyBox `nc` builds, and it was checking TCP connectivity with a less authoritative tool for PostgreSQL readiness. I replaced it with `postgres:16` and `pg_isready`, which PostgreSQL documents specifically for checking server connection status.
- The Vault example used `vault login -method=kubernetes role=api-role`, while the official Kubernetes auth documentation shows logging in via `auth/kubernetes/login` with a Kubernetes service account JWT. I updated the snippet to use `vault write -field=token auth/kubernetes/login role=api-role jwt="$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)"` and export the returned token before reading the secret.
- The Portainer deployment path referenced the older "Kubernetes > Advanced Deployment" wording. Current Portainer documentation describes deploying manifests through the "Add a new application using code" flow with the Web editor, so I updated the UI instructions accordingly.
- The Step 1 text said "Deploy a pod" even though the manifest shown is a `Deployment`. I corrected that wording.

## Review Notes
- The Vault example assumes the Kubernetes auth method is mounted at the default `auth/kubernetes` path and that the pod has a mounted service account token, which is the default unless `automountServiceAccountToken: false` is set.
- Portainer UI labels vary a little across releases; current docs use the code/Web editor application flow rather than the older "Advanced Deployment" label.
- The pinned image tags in the post are still technically plausible, but they should be reviewed periodically as newer upstream releases become standard.
