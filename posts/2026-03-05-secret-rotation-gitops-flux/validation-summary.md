# Validation Summary: How to Handle Secret Rotation in GitOps Workflows with Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes Secrets
- SOPS
- External Secrets Operator
- AWS Secrets Manager
- GitHub Actions
- PostgreSQL
- Stakater Reloader
- Helm

## Sources Consulted
- Flux Kustomization SOPS decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API v2 documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux `flux get kustomizations --watch` getting started documentation: https://fluxcd.io/flux/get-started/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Secret volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes `kubectl rollout restart` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- PostgreSQL `ALTER USER` documentation: https://www.postgresql.org/docs/17/sql-alteruser.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/main/reference/annotations.html
- SOPS official GitHub releases: https://github.com/getsops/sops/releases

## Issues Found
- The PostgreSQL dual-credential example used invalid `ALTER USER ... SET PASSWORD` syntax and incorrectly stated that the old password remains valid. PostgreSQL stores one password per role, so changing the role password invalidates the previous password. Replaced the example with a second login role and added a note explaining the PostgreSQL behavior.
- The text referred to "Reloader or Stakater" as if they were separate tools. Changed this to "Stakater Reloader."
- The External Secrets Operator example used `external-secrets.io/v1beta1`; current ESO documentation uses `external-secrets.io/v1`. Updated the API version.
- The GitHub Actions example installed an older SOPS release. Updated the install snippet to use the current official release, `v3.13.0`.
- The CI example referenced an undefined `$OLD_PASSWORD`. Replaced it with a `DB_ADMIN_PASSWORD` environment variable sourced from GitHub Actions secrets.
- The base64 encoding command could wrap output on GNU systems. Changed it to `base64 -w0` and used `printf` to avoid newline handling problems.
- The Kubernetes restart section said mounted Secrets do not update. Kubernetes updates Secret volumes eventually, except `subPath` mounts, but it does not restart pods and environment variables do not update in running containers. Reworded the explanation.
- The checksum annotation example was a Helm template pattern but was presented generically. Added a short note that it applies to Helm-rendered workloads and that plain Flux Kustomization manifests need another automation path or a reloader controller.

## Review Notes
- The Flux CLI and kubectl examples match official documentation, but the local environment did not have `flux` or `kubectl` installed, so those commands were verified against official docs rather than local `--help` output.
- The CI/CD pipeline remains an illustrative example. In production, the password update step should use parameterized tooling or provider-specific rotation APIs where possible, and the workflow should include appropriate network access, client installation, and rollback handling.
