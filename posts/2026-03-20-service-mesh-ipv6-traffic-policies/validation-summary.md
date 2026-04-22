# Validation Summary: How to Configure IPv6 Traffic Policies in Service Meshes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes dual-stack Services and DNS
- kubectl JSONPath output
- Istio VirtualService
- Istio DestinationRule and circuit breaking
- Istio AuthorizationPolicy
- Istio traffic mirroring and fault injection
- Linkerd Gateway API HTTPRoute retries
- Gateway API service mesh routing

## Sources Consulted
- Kubernetes IPv4/IPv6 dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Istio dual-stack installation documentation: https://istio.io/latest/docs/setup/additional-setup/dual-stack/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio ingress access control guidance for ipBlocks and remoteIpBlocks: https://istio.io/latest/docs/tasks/security/authorization/authz-ingress/
- Istio traffic mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Linkerd Gateway API support documentation: https://linkerd.io/2.19/features/gateway-api/
- Linkerd retries reference: https://linkerd.io/2.19/reference/retries/
- Linkerd IPv6 support documentation: https://linkerd.io/2.19/features/ipv6/
- Gateway API HTTPRoute and ParentReference specification: https://gateway-api.sigs.k8s.io/reference/spec/

## Issues Found
- The Kubernetes ClusterIP example used invalid IPv6 literals (`fd00:svc::50` and `fd00:pod::/48`). Replaced them with valid ULA examples.
- The `kubectl get svc` JSONPath example implied JSON array output. Changed it to select `.spec.clusterIPs[*]` and show the space-separated output form.
- Istio manifests used older `networking.istio.io/v1beta1` and `security.istio.io/v1beta1` API versions. Updated Istio examples to current `v1` API versions used in official references.
- The introductory routing explanation described SPIFFE SVIDs as routing identifiers. Reworded it to distinguish service DNS names, Kubernetes Services, and workload identities from raw IP literals.
- The DestinationRule used `connectionPool.http.pendingRequests`, which is not a valid Istio field. Changed it to `http1MaxPendingRequests`.
- The DestinationRule used deprecated `LEAST_CONN`. Replaced it with `LEAST_REQUEST`.
- The AuthorizationPolicy used `remoteIpBlocks` for pod source CIDRs. Replaced it with `ipBlocks`, which matches packet source addresses; `remoteIpBlocks` is for X-Forwarded-For or PROXY protocol-derived original client IPs.
- The AuthorizationPolicy comment said the policy allowed only IPv6 CIDR blocks even though the manifest also allowed IPv4 and a service account. Reworded the comment to match the policy semantics.
- The Linkerd example used the older `policy.linkerd.io` HTTPRoute shape and a non-current standalone `HTTPRetryBudget` resource. Replaced it with Gateway API `HTTPRoute` v1 and Linkerd retry annotations.
- Added the Linkerd IPv6 caveat that IPv6 support is enabled at install time and, on dual-stack clusters, Linkerd uses only IPv6 destination endpoints when enabled.
- Tightened the final claim so policies apply to the IP families supported by the mesh and destination service, rather than implying identical behavior across every mesh.

## Review Notes
`kubectl` and `istioctl` were not installed locally, so CLI syntax was checked against official documentation instead of local `--help` output. YAML snippets were parsed successfully with PyYAML.
