# Validation Summary: How to Explain Kubernetes Services with Calico to Your Team

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services
- Kubernetes NetworkPolicy
- kubectl
- kube-proxy
- Calico
- Calico eBPF data plane
- Headless Services

## Sources Consulted
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Using Source IP tutorial: https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Calico eBPF documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico policy for service cluster IPs documentation: https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips

## Issues Found
- The client pod command used `kubectl run client --image=nicolaka/netshoot -- sleep 3600`, which passes `sleep 3600` as container arguments rather than explicitly overriding the image command. Updated it to `kubectl run client --image=nicolaka/netshoot --command -- sleep 3600`, matching the documented `kubectl run` syntax for setting a command.
- The kube-proxy versus Calico eBPF comparison described eBPF performance as "Constant (hash map)", which was too absolute. Updated it to "Lower latency and CPU using BPF maps", aligning with Calico's documented eBPF performance and BPF map behavior without overclaiming constant performance.
- The Service Network Policy section said to use `externalTrafficPolicy: Local` and match on the node IP range. Kubernetes and Calico document that Local mode preserves the original external source IP, so the policy should match the original external client IP range. Updated the text accordingly.

## Review Notes
The core explanation is correct: ClusterIP is a virtual service address, kube-proxy or Calico eBPF maps service traffic to backend pod IPs, in-cluster ClusterIP traffic preserves the client pod source IP, and headless Services return endpoint IPs directly through DNS without kube-proxy load balancing. The demonstration depends on the behavior and output shape of the third-party `ealen/echo-server` image; a future post revision could use the Kubernetes tutorial's `registry.k8s.io/echoserver:1.10` image for closer alignment with official examples, but that image has an AMD64-only caveat.
