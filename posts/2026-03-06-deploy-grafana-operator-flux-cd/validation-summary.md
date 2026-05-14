# Validation Summary: How to Deploy Grafana Operator with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Grafana Operator
- Grafana
- Kubernetes
- Helm OCI charts
- SOPS
- Prometheus, Loki, and Tempo data sources

## Sources Consulted
- Grafana Operator quick start: https://grafana.github.io/grafana-operator/docs/quick-start/
- Grafana Operator Helm installation and chart values: https://grafana.github.io/grafana-operator/docs/installation/helm/
- Grafana Operator API reference: https://grafana.github.io/grafana-operator/docs/api/
- Grafana Operator common options: https://grafana.github.io/grafana-operator/docs/examples/common_options/
- Grafana Operator admin credentials from a Secret: https://grafana.github.io/grafana-operator/docs/examples/grafana/credential_secret/readme/
- Grafana Operator database and multiple replicas example: https://grafana.github.io/grafana-operator/docs/examples/grafana/multiple_replicas/readme/
- Grafana Operator versioning and published artifacts: https://grafana.github.io/grafana-operator/docs/versioning/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Helm release guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/

## Issues Found
- The Flux source used an HTTP HelmRepository for `https://grafana.github.io/helm-charts`, but current Grafana Operator documentation publishes the operator chart as an OCI Helm chart at `oci://ghcr.io/grafana/helm-charts/grafana-operator`. Changed the source to an `OCIRepository` with a Helm chart layer selector and updated the HelmRelease to use `chartRef`.
- The HelmRelease used `version: "5.x"`. Replaced this with the OCIRepository semver selector `>=5.0.0 <6.0.0`, which matches Flux OCIRepository usage.
- The Helm values set `watchNamespaces: []`, but the Grafana Operator Helm chart documents `watchNamespaces` as a string. Changed it to `watchNamespaces: ""` for cluster-wide watching.
- The Grafana credentials example mounted `ADMIN_PASSWORD` with `envFrom` while setting `security.admin_password` in the Grafana config. Updated the secret to use `GF_SECURITY_ADMIN_USER` and `GF_SECURITY_ADMIN_PASSWORD`, added `disableDefaultAdminSecret: true`, and changed the database password to Grafana's `$__env{DB_PASSWORD}` expansion syntax.
- The Tempo data source linked to `loki` and `prometheus` by UID, but the Loki and Prometheus data source CRs did not set stable UIDs. Added `spec.uid: loki` and `spec.uid: prometheus`.

## Review Notes
The examples assume the referenced Prometheus, Loki, Tempo, PostgreSQL, cert-manager, and ingress-nginx services already exist with the shown names and namespaces. The SOPS command syntax could not be tested locally because `sops` is not installed in this workspace, but the flags were checked against SOPS documentation.
