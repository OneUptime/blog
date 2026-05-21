# Validation Summary: How to Tune Istiod for Large-Scale Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio and istiod
- IstioOperator installation configuration
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes namespace labels and kubectl commands
- Istio Sidecar resources
- Prometheus metrics and PromQL

## Sources Consulted
- Istio pilot-discovery command reference and exported environment variables: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio pilot-discovery exported metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/#exported-metrics
- IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio MeshConfig global options reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio configuration scoping guide: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio canary upgrades guide: https://istio.io/latest/docs/setup/upgrade/canary/
- Istio installation customization and overlay reference: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio official chart source for pilot extraContainerArgs: https://github.com/istio/istio/tree/master/manifests/charts/istio-control/istio-discovery

## Issues Found
- The post said discovery selectors save istiod from watching namespaces. Istio documentation notes that istiod still opens Kubernetes watches broadly, while discovery selectors reduce the configuration objects processed. Updated the wording from "tracking" to "processing" namespace resources.
- The Sidecar example used `networking.istio.io/v1beta1`. Updated it to the current `networking.istio.io/v1` API version used in the official Sidecar reference.
- The Kubernetes API tuning example used non-existent `PILOT_K8S_QPS` and `PILOT_K8S_BURST` environment variables. Replaced them with the current `pilot-discovery` flags `--kubernetesApiQPS` and `--kubernetesApiBurst` via `values.pilot.extraContainerArgs`.
- The API server tuning section claimed the listed flags reduce the number of Kubernetes resources istiod watches. Updated the text to describe the actual effects: disabling workload-entry and ServiceEntry pod-selection behavior only when unused, scoping gateway resources to namespaces, and reducing unnecessary gateway cluster configuration.
- The monitoring section labeled `pilot_push_triggers` as push queue size. The official metric is a push trigger counter by reason, not queue size. Updated the PromQL to use `rate(pilot_push_triggers[5m]) by (type)` and added `pilot_proxy_queue_time` for proxy queue latency.
- The canary upgrade commands added `istio.io/rev` without removing `istio-injection` or restarting workloads. Istio's canary upgrade guide says `istio-injection` takes precedence and workloads must be restarted for reinjection. Updated the commands to remove `istio-injection`, add `istio.io/rev`, and restart deployments.
- The canary log command used repeated `-l` selector flags. Updated it to a single combined selector: `app=istiod,istio.io/rev=canary`.

## Review Notes
Resource sizing values and "healthy" metric thresholds are operational starting points rather than universal Istio requirements. They are reasonable as guidance, but production sizing still needs load testing and ongoing monitoring for the specific mesh topology, Istio version, enabled features, and control-plane hardware.
