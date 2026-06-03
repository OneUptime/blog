# Validation Summary: How to Configure VPA updatePolicy to Auto, Recreate, or Off Modes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- PodDisruptionBudget
- kubectl
- Kubernetes resource requests

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- VPA autoscaling.k8s.io/v1 Go API reference: https://pkg.go.dev/k8s.io/autoscaler/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1
- Kubernetes kubectl set resources reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- VPA updater configuration source: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/config/config.go
- VPA recommender configuration source: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/config/config.go

## Issues Found
- The post described VPA as having three update policies and treated `Auto` and `Recreate` as interchangeable primary modes. Current upstream documentation lists `Recreate` as the explicit eviction-based mode and marks `Auto` as deprecated. Updated the mode list and examples to prefer `Recreate`, while noting that `Auto` is currently a deprecated alias.
- The "Auto Mode" sections and recommendations used deprecated `updateMode: "Auto"` for eviction-based updates. Renamed those sections and examples to `Recreate` mode to match current VPA guidance.
- The post stated that VPA reacts to a threshold "typically 10%" and showed VPA Recommender flags as update aggressiveness controls. Upstream source shows the eviction threshold and cadence are updater settings such as `--pod-update-threshold`, `--updater-interval`, and eviction rate flags. Updated the section to reference the VPA Updater and the appropriate flags.
- The container policy section said `mode: "Off"` still provides recommendations for the sidecar. The VPA API documentation states recommendations are not produced for containers with container scaling mode `Off`. Updated the wording to say the sidecar is left unchanged.
- The stateful workload pitfall said pod restarts can cause data loss. That is too absolute for VPA behavior. Reworded it to describe outages and operational risk.

## Review Notes
The reviewed examples use `autoscaling.k8s.io/v1`, `policy/v1`, valid `updatePolicy` and `resourcePolicy` fields, and plausible `kubectl patch` / `kubectl set resources` syntax. Current VPA also supports newer in-place update modes (`InPlaceOrRecreate` and `InPlace`) under feature/version constraints; this post remains focused on Off, Initial, Recreate, and deprecated Auto behavior.
