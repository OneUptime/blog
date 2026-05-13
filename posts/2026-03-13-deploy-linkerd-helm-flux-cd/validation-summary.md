# Validation Summary: How to Deploy Linkerd with Helm via Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd service mesh
- Kubernetes
- Flux CD HelmRelease and Kustomization APIs
- Helm charts
- step CLI and X.509 certificates
- Linkerd Viz
- Prometheus integration

## Sources Consulted
- Linkerd official documentation: Installing Linkerd with Helm - https://linkerd.io/2.18/tasks/install-helm/
- Linkerd official documentation: Generating your own mTLS root certificates - https://linkerd.io/2.18/tasks/generate-certificates/
- Linkerd official documentation: Automatically Rotating Control Plane TLS Credentials - https://linkerd.io/2.14/tasks/automatically-rotating-control-plane-tls-credentials/
- Linkerd official documentation: Bringing your own Prometheus - https://linkerd.io/2.18/tasks/external-prometheus/
- Linkerd official CLI reference: viz - https://linkerd.io/2.18/reference/cli/viz/
- Linkerd Helm stable repository index - https://helm.linkerd.io/stable/index.yaml
- Linkerd control-plane chart values for stable-2.14.10 - https://raw.githubusercontent.com/linkerd/linkerd2/stable-2.14.10/charts/linkerd-control-plane/values.yaml
- Linkerd viz chart values for stable-2.14.10 - https://raw.githubusercontent.com/linkerd/linkerd2/stable-2.14.10/viz/charts/linkerd-viz/values.yaml
- Flux HelmRelease documentation - https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Smallstep step CLI certificate create reference - https://smallstep.com/docs/step-cli/reference/certificate/create/

## Issues Found
- The certificate setup only generated a trust anchor, but Linkerd Helm installs require both a trust anchor and an issuer certificate/key pair. Added `step certificate create` for the `identity.linkerd.cluster.local` intermediate issuer and changed the Kubernetes Secret to include `ca.crt`, `issuer.crt`, and `issuer.key`.
- The control-plane HelmRelease set `identity.issuer.scheme: kubernetes.io/tls` without the required external CA setup and did not provide the issuer certificate/key values required by the chart. Replaced that incomplete inline configuration with Flux `valuesFrom` entries targeting `identityTrustAnchorsPEM`, `identity.issuer.tls.crtPEM`, and `identity.issuer.tls.keyPEM`.
- The Secret creation command targeted the `linkerd` namespace before the GitOps namespace manifest would be applied. Added an idempotent namespace creation command before creating the Secret.
- The high-availability values set replicas and anti-affinity but omitted `highAvailability: true`, which the Linkerd chart uses as the flag for `linkerd check`. Added the value.
- The `linkerd-viz` HelmRelease was placed in the `linkerd-viz` namespace, but the post did not create that namespace. Added a `Namespace` manifest for `linkerd-viz`.

## Review Notes
The chart versions in the post (`linkerd-crds` 1.8.x, `linkerd-control-plane` 1.16.x, and `linkerd-viz` 30.12.x) match the Linkerd stable 2.14.10 chart family. The latest Linkerd documentation now highlights newer Linkerd versions, so future updates should consider whether the article should move to a newer chart family rather than remaining on the stable 2.14 line.
