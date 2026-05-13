# Validation Summary: How to Configure Flagger Canary autoscalerRef for HPA

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flagger Canary custom resources
- Kubernetes Deployments
- Kubernetes HorizontalPodAutoscaler
- Kubernetes Metrics Server
- kubectl
- KEDA ScaledObject

## Sources Consulted
- Flagger documentation, "How it works": https://docs.flagger.app/usage/how-it-works
- Flagger documentation, "Canary analysis with KEDA ScaledObjects": https://v2-0.docs.fluxcd.io/flagger/tutorials/keda-scaledobject/
- Kubernetes documentation, "Horizontal Pod Autoscaling": https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes kubectl reference, "kubectl apply": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl reference, "kubectl get": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get
- Kubernetes kubectl reference, "kubectl set image": https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- KEDA documentation, "ScaledObject specification": https://keda.sh/docs/2.19/reference/scaledobject-spec/

## Issues Found
- The post incorrectly stated that Flagger creates a canary Deployment and a `-canary` HPA copy from the referenced HPA. Flagger documentation states that it creates `deployment/<targetRef.name>-primary` and `hpa/<autoscalerRef.name>-primary`; the original target Deployment is used as the canary workload. Updated the introduction, autoscaler explanation, diagram, verification commands, and conclusion to describe the generated primary Deployment and primary HPA accurately.
- The post described `autoscalerRef` as supporting "any autoscaler that follows the `scale` subresource pattern." Flagger's documented examples and behavior cover HPAs and KEDA ScaledObjects. Updated the wording to avoid overgeneralizing autoscaler support.
- The verification section expected `my-app-canary` HPA, but Flagger generates `my-app-primary` from an HPA named `my-app`. Updated the expected HPA names and the `kubectl describe` command.

## Review Notes
The Kubernetes HPA examples use the stable `autoscaling/v2` API, valid resource metric fields, and resource requests required for utilization-based CPU and memory scaling. The kubectl command forms are consistent with official generated kubectl references. Local `kubectl --help` verification was not possible because `kubectl` is not installed in the workspace.
