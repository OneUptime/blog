# Validation Summary: How to Implement Helm Chart Versioning Strategies with SemVer and Chart Museum

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Helm
- Helm charts and Chart.yaml
- Semantic Versioning
- ChartMuseum
- Kubernetes Deployments, Services, PersistentVolumeClaims, and Ingress
- AWS S3 and Google Cloud Storage configuration
- GitHub Actions
- Bash scripting

## Sources Consulted
- Helm chart documentation: https://helm.sh/docs/v3/topics/charts/
- Helm dependency best practices: https://helm.sh/docs/v3/chart_best_practices/dependencies/
- Helm package command documentation: https://helm.sh/docs/helm/helm_package/
- ChartMuseum documentation: https://chartmuseum.com/docs/
- chartmuseum/helm-push documentation: https://github.com/chartmuseum/helm-push
- Semantic Versioning 2.0.0 specification: https://semver.org/
- actions/checkout documentation: https://github.com/actions/checkout
- Azure setup-helm GitHub Marketplace page: https://github.com/marketplace/actions/helm-tool-installer

## Issues Found
- The SemVer example implied that major version `2` necessarily means two completed major revisions. Changed the wording to describe it as the current major version, which is more accurate.
- The ChartMuseum deployment used `ghcr.io/helm/chartmuseum:v0.16.0`. Updated it to `v0.16.3`, matching the current image tag shown in ChartMuseum's official documentation.
- The ChartMuseum deployment set `DEPTH` to `1` while the rest of the post used a single repository at the root URL. Changed `DEPTH` to `0`, which is ChartMuseum's default single-tenant mode.
- The auto-version script used `git log ${LAST_TAG}..HEAD`, which is unreliable when no previous tag exists. Added explicit logic for the no-tag case.
- The auto-version script inspected only one-line commit summaries, which misses Conventional Commit breaking-change footers. Changed it to inspect full commit messages.
- The auto-version script only matched `feat:` and missed scoped feature commits like `feat(api):`. Updated the regex to support scoped Conventional Commit messages.
- The GitHub Actions workflow used older action versions. Updated `actions/checkout@v3` to `actions/checkout@v6` and `azure/setup-helm@v3` to `azure/setup-helm@v5.0.0` based on current upstream documentation.
- The package step wrote to `.deploy` without first creating the directory. Added `mkdir -p .deploy`.
- The tag creation step parsed chart names and versions from filenames, which breaks for chart names containing hyphens. Changed it to read `name` and `version` with `helm show chart`.

## Review Notes
The post remains a valid ChartMuseum-based guide, but teams starting new repositories should also evaluate Helm OCI registries because modern Helm supports OCI workflows natively. ChartMuseum is still documented and usable for classic HTTP chart repositories.
