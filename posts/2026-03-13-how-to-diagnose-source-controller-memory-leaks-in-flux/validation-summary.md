# Validation Summary: How to Diagnose Source Controller Memory Leaks in Flux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux source-controller
- Kubernetes
- Prometheus and PromQL
- Go pprof
- HelmRepository and GitRepository Flux APIs
- kubectl and Flux CLI

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux advanced debugging documentation for pprof: https://fluxcd.io/flux/gitops-toolkit/debugging/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI documentation for `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI documentation for `flux create source helm`: https://fluxcd.io/flux/cmd/flux_create_source_helm/
- Flux upgrade documentation: https://fluxcd.io/flux/installation/upgrade/
- Flux source-controller release manifest: https://github.com/fluxcd/source-controller/releases/download/v1.8.4/source-controller.deployment.yaml
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The post used `rate()` on `container_memory_working_set_bytes`, which is a gauge. Changed the query to `deriv()` and adjusted the explanation from "positive rate" to "positive slope" because Prometheus documents `deriv()` and `predict_linear()` for gauges.
- The Prometheus alert compared the projected memory series to `kube_pod_container_resource_limits` without vector matching and used a 1.5x threshold while the annotation said the controller was projected to exceed its limit. Added `on(namespace, pod, container)` matching and changed the comparison to the actual configured memory limit.
- The post said source-controller clones Git repositories into memory. Changed this to say it clones repositories and packages them into artifacts, which can increase temporary disk and memory use while artifacts are built.
- The post suggested `flux get sources git --all-namespaces` to check source sizes. Replaced it with a `kubectl get gitrepositories` JSONPath command that reads `.status.artifact.size`, which is the field Flux documents for artifact size.
- The post described artifact caching as unbounded and memory-related. Changed this to clarify that source-controller stores artifacts on disk under `/data` and prunes old artifacts according to retention settings.
- The pprof section said profiling needed to be enabled. Flux documentation says GitOps Toolkit components serve pprof data on the metrics HTTP server by default, so the wording was changed to "access" profiling.
- The summary listed unbounded artifact caching as a typical cause of source-controller memory leaks. Updated it to focus on large repositories, large Helm indexes, aggressive reconciliation, and version-specific bugs.

## Review Notes
- The Flux `HelmRepository` `spec.type: oci` example is still valid, but Flux documentation notes that OCI-type HelmRepository is in maintenance mode and recommends `OCIRepository` for improved OCI Helm chart support.
- The `kubectl top` commands require Metrics Server or another metrics API provider to be available in the cluster.
