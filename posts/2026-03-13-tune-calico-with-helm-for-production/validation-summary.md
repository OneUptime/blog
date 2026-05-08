# Validation Summary: Tune Calico with Helm for Production

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Calico Open Source
- Tigera Operator Helm chart
- Kubernetes
- Helm v3
- Calico FelixConfiguration
- calicoctl
- Flux HelmRelease

## Sources Consulted
- Calico Helm install documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico MTU configuration documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico calicoctl patch reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Project Calico v3.28.0 Helm chart values/templates: https://github.com/projectcalico/calico/tree/v3.28.0/charts/tigera-operator
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/

## Issues Found
- The post claimed that all performance and behavior settings, including Felix tuning, should be expressed as Helm values. The Tigera Operator chart exposes installation settings as Helm values, while Felix tuning is managed through `FelixConfiguration` resources. Updated the introduction and conclusion to distinguish installation-time Helm values from Felix resource configuration.
- The Helm values example used a non-existent `tigera-operator:` values key for operator pod resources. The v3.28.0 chart reads operator pod resources from top-level `resources`, so the example was corrected.
- The values example labeled `nodeMetricsPort` and `typhaMetricsPort` as calico-node DaemonSet resource limits. Those fields enable metrics ports, not CPU/memory limits. Updated the comment and added a correct `installation.calicoNodeDaemonSet.spec.template.spec.containers[].resources` example for calico-node resources.
- The Step 2 lead-in said the values file contained all tuning parameters, which was inaccurate because Felix tuning appears later as a Calico resource patch. Updated it to refer to installation tuning parameters.
- The Step 4 heading referred to "Helm Post-Install," but the command patches a Calico `FelixConfiguration` resource with `calicoctl`, not a Helm post-install hook. Updated the heading and explanatory sentence.

## Review Notes
- The post pins Calico chart version `v3.28.0`; that version exists, and the chart layout was checked against the corresponding Project Calico tag. New deployments should consider validating against the currently supported Calico release before adopting the exact version pin.
- The Flux `HelmRelease` snippet uses the current `helm.toolkit.fluxcd.io/v2` API shape for inline values, but a complete GitOps deployment would also include the matching `HelmRepository` resource.
