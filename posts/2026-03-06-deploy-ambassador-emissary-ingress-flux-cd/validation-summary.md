# Validation Summary: How to Deploy Ambassador/Emissary Ingress with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- Emissary Ingress
- Envoy Proxy
- Ambassador/Emissary custom resources: Listener, Host, Mapping, RateLimitService
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Emissary Ingress Helm installation documentation: https://emissary-ingress.dev/docs/3.6/topics/install/helm/
- Emissary Ingress v3.10 quick start: https://emissary-ingress.dev/docs/3.10/quick-start/
- Emissary Ingress Listener CRD documentation: https://emissary-ingress.dev/docs/3.10/topics/running/listener/
- Emissary Ingress Host CRD documentation: https://emissary-ingress.dev/docs/3.6/topics/running/host-crd/
- Emissary Ingress v3alpha1 conversion notes: https://emissary-ingress.dev/docs/4.0/topics/install/convert-to-v3alpha1/
- Emissary Ingress add request headers documentation: https://emissary-ingress.dev/docs/3.10/topics/using/headers/add-request-headers/
- Emissary Ingress automatic retries documentation: https://emissary-ingress.dev/docs/3.10/topics/using/retries/
- Emissary Ingress rate limiting tutorial: https://emissary-ingress.dev/docs/3.9/howtos/rate-limiting-tutorial/
- Emissary Ingress Helm repository index: https://app.getambassador.io/index.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The post used a separate `emissary-crds` Helm chart from the `https://app.getambassador.io` Helm repository for chart version `8.9.x`. That repository contains the `emissary-ingress` chart versions but not an `emissary-crds` chart for the 8.9.x install path. I changed the CRD installation example to apply the official committed CRD YAML through a Flux Kustomization with `prune: false`.
- The Emissary HelmRelease used `dependsOn` to point at the CRD Kustomization. Flux HelmRelease dependencies only refer to other HelmRelease objects, so I removed that invalid dependency and added a note that the HelmRelease should be applied by a Flux Kustomization that depends on the CRD Kustomization.
- The Helm values block said it enabled Prometheus metrics but used `createDevPortalMappings: false`, which is not a valid value in the Emissary Ingress 8.9.1 chart. I replaced it with `metrics.serviceMonitor.enabled: true` and added `agent.enabled: false` for disabling the Ambassador Cloud agent.
- The `add_request_headers` example used a simple string value. Emissary's v3alpha1 conversion guidance says Mapping added headers must not be simple strings, so I changed the header value to the object form with `value`.
- The `RateLimitService` example did not set a domain matching the Mapping labels. I added `domain: ambassador` so the service domain aligns with the `labels.ambassador` mapping configuration.
- The final Flux Kustomization depended on `emissary-helm`, but no Kustomization with that name was defined in the post. I changed it to `emissary-ingress-install` to represent the Kustomization that should apply the installation manifests.

## Review Notes
The examples remain version-oriented around the Emissary Ingress 8.9.x Helm chart, which maps to Emissary 3.9.x. The upstream Emissary project has newer chart and application versions, so future updates should revisit chart versions and CRD installation once the post is refreshed for newer Emissary releases. Local `helm`, `kubectl`, and `flux` CLIs were not installed in this environment, so CLI behavior was checked against official documentation and the published Helm repository index rather than local command help.
