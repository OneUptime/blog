# Validation Summary: How to Debug MetalLB Speaker and Controller with Ephemeral Containers

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Kubernetes
- kubectl
- Ephemeral containers
- MetalLB speaker and controller
- FRR / BGP mode
- Network debugging tools such as tcpdump, curl, nslookup, ip, ss, and vtysh

## Sources Consulted
- Kubernetes Ephemeral Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes Debug Running Pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Pods documentation: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes Share Process Namespace documentation: https://kubernetes.io/docs/tasks/configure-pod-container/share-process-namespace/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- MetalLB BGP mode documentation: https://metallb.io/concepts/bgp/

## Issues Found
- Corrected the explanation of ephemeral container namespace sharing. Ephemeral containers share the pod network namespace, but `kubectl debug --target` targets another container's process namespace when supported by the container runtime; it does not enable network namespace sharing.
- Replaced `kubectl version --short` with `kubectl version` because current official kubectl reference documentation no longer lists the `--short` flag.
- Clarified that MetalLB speaker pods expose node interfaces because the default speaker pod uses `hostNetwork`, not because of `--target`.
- Fixed a controller debugging comment that claimed to test connectivity to speaker pods while the command actually checks Kubernetes API server health.
- Corrected the FRR debugging section. An ephemeral container has its own filesystem and may not include FRR tools, so commands that inspect FRR configuration and BGP state should use the FRR container's own `vtysh` via `kubectl exec`; the ephemeral container example is now limited to process and packet-capture checks.
- Corrected the conclusion so `--share-processes` is described as applying to copied debug pods created with `--copy-to`, matching the kubectl debug reference.

## Review Notes
The post is technically relevant and accurate after the corrections. The examples still use placeholder pod names and IP addresses, which is appropriate for a tutorial, but readers must replace them with values from their own cluster.
