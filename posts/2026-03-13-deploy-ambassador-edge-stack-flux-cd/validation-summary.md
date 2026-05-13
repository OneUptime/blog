# Validation Summary: How to Deploy Ambassador Edge Stack with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD HelmRepository, OCIRepository, HelmRelease, and Kustomization
- Kubernetes namespaces, Services, Deployments, and PodDisruptionBudgets
- Emissary-ingress / Ambassador API Gateway
- Envoy proxy
- cert-manager Certificate resources
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Kustomization documentation: https://v2-0.docs.fluxcd.io/flux/components/kustomize/kustomization/
- Emissary-ingress Helm install documentation: https://emissary-ingress.dev/docs/3.8/topics/install/helm/
- Emissary-ingress Quick Start: https://emissary-ingress.dev/docs/3.10/quick-start/
- Emissary-ingress Listener CRD documentation: https://emissary-ingress.dev/docs/3.8/topics/running/listener/
- Emissary-ingress Host CRD documentation: https://emissary-ingress.dev/docs/3.6/topics/running/host-crd/
- Emissary-ingress communications guide: https://emissary-ingress.dev/docs/3.9/howtos/configure-communications/
- Emissary-ingress upstream Helm chart templates and values: https://github.com/emissary-ingress/emissary/tree/master/charts/emissary-ingress
- cert-manager Certificate resource documentation: https://cert-manager.io/v1.14-docs/usage/certificate/

## Issues Found
- The post treated Ambassador Edge Stack and Emissary-ingress as the same current product. Updated the title, description, introduction, and conclusion to target Emissary-ingress, formerly Ambassador API Gateway, which is the CNCF project deployed by the `emissary-ingress` chart.
- The HelmRelease used chart version `>=3.0.0 <4.0.0`, but the Datawire `emissary-ingress` Helm chart uses 8.x chart versions for Emissary 3.x app versions. Changed the range to `>=8.0.0 <9.0.0`.
- The deployment omitted the required Emissary CRD installation. Added a Flux `OCIRepository` and `HelmRelease` for `ghcr.io/emissary-ingress/emissary-crds-chart`, with a separate Flux Kustomization so CRDs are reconciled before Emissary resources.
- The Emissary chart defaults wait for the legacy conversion webhook. For a fresh v3-only CRD installation, added `waitForApiext.enabled: false`, matching the official quick-start guidance.
- The ServiceMonitor values were under `serviceMonitor.enabled`, but the chart expects `metrics.serviceMonitor.enabled`. Updated the values block.
- The HTTP Listener was configured with `protocol: HTTPS`, which would not model an HTTP listener for redirect handling. Changed it to `protocol: HTTP` and clarified that `securityModel: XFP` handles secure/insecure request classification.
- The Host example used `acmeProvider`, which is Ambassador Edge Stack-specific in the official docs. Replaced it with a cert-manager `Certificate` and an Emissary `Host` referencing the generated TLS secret.
- The Flux Kustomization health check watched the rendered Deployment. Changed it to watch the HelmRelease, which is the Flux-recommended health check for Kustomizations that deploy HelmRelease resources.

## Review Notes
Local `helm`, `kubectl`, and `flux` binaries were not installed, so command syntax was checked against official documentation rather than local `--help` output. YAML snippets were parsed successfully with Python's YAML library.
