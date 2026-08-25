# Validation Summary: How to Account for Startup Spikes and OOM Events in VPA Memory Recommendations

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes
- Vertical Pod Autoscaler (VPA) 1.7.x
- VPA Recommender, Updater, and Admission Controller
- VPA `PerVPAConfig` and `CPUStartupBoost` alpha feature gates
- Kubernetes resource metrics, container OOM handling, and in-place Pod resize
- `kubectl` and `jq`

## Sources Consulted

- [VPA 1.7.1 installation and Kubernetes compatibility](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/installation.md#compatibility)
- [VPA 1.7.1 component flags and recommender defaults](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/flags.md)
- [VPA 1.7.1 API reference](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/api.md)
- [VPA 1.7.1 OOM bump example](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/examples.md#custom-memory-bump-up-after-oomkill)
- [VPA 1.7.1 OOM sample calculation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/recommender/model/container.go#L205-L225)
- [VPA 1.7.1 OOM Pod-status and eviction-Event observer](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/recommender/input/oom/observer.go#L62-L207)
- [VPA 1.7.1 updater quick-OOM logic](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/priority/update_priority_calculator.go#L99-L154)
- [VPA 1.7.1 CPU Startup Boost documentation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/features.md#cpu-startup-boost)
- [VPA 1.7.1 CPU Startup Boost admission implementation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/admission-controller/resource/pod/patch/resource_updates.go#L60-L225)
- [VPA per-object component configuration AEP](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/enhancements/8026-per-vpa-component-configuration/README.md)
- [VPA CPU Startup Boost AEP](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/enhancements/7862-cpu-startup-boost/README.md)
- [VPA native-sidecar support proposal](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/enhancements/8905-native-sidecar-support/README.md)
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/docs/known-limitations.md)
- [Kubernetes Vertical Pod Autoscaling documentation](https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/)
- [Kubernetes KYAML KEP discussion of YAML 1.1 boolean parsing](https://github.com/kubernetes/enhancements/blob/master/keps/sig-cli/5295-kyaml/README.md#motivation)
- [Kubernetes ContainerStatus API](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/#containerstatus)
- [Kubernetes container resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes Metrics Server FAQ](https://github.com/kubernetes-sigs/metrics-server/blob/master/FAQ.md)
- [Kubernetes startup-probe documentation](https://kubernetes.io/docs/concepts/workloads/pods/probes/#startup-probe)
- [Kubernetes sidecar-container documentation](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)

## Issues Found

- The introduction said a brief CPU burst could simply fall between resource-metrics scrapes. CPU resource metrics are rates over cumulative CPU counters and are reported as an average over a window, so a burst in a surviving container is normally averaged down rather than missed outright. The wording now distinguishes window averaging from a short-lived container ending before a usable sample, and it no longer implies that each recommender fetch is guaranteed to return fresh data.
- The memory-default description did not state that peaks are produced per container instance before being combined. It now says that the default is one peak per container instance per 24-hour interval, with an eight-interval aggregation window and a 24-hour decay half-life.
- The OOM explanation treated every applicable observation as though its basis came from the container request. Pod-status `OOMKilled` observations use the request, while memory-pressure eviction Events provide `offending_containers_usage`. The post now describes both inputs and accurately compares either one with the current interval's non-OOM peak. `uncappedTarget` is also described as the pre-policy target rather than purely usage-driven demand because synthetic OOM evidence contributes to it.
- The VPA manifest used unquoted `updateMode: Off`. Kubernetes-compatible YAML 1.1 interprets bare `Off` as a boolean, but the VPA API requires the string enum `Off`. The value is now quoted.
- The post implied that `minAllowed` preserved the live startup floor in the shown `Off` mode. In that mode VPA publishes recommendations but does not apply them. The text now says that `minAllowed` bounds the recommendation and that the actual startup request must remain in the workload manifest while actuation is off; `maxAllowed` is likewise described as preserving schedulability when VPA applies recommendations.
- The CPU Startup Boost explanation omitted its fallback base. The post now states that VPA boosts a nonzero CPU recommendation, falls back to the Pod's original request when no recommendation is available (including VPA-level `Off` mode), and that the updater attempts the later in-place unboost after readiness and the configured duration.
- The `jq` example requested `lastTerminationState`, which is the Go struct concept but not the Pod JSON field. It now reads the actual `.lastState` field.

## Review Notes

- The numeric VPA defaults, OOM formula, non-compounding behavior, quick-OOM threshold and eligibility rules, `RequestsOnly` behavior, request-to-limit ratio handling, feature-gate placement, and CPU Startup Boost YAML all match VPA 1.7.1.
- `PerVPAConfig` and `CPUStartupBoost` remain alpha and disabled by default in VPA 1.7.1. Their CRD fields and component gates should be rechecked when upgrading VPA.
- Current upstream source still skips metric samples for all init containers, including restartable init-container sidecars. Upstream has a proposal for feature-gated native-sidecar support targeted tentatively at VPA 1.8.0, so this statement is version-sensitive.
- `kubectl get events --sort-by=.lastTimestamp` remains accepted, although the newer `kubectl events` command is preferable for current event inspection.
