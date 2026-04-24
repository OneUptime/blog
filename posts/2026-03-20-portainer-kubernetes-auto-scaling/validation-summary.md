# Validation Summary: How to Configure Auto-Scaling for Kubernetes Apps in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer
- Kubernetes
- Horizontal Pod Autoscaler (HPA)
- Metrics Server
- External metrics autoscaling
- Vertical Pod Autoscaler (VPA)
- `kubectl`

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Deployments docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Resource Metrics Pipeline docs: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- Kubernetes HPA walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Metrics Server README: https://github.com/kubernetes-sigs/metrics-server
- Portainer "Add a new application using a form" docs: https://docs.portainer.io/sts/user/kubernetes/applications/add
- Kubernetes autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Kubernetes autoscaler VPA known limitations: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md
- Kubernetes autoscaler VPA API reference: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md

## Issues Found
- Portainer UI section documented a memory threshold in the form-based autoscaling UI. Current Portainer docs document minimum instances, maximum instances, and target CPU usage only. Updated Step 2 and the conclusion to match Portainer's documented UI.
- The `Deployment` example was invalid for `apps/v1` because it omitted `.spec.selector` and matching pod template labels. Added the required selector and labels.
- Metrics Server was described as universally required for HPA. Updated the wording to clarify that Metrics Server is the typical provider for CPU/memory HPA metrics, while custom and external metrics use different APIs/adapters.
- The `--kubelet-insecure-tls` guidance was tied to specific cluster types rather than the actual certificate condition. Reworded it to match Metrics Server's documented kubelet certificate requirement.
- The HPA `behavior` comments described stabilization windows as fixed waits. Updated the comments to reflect that they smooth scaling decisions over a time window rather than simply adding a delay.
- The load-test example claimed to generate CPU load and implicitly assumed a reachable Service. Reworded it as request load and documented the Service assumption.
- Step 7 was labeled as custom metrics even though the manifest uses the `External` metric source. Updated the heading and inline comment to describe an external metrics adapter correctly.
- The VPA section suggested deprecated `updateMode: "Auto"` guidance and did not mention HPA/VPA interaction. Updated the text to use current explicit modes and added the upstream limitation that VPA should not be used with HPA on the same CPU or memory metric. Also corrected the `kubectl describe vpa` note to refer to request recommendations.

## Review Notes
- `autoscaling/v2` is the current stable HPA API and the post already used it correctly.
- Portainer's form UI is more limited than raw Kubernetes HPA manifests: the UI docs currently expose target CPU usage, while memory-based HPA remains something you configure directly in Kubernetes manifests.
- `InPlaceOrRecreate` in VPA depends on feature gates, so the post now avoids overstating it and only points readers to the explicit supported modes.
