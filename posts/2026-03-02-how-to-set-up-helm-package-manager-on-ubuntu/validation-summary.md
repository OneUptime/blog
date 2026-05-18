# Validation Summary: How to Set Up Helm Package Manager on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm (Kubernetes package manager, v3.x)
- Kubernetes
- Ubuntu / Debian (apt)
- Bitnami, Ingress NGINX, cert-manager (jetstack) chart repositories
- Helm chart authoring (Chart.yaml v2, values.yaml, templates)
- Helm plugins (helm-diff, helm-secrets)
- kubectl (used in troubleshooting)

## Sources Consulted
- Official Helm installation docs: https://helm.sh/docs/intro/install/
- Helm install script: https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
- Helm stable charts repo archive notice: https://github.com/helm/charts
- Bitnami charts repository: https://charts.bitnami.com/bitnami
- Ingress NGINX charts: https://kubernetes.github.io/ingress-nginx
- Jetstack (cert-manager) charts: https://charts.jetstack.io
- helm-diff plugin: https://github.com/databus23/helm-diff
- helm-secrets plugin: https://github.com/jkroepke/helm-secrets

## Issues Found

1. **Outdated apt repository URLs (baltocdn.com)** — The post used `https://baltocdn.com/helm/signing.asc` and `https://baltocdn.com/helm/stable/debian/` for the apt repo. The `baltocdn.com` domain no longer resolves (verified via curl) and the official Helm docs now use `https://packages.buildkite.com/helm-linux/helm-debian/`. Updated the GPG key URL, the `deb` line, and added the prerequisite `apt-transport-https`/`gpg` install step to match the current official instructions. The `arch=` filter was removed from the deb line per the official docs (the new repo path uses `any/ any main`).

2. **Misleading comment on the `stable` chart repo** — The post described the stable repo as "maintained by the community". The `helm/charts` repository was archived in November 2020 and no longer receives updates. Updated the comment to "legacy stable charts repository (archived in November 2020; kept for reference)" so readers know the repo is no longer maintained, without removing the example.

## Review Notes
- The `helm create` scaffold listing is a simplified view — the actual scaffold also creates `.helmignore`, `templates/NOTES.txt`, `templates/serviceaccount.yaml`, `templates/hpa.yaml`, and `templates/tests/test-connection.yaml`. The post's listing isn't wrong (the shown files do exist) but a future reader running `tree my-app/` will see more than what's documented. Left as-is since the post presents it as illustrative.
- The example output shows Helm `v3.14.0` (released January 2024). The current stable release line has advanced further; the post would benefit from an occasional version refresh, but the format and command output style remain accurate.
- The Bitnami subchart example uses `version: "12.x.x"`, which is now several major versions behind. The constraint syntax is correct; the specific version is just illustrative.
- The Helm 3 release-secret naming convention used in the troubleshooting section (`sh.helm.release.v1.<release-name>.v1`) is correct.
- All other commands, flags (`--set`, `--values`, `--namespace`, `--create-namespace`, `--dry-run`, `--debug`, `--keep-history`, `--wait`, `-A`), and concepts (chart repos, releases, revisions, rollbacks, dependencies, plugins) were verified and are accurate for current Helm 3.
