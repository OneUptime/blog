# Validation Summary: How to Use Ephemeral Debug Containers for Network Diagnostics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes ephemeral containers
- kubectl debug
- kubectl cp
- Kubernetes networking and DNS
- Network diagnostics tools such as tcpdump, curl, dig, nslookup, nc, openssl, httping, and iperf3

## Sources Consulted
- Kubernetes documentation: Ephemeral Containers: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes documentation: Debug Running Pods: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod
- Kubernetes kubectl reference: kubectl debug: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl reference: kubectl version: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes kubectl reference: kubectl cp: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/

## Issues Found
- The post said ephemeral containers are not in the pod spec. They are stored in `spec.ephemeralContainers`, but are added through the `ephemeralcontainers` subresource rather than the normal `spec.containers` list or the workload pod template. Updated the explanation.
- The prerequisites used `kubectl version --short`, which is not listed in the current official `kubectl version` reference. Changed it to `kubectl version`.
- The post implied `--target` gives access to the same network namespace. Pods already share one network namespace; `--target` targets another container's process namespace when supported by the container runtime. Updated the examples and best-practice text.
- The tcpdump example was labeled as elevated privilege but did not request an elevated debug profile. Added `--profile=netadmin` and a stable container name.
- The `kubectl cp` example did not specify the ephemeral container that contained `/tmp/capture.pcap`. Added `-c net-debug` to match the named debug container.
- The best-practices section recommended resource limits for ephemeral containers, but Kubernetes disallows `resources` on ephemeral containers because pod resource allocations are immutable. Replaced this with guidance to use focused commands and an appropriate debug profile.

## Review Notes
`kubectl` was not installed in the local workspace, so command validation was performed against the current official Kubernetes command reference rather than local `kubectl --help` output. The examples are otherwise technically valid, assuming the user has RBAC permissions to update the `pods/ephemeralcontainers` subresource and the chosen debug image contains the listed tools.
