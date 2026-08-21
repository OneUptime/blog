# Validation Summary: How to Reach Headless Services Across Namespaces with an FQDN

## Status

validated

## Post Type

Technical tutorial and troubleshooting guide

## Technologies Covered

- Kubernetes Services and headless Services
- Kubernetes StatefulSets
- Kubernetes DNS and CoreDNS
- DNS A, AAAA, and SRV records
- Kubernetes namespaces and DNS search paths
- EndpointSlices and readiness conditions
- Kubernetes NetworkPolicy
- `kubectl`, `dig`, and BusyBox `nc`
- PostgreSQL 17 container image and readiness checks

## Sources Consulted

- [Kubernetes: DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes: Namespaces and DNS](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#namespaces-and-dns)
- [Kubernetes: Services and headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes: StatefulSet stable network identity and Pod management policies](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes: EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes API: Service v1, including `publishNotReadyAddresses`](https://kubernetes.io/docs/reference/kubernetes-api/core/service-v1/)
- [Kubernetes: NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes: Debugging DNS resolution](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [Kubernetes kubectl references: run](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/), [wait](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/), and [exec](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/)
- [CoreDNS Kubernetes plugin](https://coredns.io/plugins/kubernetes/)
- [RFC 1034: Domain Names—Concepts and Facilities](https://www.rfc-editor.org/rfc/rfc1034.html)
- [RFC 5280: Internet X.509 Public Key Infrastructure Certificate Profile](https://www.rfc-editor.org/rfc/rfc5280.html) and [RFC 9525: Service Identity in TLS](https://www.rfc-editor.org/rfc/rfc9525.html)
- [PostgreSQL 17: `pg_isready`](https://www.postgresql.org/docs/17/app-pg-isready.html), [PostgreSQL versioning policy](https://www.postgresql.org/support/versioning/), and [Postgres Docker Official Image documentation](https://github.com/docker-library/docs/blob/master/postgres/README.md)
- [Kubernetes `agnhost` image source](https://github.com/kubernetes/kubernetes/tree/master/test/images/agnhost) and [BusyBox `nc` documentation](https://busybox.net/BusyBox.html#nc)

## Issues Found

- The prerequisites did not state that the `data` and `frontend` namespaces must exist or that the Secret must contain a `password` key in `data`. The prerequisite sentence now states both requirements.
- The PostgreSQL manifest could be mistaken for a replicated, durable database. It actually starts independent servers and defines no persistent storage, so the post now states that limitation and limits Service-level selection advice to applications whose members are interchangeable.
- The `database.data` relative-name claim was too broad because partially qualified names do not resolve that way in Windows Pods. The text now identifies this as typical Linux `ClusterFirst` behavior.
- Every `dig` example queried only IPv4 `A` records, which can produce an empty answer on a healthy IPv6-only cluster. The post now directs readers to use `AAAA` for IPv6-only Services and both types for dual-stack Services; the diagnostic interpretation now includes an address-family mismatch.
- The trailing-dot recommendation was overgeneralized to certificates and arbitrary application configuration. The post now scopes the final dot to DNS-aware consumers and specifies the conventional no-final-dot form for an X.509 DNS SAN.
- The statement about Pod-specific records was too absolute because CoreDNS can generate IP-derived endpoint labels and can optionally use Pod names. It now describes the portable requirement for a predictable hostname-based record.
- The description of `publishNotReadyAddresses` incorrectly implied that unready endpoints first become visible in EndpointSlices. Generated EndpointSlices already contain endpoint readiness information; with this setting Kubernetes forces `conditions.ready` to `true`, while `conditions.serving` continues to track actual Pod readiness. The explanation now reflects those semantics.
- The peer-discovery advice omitted the StatefulSet default `OrderedReady` behavior, which can prevent later replicas from being created when an earlier replica needs them before becoming ready. The post now recommends `spec.podManagementPolicy: Parallel` for that specific dependency pattern.
- The NetworkPolicy explanation incorrectly generalized all selectors as being evaluated in the policy namespace and described an automatically added namespace label as explicit. The text now distinguishes the namespaced top-level `podSelector` from `namespaceSelector`, identifies the standard immutable namespace-name label, and notes that source-side egress policy must also permit the traffic when egress isolation is active.
- The final TCP diagnostic omitted the trailing dot even though the guide promises search-path-independent checks. The target is now an absolute DNS name.

## Review Notes

- The Service, StatefulSet, and NetworkPolicy YAML parsed successfully with Kubernetes client v1.34.1 using client-side dry-run. The API versions and fields used remain current in Kubernetes v1.36.
- `registry.k8s.io/e2e-test-images/agnhost:2.53` was verified to exist, stay running through its default `pause` command, and contain DiG 9.18.24. `busybox:1.36` was verified to provide `nc` with the `-v`, `-z`, and `-w` flags used by the post.
- PostgreSQL 17 remains supported, `postgres:17` is available, and the official image contains `pg_isready`. The `postgres:17` and `busybox:1.36` version-line tags can move within their release lines; digest pinning can improve reproducibility but is not required for the networking demonstration.
- All official-documentation links in the post resolved successfully during validation.
