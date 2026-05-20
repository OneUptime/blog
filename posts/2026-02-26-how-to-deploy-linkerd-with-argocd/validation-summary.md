# Validation Summary: How to Deploy Linkerd with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linkerd service mesh
- Argo CD and ApplicationSet
- Kubernetes manifests and Custom Resource Definitions
- Helm charts
- cert-manager
- Smallstep step CLI
- Linkerd Viz

## Sources Consulted
- Linkerd Helm installation documentation: https://linkerd.io/2-edge/tasks/install-helm/
- Linkerd Helm chart version matrix: https://linkerd.io/2.14/reference/helm-chart-version-matrix/
- Official Linkerd stable Helm index: https://helm.linkerd.io/stable/index.yaml
- Linkerd automatic control-plane TLS credential rotation documentation: https://linkerd.io/2.12/tasks/automatically-rotating-control-plane-tls-credentials/
- Linkerd authorization policy reference: https://linkerd.io/2.18/reference/authorization-policy/
- Linkerd automatic proxy injection documentation: https://linkerd.io/2/features/proxy-injection/
- Linkerd proxy configuration reference: https://linkerd.io/2/reference/proxy-configuration/
- Linkerd Viz CLI reference: https://linkerd.io/2/reference/cli/viz/
- Argo CD application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- cert-manager Certificate resource documentation: https://cert-manager.io/v1.16-docs/usage/certificate/
- Smallstep certificate creation documentation: https://smallstep.com/docs/step-cli/basic-crypto-operations/

## Issues Found
- The `linkerd-control-plane` chart version `1.16.0` is not present in the official stable Helm index. Changed it to `1.16.11`, the stable chart version corresponding to `stable-2.14.10`.
- The `linkerd-viz` chart version `30.12.0` is not present in the official stable Helm index. Changed it to `30.12.11`, the matching stable Viz chart version for `stable-2.14.10`.
- The control-plane Helm values defined `identity:` twice. In YAML, the later key would overwrite the earlier `identity.issuer.scheme` configuration. Consolidated the issuer configuration and removed the incorrect `identity.externalCA: true` setting from this manual trust-anchor example.
- The control-plane resource override keys used nested `destination.resources`, `identity.resources`, and `proxyInjector.resources`, which are not valid keys for the Linkerd 1.16.x chart. Replaced them with the chart's top-level `destinationResources`, `identityResources`, and `proxyInjectorResources` keys.
- The policy examples used `policy.linkerd.io/v1beta2` for `Server` and `ServerAuthorization`. The Linkerd CRDs and current documentation use `policy.linkerd.io/v1beta1` for those resources. Updated both examples.

## Review Notes
- `ServerAuthorization` is still documented, but Linkerd's current authorization reference says `AuthorizationPolicy` is the more flexible preferred alternative and notes that `ServerAuthorization` may be deprecated in a future release.
- The examples remain tied to the open source stable Helm repository's 2.14-era chart versions. Newer Linkerd documentation prominently references edge releases, so future updates may want to revisit the release channel and version strategy.
