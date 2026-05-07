# Validation Summary: How to Configure Auto-Scaling for Kubernetes Apps in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Kubernetes
- Horizontal Pod Autoscaler (HPA)
- Metrics Server
- `kubectl`

## Sources Consulted
- Portainer documentation: https://docs.portainer.io/sts/user/kubernetes/applications/add
- Kubernetes Horizontal Pod Autoscaling concepts: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- `kubectl autoscale` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_autoscale/
- `kubectl top node` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- Metrics Server repository and installation instructions: https://github.com/kubernetes-sigs/metrics-server
- Portainer source, auto-scaling form labels and CPU-only form fields: https://github.com/portainer/portainer/blob/develop/app/react/kubernetes/applications/components/AutoScalingFormSection/AutoScalingFormSection.tsx
- Portainer source, HPA payload shape and generated name: https://github.com/portainer/portainer/blob/develop/app/kubernetes/horizontal-pod-auto-scaler/converter.js
- Portainer source, HPA REST endpoint version used by the form flow: https://github.com/portainer/portainer/blob/develop/app/kubernetes/horizontal-pod-auto-scaler/rest.js

## Issues Found
- The prerequisites section omitted that Portainer also requires server metrics to be enabled for the environment, and it used `kubectl top nodes` instead of the documented `kubectl top node`. I corrected both.
- The Portainer UI instructions used field names that do not match current Portainer documentation. I updated them to the current labels: `Deployment`, `Enable auto scaling for this application`, `Minimum instances`, `Maximum instances`, `Target CPU usage`, and `Deploy application`.
- The “What Portainer Creates” example showed an `autoscaling/v2` multi-metric HPA named `my-app-hpa`. Current Portainer form behavior is CPU-only and uses the `autoscaling/v1` shape with `targetCPUUtilizationPercentage`, and the generated HPA name matches the application name. I replaced the example accordingly.
- The memory-based scaling section implied this could be configured directly in the Portainer form. Current Portainer documentation and source indicate the form exposes CPU-based autoscaling only. I clarified that memory scaling requires editing the generated HPA and switching to `autoscaling/v2`, and I replaced the fragment with a valid example.
- The CLI section used the outdated `kubectl autoscale --cpu-percent` flag and then referred to an HPA name that would not match the object created by the command. I updated the command to `--cpu=70%` and aligned the `describe` and `delete` examples to `my-app`.
- The scaling behavior section did not state that `behavior` is part of the `autoscaling/v2` schema, not the `autoscaling/v1` object Portainer’s form creates. I added that requirement.
- The conclusion stated only CPU requests were required. I clarified that memory requests are also needed when scaling on memory utilization.

## Review Notes
- Kubernetes currently documents `autoscaling/v2` as the stable HPA API for memory metrics and advanced behavior, but Portainer’s application form still exposes the older CPU-only HPA flow. Advanced HPA configuration therefore requires a post-deployment manifest edit outside the basic Portainer form.
