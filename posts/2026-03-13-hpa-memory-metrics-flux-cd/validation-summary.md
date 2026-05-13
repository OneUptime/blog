# Validation Summary: How to Configure HPA Based on Memory with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Deployments
- Kubernetes resource requests and limits
- Kubernetes metrics-server and resource metrics
- kubectl
- Flux CD Kustomization
- Vertical Pod Autoscaler
- PodDisruptionBudgets

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The memory HPA example said that 409Mi "triggers scaling." I changed this to say that 409Mi is the 80% target before HPA tolerance and stabilization behavior, because Kubernetes applies tolerance and configurable behavior when calculating replica changes.
- The scale-up behavior comment said the HPA would "wait 2 min." I changed this to "smooth transient memory spikes over a 2 min window," which better matches Kubernetes stabilization behavior.
- The combined CPU and memory HPA targeted a Deployment named `myapp`, but the tutorial defines `myapp-worker`. I updated the HPA name and `scaleTargetRef.name` to consistently target `myapp-worker`.
- The verification step used `kubectl run memory-hog` to create a standalone pod. A standalone pod in the same namespace is not selected by the HPA target and would not affect scaling for `myapp-worker`. I replaced it with guidance to generate load that increases memory in the target `myapp-worker` pods.
- The combined metrics comment said HPA scales when either metric exceeds its target. I updated it to say HPA calculates replicas for each metric and uses the highest recommendation, which is the behavior described by Kubernetes.

## Review Notes
The examples use the current stable `autoscaling/v2` HPA API and current Flux `kustomize.toolkit.fluxcd.io/v1` Kustomization API. The Flux `targetNamespace` value assumes the `myapp` namespace already exists or is included in the reconciled manifests, which is required by Flux.
