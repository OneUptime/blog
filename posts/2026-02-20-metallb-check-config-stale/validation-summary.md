# Validation Summary: How to Check if MetalLB Configuration Is Valid or Stale

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes
- MetalLB
- MetalLB CRDs: IPAddressPool, L2Advertisement, BGPAdvertisement
- MetalLB validating webhooks
- Prometheus metrics
- kubectl
- jq

## Sources Consulted
- MetalLB Configuration documentation: https://metallb.io/configuration/
- MetalLB Troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- MetalLB Prometheus Metrics documentation: https://metallb.io/prometheus-metrics/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB Usage documentation: https://metallb.io/usage/index.html
- MetalLB v0.15.3 native install manifest: https://raw.githubusercontent.com/metallb/metallb/v0.15.3/config/manifests/metallb-native.yaml
- MetalLB v0.15.3 config validation source: https://raw.githubusercontent.com/metallb/metallb/v0.15.3/internal/config/config.go

## Issues Found
- The post described YAML syntax errors and webhook validation failures as causes of stale MetalLB configuration. MetalLB documentation distinguishes rejected API/webhook input from stale component configuration: stale configuration occurs when an accepted configuration cannot be loaded and MetalLB keeps using the last valid configuration. Updated the explanation and bullet list to make that distinction clear.
- The post implied validating webhooks catch all obvious errors. MetalLB documentation says webhooks validate CRs but not every invalid global configuration is blocked. Updated the wording to "many obvious errors."
- The problematic log examples used non-canonical message text. MetalLB troubleshooting documentation describes config errors in the form "failed to parse the configuration"; updated the example and used a current "new configuration rejected" style error.
- The stale metric example checked only one speaker pod. MetalLB documentation says the stale metric describes the given component, and the controller and speakers validate different parts of the configuration. Updated the example to check the controller and a speaker.
- The force-reload section implied restart alone fixes stale configuration. Updated it to say to fix the invalid configuration first, then restart components to force a reload.
- The post said all MetalLB CRDs must be in the `metallb-system` namespace. Official docs say resources must be in the same namespace where MetalLB is deployed, with `metallb-system` as the default manifest namespace. Updated the wording.
- The overlapping pools section said overlapping ranges can cause unpredictable behavior. MetalLB validates pools as non-overlapping and treats overlap as invalid configuration. Updated the statement.

## Review Notes
The commands assume the default native manifest names, labels, namespace, and metrics port. Clusters installed with Helm or customized manifests may need namespace or selector adjustments.
