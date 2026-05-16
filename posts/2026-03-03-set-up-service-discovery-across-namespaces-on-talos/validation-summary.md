# Validation Summary: How to Set Up Service Discovery Across Namespaces on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Services and namespaces
- Kubernetes DNS / CoreDNS
- Kubernetes NetworkPolicy
- Kubernetes EndpointSlice
- kubectl
- YAML

## Sources Consulted
- Kubernetes documentation: Namespaces and DNS - https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes documentation: DNS for Services and Pods - https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes documentation: Services, including ExternalName Services and service ports - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: Network Policies and default deny egress behavior - https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: kubectl run reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: EndpointSlices and Endpoints deprecation - https://kubernetes.io/docs/tasks/administer-cluster/enabling-endpointslices/
- Kubernetes blog: Kubernetes v1.33 Endpoints deprecation - https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes documentation: Customizing DNS Service / CoreDNS ConfigMap - https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- Talos Linux documentation: Discovery Service - https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/discovery
- Linux resolv.conf manual page for search domains and ndots behavior - https://man.archlinux.org/man/resolv.conf.5.en

## Issues Found
- The first cross-namespace curl example used port 8080 while the later Service manifest exposes port 80 and maps to targetPort 8080. Changed the example to use port 80 so it matches the Service clients would call.
- The post said using `postgres.data.svc.cluster.local` goes directly to the right DNS answer. With Kubernetes' default `ndots:5`, that name has fewer than five dots and may still be tried through search domains first unless queried as an absolute name. Changed the recommendation and example to use a trailing dot: `postgres.data.svc.cluster.local.`
- Several `kubectl run` examples passed a different executable after `--` without `--command`. The kubectl reference distinguishes custom args from replacing the container command. Added `--command --` to the `nslookup`, `sh -c`, and `wget` debug examples.
- The debugging section used `kubectl get endpoints`, but the Endpoints API is deprecated in Kubernetes v1.33 in favor of EndpointSlice. Replaced it with `kubectl get endpointslice -n backend -l kubernetes.io/service-name=api-server`.
- The NetworkPolicy section said DNS egress must be allowed when using default-deny policies in general, immediately after showing an ingress-only deny policy. Clarified this as default-deny egress policies.

## Review Notes
- The article is technically relevant and the overall approach is correct: cross-namespace service discovery on Talos uses standard Kubernetes DNS behavior.
- The examples assume the default Kubernetes cluster domain `cluster.local`; clusters with a custom domain should substitute their configured cluster domain.
- The DNS egress NetworkPolicy example is intentionally broad because it allows port 53 to any namespace. It is valid, but production clusters may prefer targeting the kube-system DNS pods or DNS service according to the CNI's NetworkPolicy capabilities.
