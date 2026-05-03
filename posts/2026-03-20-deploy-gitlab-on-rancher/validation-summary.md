# Validation Summary: How to Deploy GitLab on Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- GitLab (self-hosted)
- Rancher / Kubernetes
- Helm (chart: `gitlab/gitlab`)
- GitLab Runner (chart: `gitlab/gitlab-runner`)
- cert-manager
- NGINX Ingress
- PostgreSQL (external)
- S3-compatible object storage
- Longhorn (storage class)
- Gitaly

## Sources Consulted
- GitLab Helm chart globals reference: https://docs.gitlab.com/charts/charts/globals/
- External PostgreSQL config: https://docs.gitlab.com/charts/installation/external_db/
- Gitaly chart settings: https://docs.gitlab.com/charts/charts/gitlab/gitaly/
- GitLab Runner Kubernetes installation: https://docs.gitlab.com/runner/install/kubernetes.html
- GitLab charts repo: https://charts.gitlab.io/

## Issues Found

1. **Wrong key for external PostgreSQL — `global.postgresql` should be `global.psql`.**
   The official GitLab Helm chart uses `global.psql` for external PostgreSQL connection settings, not `global.postgresql` (the latter is the bundled-chart toggle and lives at the top level). Updated the values block to use `global.psql`.

2. **Inline `password:` value not supported for external PostgreSQL.**
   The chart requires the password to be referenced via a Kubernetes secret (`useSecret: true`, `secret`, `key`). Replaced the inline password with the secret-based form and added a `kubectl create secret generic gitlab-postgres-password` command in Step 3 so the referenced secret actually exists. Also corrected the database name to the chart's expected `gitlabhq_production`.

3. **Wrong key for object storage — `global.object_store` should be `global.appConfig.object_store`.**
   Object storage configuration in the GitLab chart lives under `global.appConfig.object_store`, not directly under `global`. Moved the block under `appConfig`.

4. **Gitaly `persistence` was placed under `global.gitaly` instead of `gitlab.gitaly`.**
   `global.gitaly` only holds top-level toggles like `enabled`, `external`, and `authToken`. The `persistence` (PVC) settings belong under the local sub-chart at `gitlab.gitaly.persistence`. Moved persistence accordingly and consolidated it with the existing `gitlab.gitaly.resources` block.

5. **Contradictory cert-manager configuration — `configureCertmanager: true` with a `cert-manager.io/cluster-issuer` annotation.**
   When `global.ingress.configureCertmanager` is `true`, the chart wires up its own Issuer using `certmanager-issuer.email`, which conflicts with supplying your own `cluster-issuer` via annotation. Set `configureCertmanager: false` to match the stated intent of using the existing `letsencrypt-prod` ClusterIssuer.

## Review Notes

- The `helm repo add gitlab https://charts.gitlab.io/` URL is correct.
- `runnerToken` is the correct values key for the new authentication-token-based runner registration (replacing the deprecated `runnerRegistrationToken`). This is appropriate for GitLab 16+.
- The initial root password secret name `<release>-gitlab-initial-root-password` is correct for release name `gitlab`.
- `nginx-ingress.enabled: false` correctly disables the bundled ingress controller; the existing `ingress.class: nginx` then targets the cluster's NGINX Ingress.
- The `gitlab-values.yaml` resource requests are reasonable defaults but real production sizing should be derived from GitLab's reference architectures.
- The 8 CPU / 16 GB RAM prerequisite is on the low end for a full GitLab deployment; users running with object storage and external Postgres can fit, but the chart's `webservice` + `sidekiq` + `gitaly` + `registry` + `kas` + `pages` baseline can exceed this. Worth flagging to readers in a future revision.
- `aws_signature_version: 4` and the `endpoint` field in the S3 connection YAML match the Fog/CarrierWave format the chart expects.
