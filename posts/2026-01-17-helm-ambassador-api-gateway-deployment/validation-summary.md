# Validation Summary: Deploying Ambassador API Gateway with Helm

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Helm
- Kubernetes
- Emissary-ingress 3.9.0
- Ambassador Edge Stack 3.9.0
- Envoy Proxy
- Ambassador/Emissary CRDs: Listener, Host, Mapping, Filter, FilterPolicy, RateLimitService, RateLimit, TLSContext, Module
- Prometheus Operator ServiceMonitor and PrometheusRule resources

## Sources Consulted
- Emissary-ingress Helm installation documentation: https://emissary-ingress.dev/docs/3.6/topics/install/helm/
- Emissary-ingress 3.9.0 CRDs: https://app.getambassador.io/yaml/emissary/3.9.0/emissary-crds.yaml
- Ambassador Edge Stack 3.9.0 CRDs: https://app.getambassador.io/yaml/edge-stack/3.9.0/aes-crds.yaml
- Datawire Helm chart repository index: https://app.getambassador.io/index.yaml
- Emissary-ingress Helm chart 8.9.0 values: https://datawire-static-files.s3.amazonaws.com/charts/emissary-ingress-8.9.0.tgz
- Ambassador Edge Stack Helm chart 8.9.0 values: https://datawire-static-files.s3.amazonaws.com/charts/edge-stack-8.9.0.tgz
- Emissary-ingress Mapping documentation: https://emissary-ingress.dev/docs/3.9/topics/using/intro-mappings/
- Emissary-ingress traffic shadowing documentation: https://emissary-ingress.dev/docs/3.9/topics/using/shadowing/
- Emissary-ingress rate limit service documentation: https://emissary-ingress.dev/docs/3.6/topics/running/services/rate-limit-service/

## Issues Found
- The `edgectl` install command used `https://metriton.datawire.io/downloads/linux/edgectl`, which now redirects to a web application instead of a Linux binary. Removed the prerequisite command and the later `edgectl config view` troubleshooting command.
- The Helm installs did not pin chart versions. Added `--version 8.9.0` so the chart version matches the post's Emissary/Edge Stack 3.9.0 image examples.
- The Edge Stack values placed Emissary subchart settings such as `image`, `service`, `resources`, `affinity`, and `autoscaling` at the top level. Moved them under `emissary-ingress`, as required by the Edge Stack chart.
- The Edge Stack HPA example used `targetCPUUtilizationPercentage`, which is not the value shape for the 8.9.0 chart. Replaced it with the chart's `autoscaling.metrics` structure.
- The Edge Stack install omitted the Edge Stack CRD installation step. Added `kubectl apply -f https://app.getambassador.io/yaml/edge-stack/3.9.0/aes-crds.yaml` and the corresponding `emissary-apiext` wait before installing the chart.
- The regex Mapping used `prefix_regex_rewrite`, which is not present in the 3.9.0 Mapping CRD. Removed that field and kept the supported `regex_rewrite` configuration.
- The `RateLimit` resource used `apiVersion: getambassador.io/v3alpha1`, but the Edge Stack 3.9.0 CRD serves `RateLimit` as `getambassador.io/v1beta1` and `getambassador.io/v1beta2`. Updated the example to `getambassador.io/v1beta1`.
- The traffic shadowing example used a nonexistent `shadow_service` Mapping field. Replaced it with a second Mapping for the shadow destination and set `shadow: true` on that Mapping.

## Review Notes
- The post is version-scoped to Emissary-ingress and Ambassador Edge Stack 3.9.0. Current Emissary v4 installation guidance differs and uses OCI Helm charts, but the 3.9.0-era Datawire repository and chart version are valid for the post's pinned version.
- The YAML examples were parsed locally after editing. `helm` and `kubectl` were not installed in the review environment, so chart rendering and live cluster validation were not run.
