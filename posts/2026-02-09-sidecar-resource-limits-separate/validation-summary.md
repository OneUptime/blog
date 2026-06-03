# Validation Summary: Configure Sidecar Container Resource Limits Separately from Main Container

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes container resource requests and limits
- Kubernetes QoS classes
- Kubernetes LimitRange and ResourceQuota
- Kubernetes Vertical Pod Autoscaler
- Prometheus alerting rules and configuration
- Istio sidecar proxy resource annotations

## Sources Consulted
- Kubernetes resource management for Pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod Quality of Service classes: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio in-cluster operator deprecation announcement: https://istio.io/latest/blog/2024/in-cluster-operator-deprecation-announcement/
- Istio install with istioctl documentation: https://istio.io/latest/docs/setup/install/istioctl/

## Issues Found
- The post stated that Kubernetes resource requests and limits apply at the container level, not the pod level. Updated this to note that container-level settings are the common and relevant mechanism for independently sizing sidecars, while newer Kubernetes clusters also support pod-level resource specifications.
- The multi-sidecar example's aggregate CPU and memory totals were incorrect. Recalculated and corrected the totals to 1.375 CPU and 1504Mi requested, with 2.9 CPU and 3008Mi limits.
- The QoS section said QoS affects scheduling and that Guaranteed pods have the highest priority. Updated this to clarify that QoS primarily affects eviction behavior under node pressure, while scheduling primarily uses resource requests.
- The VPA example used deprecated `updateMode: "Auto"`. Changed it to `updateMode: "Recreate"` and added `controlledValues: RequestsOnly` so the example matches the prose about adjusting requests while leaving limits unchanged.
- The Prometheus ConfigMap defined an `alerts.yml` key but did not configure Prometheus to load it. Added `rule_files` to the Prometheus configuration.
- The `ApplicationResourceStarvation` alert inferred application starvation from the application using less than 50% of its own memory limit while a sidecar was near its limit, which was not a valid signal. Replaced it with a technically correct alert for simultaneous application and sidecar memory pressure using `and on(namespace, pod)`.

## Review Notes
The Istio `IstioOperator` API remains usable with `istioctl install -f`, but Istio's in-cluster operator was deprecated in Istio 1.23 and removed for later upstream releases. Future updates to this post could mention Helm or `istioctl` as the preferred current installation paths when discussing global Istio defaults.
