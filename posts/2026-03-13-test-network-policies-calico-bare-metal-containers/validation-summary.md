# Validation Summary: How to Test Network Policies with Calico on Bare Metal with Containers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl
- Calico Open Source
- Calico NetworkPolicy
- calicoctl
- BusyBox containers
- Kubernetes Services and DNS
- Linux iptables and eBPF dataplanes

## Sources Consulted
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes command and arguments for containers: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- Kubernetes namespaces and DNS: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico namespace policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico automatic labels: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico default deny behavior for Kubernetes pods: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico eBPF use cases: https://docs.tigera.io/calico/latest/operations/ebpf/use-cases-ebpf
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- BusyBox 1.37.0 wget help from the official busybox container image

## Issues Found
- The BusyBox client pods were created with `kubectl run ... -- sleep 3600`, which passes `sleep 3600` as container arguments rather than explicitly setting the container command. Updated both commands to use `--command -- sleep 3600` so the pods reliably stay running.
- The wget examples used GNU-style `--timeout=5`, which is not supported by BusyBox wget in the current official BusyBox image. Updated the examples to use BusyBox's supported `-T 5` timeout option.
- The post claimed eBPF dataplane policy overhead should be under `0.1ms`. Official Calico documentation describes the eBPF dataplane as focused on performance and latency, but does not guarantee a universal numeric overhead. Replaced the hard threshold with a version- and environment-dependent statement.

## Review Notes
The Calico `NetworkPolicy` YAML is syntactically consistent with Calico's `projectcalico.org/v3` policy model. The `namespaceSelector` using `kubernetes.io/metadata.name` is supported by current Calico documentation, and the selected backend pod should deny unmatched ingress once the policy applies. Future improvements could add explicit cleanup commands and a note that `api-server` as a short service name resolves from the backend namespace, while cross-namespace service access should use `api-server.backend` or the full service DNS name.
