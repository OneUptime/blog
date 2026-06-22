# Validation Summary: How to Troubleshoot Service Discovery Issues in Kubernetes

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes Services and DNS-based service discovery
- CoreDNS / kube-dns
- EndpointSlices and service backends
- Kubernetes readiness probes
- Kubernetes NetworkPolicy
- kubectl troubleshooting commands
- BusyBox, dnsutils, and netshoot debugging containers
- Istio VirtualService
- Python requests retry pattern

## Sources Consulted
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes DNS debugging documentation: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Pod lifecycle and readiness documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Istio VirtualService documentation: https://istio.io/latest/docs/reference/config/networking/virtual-service/

## Issues Found
- The debug pod creation commands passed `sleep` and `nslookup` as container arguments instead of explicit commands. Updated the `kubectl run` examples to use `--command --`, matching the current kubectl reference.
- The BusyBox `wget` example used a long timeout flag that is less portable across BusyBox builds. Updated it to `-T 5`.
- The post used the legacy `Endpoints` API for backend inspection. Kubernetes marks Endpoints as deprecated as of v1.33 and recommends EndpointSlices, so the troubleshooting commands and summary text now use `kubectl get endpointslices -l kubernetes.io/service-name=...`.
- The selector mismatch Deployment manifest was incomplete for `apps/v1` because it omitted required Deployment fields. Added minimal `metadata`, `spec.selector`, and container fields so the snippet is a valid Deployment example.
- The readiness probe explanation implied unready pods are simply not added to endpoints. Updated it to say they are not used as ready service endpoints by default, which is more accurate for modern EndpointSlice behavior.
- The cross-namespace note vaguely suggested configuring a Service to reference another namespace. Clarified that a local `ExternalName` alias is the Kubernetes-native way to create a short local name.
- The `dig +trace` example was not appropriate for Kubernetes cluster-local DNS because cluster-local zones are served by the cluster DNS service, not by the public DNS root hierarchy. Replaced it with a search-path lookup example.

## Review Notes
The remaining examples are technically sound for a general Kubernetes troubleshooting guide. The kube-proxy and iptables checks are cluster-implementation dependent; clusters using eBPF or IPVS may require different low-level inspection commands, but the guidance is still valid for kube-proxy/iptables deployments.
