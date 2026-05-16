# Validation Summary: How to Troubleshoot Load Balancer Issues on Talos Linux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- Kubernetes Services
- Kubernetes EndpointSlices
- MetalLB
- kube-proxy
- Helm
- Linux networking, ARP, conntrack, and routing

## Sources Consulted
- MetalLB installation documentation: https://metallb.io/installation/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB usage documentation: https://metallb.io/usage/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes source IP documentation: https://kubernetes.io/docs/tutorials/services/source-ip/
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux networking resources documentation: https://docs.siderolabs.com/talos/v1.10/learn-more/networking-resources
- Talos Linux logging documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/logging-and-telemetry/logging

## Issues Found
- The MetalLB Helm install command assumed the Helm repository already existed. Added `helm repo add metallb https://metallb.github.io/metallb` before `helm install`, matching MetalLB's official Helm installation flow.
- The post used `kubectl get endpoints` in several places. Kubernetes v1.33 deprecated the legacy Endpoints API in favor of EndpointSlice, so these checks were updated to `kubectl get endpointslices -l kubernetes.io/service-name=my-app` and the debugging script was updated to inspect EndpointSlices.
- The traffic distribution wording implied `externalTrafficPolicy: Cluster` guarantees even distribution. Kubernetes uses cluster-wide endpoint selection in this mode, but it does not guarantee perfectly even traffic distribution. The comments were corrected to say that Cluster mode can select endpoints on any node.
- The Deployment example for rolling updates was missing the required `spec.selector` and matching `spec.template.metadata.labels` fields for `apps/v1` Deployments. Added both so the manifest is API-valid.
- The Talos command `talosctl services` is not the current documented command. Updated it to `talosctl service`, which lists service state when called without a service ID.

## Review Notes
The post still references `spec.loadBalancerIP` as a troubleshooting field. Kubernetes has deprecated this field since v1.24, but MetalLB still documents support for it for requesting specific IPs, so the mention is acceptable in a MetalLB troubleshooting context. Future updates could add `metallb.io/loadBalancerIPs` for dual-stack or provider-specific IP requests.
