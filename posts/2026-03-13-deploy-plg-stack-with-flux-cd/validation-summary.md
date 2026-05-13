# Validation Summary: How to Deploy PLG Stack with Flux CD

## Status
validated

## Post Type
Tutorial / GitOps deployment guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm and HelmRelease resources
- Grafana Loki
- Promtail
- Grafana
- LogQL

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization health check documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Grafana Loki Helm installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki monolithic Helm installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Promtail installation documentation: https://grafana.com/docs/loki/latest/send-data/promtail/installation/
- Grafana Helm chart installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/helm/
- Grafana Helm chart v7.3.7 values: https://github.com/grafana/helm-charts/releases/download/grafana-7.3.7/grafana-7.3.7.tgz
- Grafana Promtail Helm chart v6.15.5 values: https://github.com/grafana/helm-charts/releases/download/promtail-6.15.5/promtail-6.15.5.tgz
- Grafana Loki Helm chart v6.6.0 values: https://github.com/grafana/helm-charts/releases/download/helm-loki-6.6.0/loki-6.6.0.tgz

## Issues Found
- The introduction said the guide deploys Loki in simple scalable mode, but the Loki HelmRelease uses `deploymentMode: SingleBinary`. Updated the text to say single-binary mode.
- Promtail is now end-of-life as of March 2, 2026 according to Grafana's documentation. Added a short caveat that the Promtail example is for legacy PLG environments and that Grafana Alloy should be used for new deployments.
- The Loki chart v6.6.0 defaults `read`, `write`, and `backend` replicas to 3 for simple scalable mode. With `singleBinary.replicas: 1`, the chart validation fails unless those scalable targets are set to 0. Added `backend.replicas: 0`, `read.replicas: 0`, and `write.replicas: 0`.
- The Flux Kustomization health check pointed at the Grafana Deployment created by Helm. Flux documentation recommends checking HelmRelease resources when a Kustomization contains HelmRelease objects. Updated health checks to wait for the Loki, Promtail, and Grafana HelmRelease resources and added a timeout.
- The best-practices section referenced `adminPasswordSecretKeyRef`, which is not a Grafana Helm chart v7.3.7 value. Updated it to `admin.existingSecret` and `admin.passwordKey`.

## Review Notes
The pinned Loki chart version and Grafana chart repository were valid for the examples, but Grafana Loki Helm chart maintenance moved to the Grafana Community chart repository after this post date. Future revisions should consider replacing Promtail with Grafana Alloy instead of presenting PLG as the recommended stack for new clusters.
