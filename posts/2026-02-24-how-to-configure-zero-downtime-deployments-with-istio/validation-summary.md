# Validation Summary: How to Configure Zero-Downtime Deployments with Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio sidecar mode
- Istio VirtualService
- Istio DestinationRule
- Kubernetes Deployment rolling updates
- Kubernetes readiness and liveness probes
- Kubernetes container lifecycle hooks
- Kubernetes PodDisruptionBudget
- kubectl
- Fortio load testing

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The retry timeout explanation treated `attempts: 3` as three total tries. Istio defines `attempts` as retries, so the maximum number of requests is the initial request plus the configured retry attempts. Updated the note to say the 20-second route timeout includes the initial request and three 5-second retry windows.
- The PodDisruptionBudget section said the configuration ensures capacity is always maintained. Kubernetes documents PDBs as protection for voluntary evictions only, not a guarantee against all unavailability. Updated the wording to say it helps maintain capacity during planned maintenance.

## Review Notes
The YAML snippets use current Kubernetes `apps/v1` and `policy/v1` APIs and valid Istio `networking.istio.io/v1beta1` resources. Istio also documents `networking.istio.io/v1` examples for these traffic APIs in current docs, so a future update could move examples to `v1`, but the existing `v1beta1` snippets remain technically valid.
