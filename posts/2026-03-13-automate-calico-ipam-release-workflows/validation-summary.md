# Validation Summary: How to Automate Calico IPAM Release Workflows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Calico IPAM
- calicoctl
- Kubernetes
- kubectl
- Bash
- EndpointSlices

## Sources Consulted
- Calico `calicoctl ipam check` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico `calicoctl ipam release` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- Calico `calicoctl ipam show` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico IP address management documentation: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice for v1.33: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/

## Issues Found
- The original pod IP collection parsed the seventh column from `kubectl get pods -o wide`, which is brittle and did not filter to actually running pods despite the surrounding text saying "currently running." Changed it to use `--field-selector=status.phase=Running` and JSONPath over `.status.podIPs`.
- The original endpoint verification used `kubectl get endpoints`, but the Endpoints API is deprecated as of Kubernetes 1.33. Changed the verification to query `endpointslices.discovery.k8s.io`.
- The original endpoint check used `grep -c "${ip}" || echo 0`, which can produce two zero lines when there are no matches because `grep -c` prints `0` and exits non-zero. Replaced it with a direct `grep -Fxq` condition.

## Review Notes
The post is technically relevant and the Calico commands shown are current in Calico Open Source 3.32 documentation. The examples focus on IPv4 addresses because the regex extracts IPv4 literals only; future improvements could add IPv6 handling for dual-stack clusters.
