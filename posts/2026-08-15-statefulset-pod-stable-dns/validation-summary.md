# Validation Summary: Resolve One StatefulSet Pod by Its Stable Service DNS Name

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- StatefulSet
- Headless Service
- Kubernetes cluster DNS / CoreDNS
- EndpointSlice
- IPv4/IPv6 Service configuration
- kubectl
- BIND `dig`
- nginx container image

## Sources Consulted
- Kubernetes StatefulSets and stable network identity: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes headless Services: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Kubernetes Service API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/
- Kubernetes IPv4/IPv6 dual-stack Services: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes StatefulSet basics tutorial: https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/
- Kubernetes DNS debugging guide: https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/
- Kubernetes `agnhost:2.39` image Dockerfile: https://github.com/kubernetes/kubernetes/blob/1290d6a4c0c5cc4f758b428993d2c3760d9cf279/test/images/agnhost/Dockerfile
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl get` reference and output formats: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/ and https://kubernetes.io/docs/reference/kubectl/
- Kubernetes `kubectl exec` and JSONPath references: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/ and https://kubernetes.io/docs/reference/kubectl/jsonpath/
- ISC BIND 9 `dig` manual: https://bind9.readthedocs.io/en/stable/manpages.html#dig-dns-lookup-utility
- Docker Official Image documentation for nginx: https://hub.docker.com/_/nginx

## Issues Found
- The DNS test command referenced `registry.k8s.io/e2e-test-images/dnsutils:1.3`, whose registry manifest does not exist, so the Pod could not pull the image. I changed it to `registry.k8s.io/e2e-test-images/agnhost:2.39`, the image used by the current Kubernetes DNS debugging guide. Its Linux image contains `/usr/bin/dig`, and `--command -- dig` correctly overrides the image entrypoint.
- The post said to query `AAAA` based on whether the cluster was IPv6 or dual-stack. DNS record families are determined by the governing Service's configured IP families, and the shown selector-based headless Service defaults to `SingleStack` when `ipFamilyPolicy` is omitted, even on a dual-stack cluster. I changed the guidance to query `AAAA` instead of `A` for an IPv6-only Service and to query both for a dual-stack Service.

## Review Notes
- The examples assume that the `data` namespace already exists.
- The shorter DNS forms depend on the Pod's resolver search list. Windows Pods handle dotted partially qualified names differently; the absolute name with a trailing dot remains the resolver-independent diagnostic form recommended by the post.
- With `publishNotReadyAddresses: true`, Kubernetes-generated EndpointSlices report endpoints as ready for Service consumers even when the backing Pod's own Ready condition is false. The post correctly distinguishes discoverability from application readiness.
