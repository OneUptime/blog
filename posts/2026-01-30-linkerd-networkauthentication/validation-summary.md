# Validation Summary: How to Implement Linkerd NetworkAuthentication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Linkerd authorization policy
- Linkerd NetworkAuthentication
- Linkerd MeshTLSAuthentication
- Linkerd Server resources
- Kubernetes custom resources
- Kubernetes CIDR-based network matching
- Linkerd Viz CLI

## Sources Consulted
- Linkerd Authorization Policy reference: https://linkerd.io/2/reference/authorization-policy/
- Linkerd Authorization Policy feature documentation: https://linkerd.io/2/features/server-policy/
- Linkerd HTTP, HTTP/2, and gRPC proxying documentation: https://linkerd.io/2/features/http-grpc/
- Linkerd TCP proxying and protocol detection documentation: https://linkerd.io/2/features/protocol-detection/
- Linkerd current CRD templates for Server, AuthorizationPolicy, MeshTLSAuthentication, and NetworkAuthentication: https://github.com/linkerd/linkerd2/tree/main/charts/linkerd-crds/templates/policy

## Issues Found
- The post described the first NetworkAuthentication YAML as the "complete specification" but omitted the supported `except` field. Changed the wording to "basic specification" and added `spec.networks[].except` to the field table.
- The multi-tier example said partner access was "limited" while the sample authorized the same `Server` as the internal policy and did not define route-level restrictions. Changed the wording to "Allow partners access."
- The CI/CD example labeled `140.82.112.0/20` as GitHub Actions runner IPs, which is not a reliable/current way to represent hosted runner source ranges. Changed the example to a self-hosted GitHub Actions runner subnet.
- The "Combine with MeshTLSAuthentication" example placed both `NetworkAuthentication` and `MeshTLSAuthentication` in one `requiredAuthenticationRefs` list while describing it as allowing both alternatives. Linkerd requires all entries in a single list to match, so the example was split into two AuthorizationPolicy resources and a note was added.
- The audit-mode section implied the listed Viz commands enabled audit mode. Updated it to state that `accessPolicy: audit` must be set on the `Server` resource before using the commands to inspect decisions.
- The troubleshooting section used `linkerd viz stat` and `tap | grep denied` for authorization decisions. Replaced it with `linkerd viz authz`, which is the Linkerd command intended to display authorization metrics and unauthorized requests.
- The Further Reading section included stale or non-specific links. Replaced them with current Linkerd authorization policy and automatic mTLS documentation links.

## Review Notes
The examples use current Linkerd policy resources. `NetworkAuthentication` and `AuthorizationPolicy` remain `policy.linkerd.io/v1alpha1`; `Server` is shown as `policy.linkerd.io/v1beta3`, matching the current CRD storage version in Linkerd's main CRD templates. NetworkAuthentication depends on the source IP seen by the destination proxy, so NAT, load balancers, and kube-proxy behavior should be verified in real deployments.
