# Validation Summary: How to Install Epinio from Rancher UI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Epinio
- Kubernetes
- Helm charts
- cert-manager
- DNS
- Epinio CLI

## Sources Consulted
- Rancher: Helm Charts and Apps, https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- Epinio: Installing Epinio on Rancher, https://docs.epinio.io/installation/other_inst_scenarios/install_epinio_on_rancher
- Epinio: Installing Epinio, https://docs.epinio.io/installation/install_epinio
- Epinio: DNS setup, https://docs.epinio.io/installation/dns_setup
- Epinio: Install the Epinio CLI, https://docs.epinio.io/installation/install_epinio_cli
- Epinio: `epinio login` command reference, https://docs.epinio.io/references/commands/cli/epinio_login
- Epinio: Authorization reference, https://docs.epinio.io/references/authorization
- Epinio Helm chart values, https://github.com/epinio/helm-charts/blob/main/chart/epinio/values.yaml
- Epinio Helm chart Rancher questions, https://github.com/epinio/helm-charts/blob/main/chart/epinio/questions.yml
- Epinio Helm chart ingress template, https://github.com/epinio/helm-charts/blob/main/chart/epinio/templates/ingress.yaml
- Epinio Helm chart Dex template, https://github.com/epinio/helm-charts/blob/main/chart/epinio/templates/dex.yaml
- Epinio Helm chart container registry PVC template, https://github.com/epinio/helm-charts/blob/main/chart/epinio/templates/container-registry-pvc.yaml
- Epinio Helm chart install notes, https://github.com/epinio/helm-charts/blob/main/chart/epinio/templates/NOTES.txt

## Issues Found
- The original post skipped the required Rancher repository setup. Current Rancher and Epinio docs require adding the Epinio Helm repository under `Apps > Repositories` before the chart appears under `Apps > Charts`, so Step 1 was corrected.
- The prerequisites were incomplete. Current Epinio installation docs require a default `IngressClass` and a default dynamically provisioned `StorageClass` with `ReadWriteMany` support, so both were added.
- The original `global.domain` example was incorrect for current Epinio routing. The chart templates generate the UI at `https://epinio.<global.domain>` and Dex at `https://auth.<global.domain>`, so using `epinio.example.com` as `global.domain` would have produced `epinio.epinio.example.com`. The example domain and DNS instructions were corrected to use `example.com` with UI access at `https://epinio.example.com`.
- The Let's Encrypt example omitted `global.tlsIssuerEmail`, which current Epinio docs and the Rancher chart questions expose for `letsencrypt-production`. The YAML example and form steps were updated.
- The storage example used an outdated `minio` block. The current chart ships with SeaweedFS as the built-in S3-compatible storage backend, so that snippet was replaced.
- The advanced configuration example used outdated or invalid chart keys: `containerregistry.persistence`, `storageClass`, `dex.config.connectors`, and `epinio-ui`. These were replaced with current, valid settings from the Epinio chart.
- The original CLI section said the login used Rancher-managed credentials. Upstream Epinio docs explicitly note that Rancher and Epinio integrate with identity providers separately, and the current chart ships separate default UI and API credentials. The UI and CLI login guidance was corrected accordingly.

## Review Notes
- Validated against current Epinio docs version 1.13.10 and the current upstream chart source as of 2026-05-01.
- The upstream Rancher-specific Epinio how-to is still written against Rancher 2.7.1 and an older chart release, so the chart source was used to verify present-day values and default login behavior.
- `helm` and `kubectl` are not installed in this workspace, so I did not render the chart locally; validation was done against official documentation and upstream chart templates.
