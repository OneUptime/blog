# Validation Summary: How to Deploy Nuclio Serverless with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nuclio
- Flux CD
- Kubernetes
- Helm
- Kustomize
- Python
- Kafka
- Serverless / FaaS

## Sources Consulted
- Nuclio Kubernetes installation documentation: https://docs.nuclio.io/en/latest/setup/k8s/getting-started-k8s.html
- Nuclio function configuration reference: https://docs.nuclio.io/en/latest/reference/function-configuration/function-configuration-reference.html
- Nuclio code-entry types reference: https://docs.nuclio.io/en/latest/reference/function-configuration/code-entry-types.html
- Nuclio Python runtime reference: https://docs.nuclio.io/en/latest/reference/runtimes/python/python-reference.html
- Nuclio HTTP trigger reference: https://docs.nuclio.io/en/latest/reference/triggers/http.html
- Nuclio Kafka trigger reference: https://docs.nuclio.io/en/latest/reference/triggers/kafka.html
- Nuclio official Helm chart repository index: https://nuclio.github.io/nuclio/charts/index.yaml
- Nuclio Helm chart values and templates: https://nuclio.github.io/nuclio/charts/nuclio-0.21.26.tgz
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/

## Issues Found
- The post claimed "nanosecond latency" for Nuclio. Official Nuclio materials describe high throughput and real-time/high-performance execution, but not nanosecond-latency runtimes. Changed the description and conclusion to avoid the unsupported latency claim.
- The introduction claimed NUMA-aware scheduling. I could not verify this as a Nuclio feature in the official docs, so I replaced it with Kubernetes placement controls, which Nuclio function specs support through fields such as `nodeSelector`, `affinity`, `priorityClassName`, and related pod scheduling settings.
- The HelmRelease pinned the old `0.15.*` chart while overriding Nuclio component images to `1.13.0-amd64`, which does not match the current official chart series. Updated the chart range to `0.21.*` and removed component image overrides so the chart's tested defaults are used.
- The Helm values used `dashboard.serviceType`, which is not a value in the current Nuclio chart. Removed it; the dashboard service is ClusterIP by default unless `dashboard.nodePort` is set.
- The Helm registry values used `defaultBaseRegistryURL` and `defaultOnbuildRegistryURL` as if they configured where built function images are pushed. Those fields are for pulling base/onbuild images. Changed the example to use `registry.pushPullUrl`.
- The chart would otherwise use the default Docker-based function builder. Nuclio's production Kubernetes documentation recommends Kaniko instead of mounting the Docker socket into the dashboard pod, so I added `dashboard.containerBuilderKind: kaniko`.
- The function example used Python 3.9, which Nuclio's current Python runtime docs list as end-of-life. Updated the example to Python 3.12.
- The function spec omitted `spec.handler`, required for Python functions. Added `handler: main:handler`.
- The function example placed raw inline Python under `build.functionSourceCode`, but Nuclio requires that field to contain base64-encoded source code. Replaced it with a base64-encoded version of the sample handler.
- The Python handler imported `nuclio` and returned `nuclio.Response`; current Nuclio Python examples use `context.Response` or `nuclio_sdk.Response`. Updated the encoded handler to return `context.Response`.
- The function triggers used deprecated `maxWorkers`. Replaced these with `numWorkers`, the current field in the Nuclio function configuration reference.
- The Kafka trigger used `url` for the broker address. The official Kafka trigger reference configures broker addresses under `attributes.brokers`, so the example was updated accordingly.
- The `flux get kustomizations nuclio nuclio-functions` command passed positional names, but the official Flux command synopsis is `flux get kustomizations [flags]`. Changed it to `flux get kustomizations`.
- The function port-forward command targeted `svc/event-processor`. Nuclio-generated function services are named with the `nuclio-` prefix in the documented internal invocation URL pattern, so the command now targets `svc/nuclio-event-processor`.
- The best-practices section referenced a `preemptionEnabled` feature, which I could not verify in Nuclio's current function spec. Replaced it with the documented Kubernetes-backed `priorityClassName` and `preemptionPolicy` fields.

## Review Notes
- I could not run `helm`, `flux`, or `kubectl` locally because those CLIs are not installed in this environment. I validated the manifests and commands against official documentation and the current Nuclio chart package instead.
- The example still assumes a reachable container registry and a cluster environment capable of building/pushing Nuclio function images. Production deployments should also configure registry credentials and may prefer Kaniko for in-cluster builds.
