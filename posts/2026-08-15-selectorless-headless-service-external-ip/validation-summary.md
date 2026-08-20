# Validation Summary: Point a Selectorless Headless Service at an External IP

## Status
validated

## Post Type
Technical guide / Kubernetes configuration tutorial

## Technologies Covered
- Kubernetes Services
- Selectorless and headless Services
- EndpointSlice (`discovery.k8s.io/v1`)
- Kubernetes DNS and CoreDNS
- `kubectl`
- BusyBox `nc`
- Kubernetes NetworkPolicy
- ExternalName Services

## Sources Consulted
- [Kubernetes Service concepts](https://kubernetes.io/docs/concepts/services-networking/service/) - selectorless Services, custom EndpointSlices, headless Service behavior, endpoint-address restrictions, API-server proxy restrictions, Endpoints deprecation, and ExternalName caveats.
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) - headless Service A/AAAA records, endpoint hostnames, named-port SRV records, readiness behavior, and configurable cluster-domain naming.
- [Kubernetes DNS-Based Service Discovery specification](https://github.com/kubernetes/dns/blob/master/docs/specification.md) - authoritative headless Service A/AAAA and SRV record formats.
- [Kubernetes EndpointSlice concepts](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/) - address families, endpoint conditions, management labels, ownership, port grouping, and multi-slice aggregation.
- [Kubernetes EndpointSlice v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/) - schema validation for `addressType`, ports, addresses, `hostname`, and `conditions.ready`, including nil readiness and multi-address semantics.
- [Kubernetes Service v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/) - headless Service `targetPort`, selector, port-name, protocol, and default type semantics.
- [Kubernetes NetworkPolicy concepts](https://kubernetes.io/docs/concepts/services-networking/network-policies/) - CNI enforcement requirements and implementation-dependent handling of external traffic and address translation.
- [`kubectl run` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/), [`kubectl apply` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/), and [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) - command syntax and flags used in the post.
- [CoreDNS Kubernetes plugin](https://coredns.io/plugins/kubernetes/) - EndpointSlice watching, endpoint hostname selection, readiness filtering, and DNS TTL behavior.
- [BusyBox `nc` command reference](https://busybox.net/downloads/BusyBox.html#nc) - availability and meaning of the `-v`, `-z`, and `-w` options; the exact command was also checked against the `busybox:1.36.1` image.

## Issues Found
1. **Unstated namespace prerequisite** - The resources and commands use the `data` namespace, but a namespace is not created by the manifest. On a fresh cluster, the apply and test commands would fail. Added a sentence requiring the namespace to exist before applying the resources.
2. **Hard-coded cluster DNS domain** - The three `dig` examples use `cluster.local`, but Kubernetes cluster domains are configurable. Clarified that the examples assume the common `cluster.local` domain and that readers must replace the suffix when their cluster uses another domain.
3. **Ambiguous endpoint replacement instruction** - "Add the new healthy address" could be read as adding a second value to one EndpointSlice endpoint's `addresses` array. Kubernetes defines no semantics for addresses beyond the first and kube-proxy ignores them. Clarified that the new address must be added as a separate `endpoints` entry and that the old endpoint is later marked unready or removed.

## Review Notes
- The Service and EndpointSlice YAML passed strict client-side `kubectl` schema validation. `discovery.k8s.io/v1` is the current stable EndpointSlice API, and all field names and values in the example are valid.
- The Service-to-EndpointSlice label, manager label, matching named ports, address-family handling, explicit readiness, hostname-specific A record, and SRV query are correct.
- The exact `busybox:1.36.1` image supports the `nc -vz -w 3` invocation shown.
- The API-server proxy restriction for selectorless Services, the NetworkPolicy/CNI caveat, and the numeric-IP ExternalName warning match current Kubernetes documentation.
- The core/v1 Endpoints API has been deprecated since Kubernetes v1.33; EndpointSlice is the appropriate API for this guide.
- The existing EndpointSlice API link in the post remains functional but redirects to the newer canonical `/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/` path.
- The `dig` commands must be run in an environment with `dig` installed that uses the cluster DNS service, as the post's "from inside the cluster" instruction implies.
