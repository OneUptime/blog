# Validation Summary: How to Set Up Network Service Mesh for Advanced L2 and L3 Kubernetes Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Network Service Mesh
- NSM NetworkService CRDs
- NSM forwarders and connection mechanisms
- SPIRE
- Kustomize
- VPP
- OVS
- VLAN and interdomain NSM examples

## Sources Consulted
- Network Service Mesh setup docs: https://networkservicemesh.io/docs/setup/run/
- Network Service Mesh examples index: https://networkservicemesh.io/docs/setup/examples/
- Network Service Mesh Kubernetes concepts: https://networkservicemesh.io/docs/concepts/k8s/
- Network Service Mesh component descriptions: https://networkservicemesh.io/docs/concepts/components_description/
- Network Service Mesh architecture and NetworkService match examples: https://networkservicemesh.io/docs/concepts/architecture/
- Network Service Mesh release history: https://networkservicemesh.io/docs/releases/history/
- Network Service Mesh v1.14.0 basic deployment README: https://github.com/networkservicemesh/deployments-k8s/blob/v1.14.0/examples/basic/README.md
- Network Service Mesh v1.14.0 deployment manifests and examples: https://github.com/networkservicemesh/deployments-k8s/tree/v1.14.0
- Kubernetes kubectl apply and Kustomize usage: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The installation section used the stale `helm.nsm.dev` chart and Helm values that do not match current NSM example deployment guidance. Replaced it with upstream Kustomize-based SPIRE and NSM installation commands for v1.14.0 examples.
- The post hard-coded NSM v1.11.0 images. Updated image references to v1.14.0 where the article uses upstream example manifests, matching the documented example branch.
- Several `NetworkService` examples used older or incorrect match field names such as `sourceSelector`, `destinationSelector`, and `route`. Updated the service-chain example to the documented `source_selector`, `routes`, and `destination_selector` form.
- The pod annotations omitted the mechanism prefix. Updated examples to use annotations such as `kernel://service-name/nsm-1`, matching NSM Kubernetes documentation.
- Several NSE examples used outdated environment variables such as `NSM_NETWORK_SERVICES`. Updated examples to use current variables shown in upstream manifests, including `NSM_SERVICE_NAMES`, `NSM_CIDR_PREFIX`, `NSM_PAYLOAD`, and `NSM_CONNECT_TO`.
- The external network section used a non-existent `cmd-nse-kernel` image and a made-up DaemonSet pattern. Replaced it with the upstream remote VLAN breakout example and corrected the client annotation to `kernel://kernel2rvlan-breakout/nsm-1`.
- The interdomain section used an invalid custom ConfigMap and an invalid `examples/interdomain?ref=v1.14.0` Kustomize URL. Replaced it with the documented two-cluster interdomain setup commands and aligned the floating interdomain service annotation with the upstream example.
- The troubleshooting registry log selector used `app=nsm-registry`, but the upstream registry manifest labels the pod with `app=registry`. Updated the selector.
- The performance section used Helm-style values and an unsupported ConfigMap implication. Replaced the resource example with a DaemonSet patch-style snippet and changed the MTU note to describe verifying the injected interface instead of implying a specific ConfigMap is consumed automatically.

## Review Notes
The corrected post now follows the upstream NSM v1.14.0 example structure. NSM release history lists v1.15.0 as a newer release, but the public setup/examples pages reviewed still point readers at v1.14.0 example manifests, so the post uses v1.14.0 consistently for runnable examples.
