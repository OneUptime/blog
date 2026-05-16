# Validation Summary: How to Set Up External Traffic Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Services
- Kubernetes LoadBalancer and NodePort traffic policy
- kube-proxy
- Cilium kube-proxy replacement
- MetalLB
- EndpointSlices

## Sources Consulted
- Kubernetes documentation: Using Source IP - https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes documentation: Create an External Load Balancer - https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/
- Kubernetes kubectl reference: kubectl expose - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes documentation: EndpointSlices - https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Talos Linux / Sidero documentation: Deploy Cilium CNI - https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Cilium documentation: Kubernetes Without kube-proxy - https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- MetalLB documentation: Troubleshooting service advertisements - https://metallb.universe.tf/troubleshooting/

## Issues Found
- The health check node port section implied that Kubernetes always allocates `healthCheckNodePort` when `externalTrafficPolicy: Local` is used. I changed the wording to specify LoadBalancer services, because Kubernetes only uses user-specified `healthCheckNodePort` when `type: LoadBalancer` and `externalTrafficPolicy: Local` are set.
- The Cilium/Talos example incorrectly placed raw Cilium Helm values under Talos `cluster.inlineManifests` and included `externalTrafficPolicy` as if it were a Cilium Helm value. I changed the section to clarify that `externalTrafficPolicy` remains a Kubernetes Service field, and that Talos should use rendered Cilium manifests with appropriate Helm values.
- The Cilium kube-proxy replacement values were incomplete for Talos. I updated the example to include the Talos-relevant `ipam.mode`, cgroup settings, security capabilities, and KubePrism API endpoint values shown in the official Talos Cilium guide.
- The DSR snippet was incomplete. I added `routingMode: native` and `loadBalancer.dsrDispatch: opt` to match Cilium's documented DSR configuration pattern.
- The source IP verification section told readers to look for `x-real-ip` or `x-forwarded-for` headers from the echo server. I changed it to use the `client_address` value as the primary check, matching Kubernetes source-IP documentation, and noted that forwarded headers only appear when an external proxy or load balancer adds them.

## Review Notes
The remaining Kubernetes Service manifests, `kubectl apply`, `kubectl get ... -o jsonpath`, `kubectl expose --overrides`, topology spread constraints, DaemonSet example, and EndpointSlice lookup are technically valid. MetalLB behavior depends on Layer 2 versus BGP mode, but the post's guidance to align speaker eligibility with local service endpoints is consistent with MetalLB's documented behavior for `externalTrafficPolicy: Local`.
