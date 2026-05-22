# Validation Summary: How to Combine Istio with Litmus Chaos for Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- LitmusChaos
- Kubernetes
- ChaosEngine and ChaosResult custom resources
- Istio VirtualService and DestinationRule resources
- Kubernetes RBAC

## Sources Consulted
- LitmusChaos operator v3.0.0 manifest: https://litmuschaos.github.io/litmus/litmus-operator-v3.0.0.yaml
- LitmusChaos 3.0.0 Kubernetes fault charts: https://github.com/litmuschaos/chaos-charts/tree/3.0.0/faults/kubernetes
- LitmusChaos ChaosEngine documentation: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/chaos-engine/contents/
- LitmusChaos HTTP probe documentation: https://litmuschaos.github.io/litmus/experiments/concepts/chaos-resources/probes/httpProbe/
- LitmusChaos pod network loss documentation: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-network-loss/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Bookinfo sample manifests for release 1.22: https://raw.githubusercontent.com/istio/istio/release-1.22/samples/bookinfo/platform/kube/bookinfo.yaml
- Kubernetes kubectl apply documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The LitmusChaos experiment install command used `charts/generic/experiments.yaml`, which does not exist in the LitmusChaos 3.0.0 chart layout. Changed it to `faults/kubernetes/experiments.yaml`, which matches the official 3.0.0 chaos-charts repository and Hub API path.
- The ChaosEngine examples omitted `spec.engineState: "active"`. Added it to each ChaosEngine snippet so the operator will run the experiments.
- The sample `litmus-admin` Role was missing permissions present in the official Litmus 3.0.0 Kubernetes fault manifests, including `configmaps`, `pods/log` watch access, additional workload owner resources, OpenShift deployment configs, replication controllers, Argo Rollouts, and delete permission for Litmus resources. Updated the Role so the listed pod-delete, pod-cpu-hog, and pod-network-loss experiments have the expected access.
- The HTTP probe `runProperties` used duration strings (`5s`) for `probeTimeout` and `interval`, while the Litmus HTTP probe examples use numeric second values. Changed them to `5`.
- The section titled "Creating a Litmus Workflow with Istio Validation" showed a ChaosEngine, not a Litmus workflow. Renamed the section and adjusted the surrounding text to describe a ChaosEngine with probes.
- The validation section said ChaosResult pass/fail is based on a steady-state hypothesis, but the earlier examples do not define probes. Clarified that results are based on the experiment verdict and any probes defined.

## Review Notes
- The Istio `VirtualService` timeout and retry fields and the `DestinationRule` outlier detection fields are valid in the current Istio networking API.
- The Bookinfo sample URLs for Istio release 1.22 are still valid, but the article is pinned to an older Istio sample release. A future refresh could update the walkthrough to a currently supported Istio release.
- LitmusChaos has newer releases than 3.0.0. The post is now internally consistent for the version it installs, but a future update could move the examples to the latest LitmusChaos chart version.
