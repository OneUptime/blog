# Validation Summary: How to Use Helm for Kubernetes on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm
- Kubernetes
- Ubuntu
- APT
- Snap
- Helm charts, releases, repositories, dependencies, templates, hooks, plugins, and rollbacks
- YAML and Go template syntax
- OneUptime Helm deployment

## Sources Consulted
- Helm official installation documentation: https://helm.sh/docs/intro/install/
- Helm official `helm install` command documentation: https://helm.sh/docs/helm/helm_install/
- Helm official `helm upgrade` command documentation: https://helm.sh/docs/helm/helm_upgrade/
- Helm official charts documentation: https://helm.sh/docs/topics/charts/
- Helm official chart hooks documentation: https://helm.sh/docs/topics/charts_hooks/
- Helm binary release endpoint for `helm-v4.2.2-linux-amd64.tar.gz`: https://get.helm.sh/
- Bitnami Helm chart repository index: https://charts.bitnami.com/bitnami/index.yaml

## Issues Found
- The installation script used `get-helm-3`, while the current official Helm documentation now defaults to Helm 4. Updated the script URL to `get-helm-4`.
- The APT installation example used the older `baltocdn.com` repository and signing key URL. Updated it to the Buildkite-hosted APT repository and key flow shown in the current official Helm installation docs, including fingerprint verification.
- The manual binary installation and sample `helm version` output used the outdated `v3.14.0` example. Updated these to `v4.2.2`, which was available from `get.helm.sh` during review.
- The repository list example included the legacy `https://charts.helm.sh/stable` repository. Removed it from the example output.
- The `--set image.tag="1.0"` example could still be type-coerced by Helm. Changed it to `--set-string image.tag="1.0"` to match Helm's documented method for forcing string values.
- The deployment template always rendered an `env:` key even when `.Values.env` was empty. Wrapped it in `with .Values.env` so the field is only emitted when values are present.
- Several template examples used left-trimming delimiters where they could remove required newlines in YAML block scalar or list contexts. Adjusted the whitespace control in those examples.
- The dependency examples used stale Bitnami major-version ranges. Replaced them with a broad valid SemVer constraint in the general dependency-management section; the production best-practices section still recommends pinning exact chart versions.

## Review Notes
Helm 3 remains available in the official docs, but the current default documentation is Helm 4. Most CLI examples in the post remain valid for Helm 4 based on the official command references reviewed. For production use, exact chart versions should still be selected from the target repository at deployment time and pinned as described in the best-practices section.
