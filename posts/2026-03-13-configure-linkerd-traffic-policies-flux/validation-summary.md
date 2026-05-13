# Validation Summary: How to Configure Linkerd Traffic Policies with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linkerd authorization policy
- Linkerd Server and ServerAuthorization resources
- Linkerd HTTPRoute traffic shifting
- Flux CD Kustomizations
- Kubernetes manifests and kubectl

## Sources Consulted
- Linkerd 2.19 Authorization Policy reference: https://linkerd.io/2.19/reference/authorization-policy/
- Linkerd 2.19 HTTPRoute reference: https://linkerd.io/2.19/reference/httproute/
- Linkerd 2.19 Traffic Shifting task: https://linkerd.io/2.19/tasks/traffic-shifting/
- Linkerd Supported Kubernetes Versions reference: https://linkerd.io/2/reference/k8s-versions/
- Linkerd 2.19 CLI diagnostics reference: https://linkerd.io/2.19/reference/cli/diagnostics/
- Linkerd 2.19 CLI viz reference: https://linkerd.io/2.19/reference/cli/viz/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Linkerd CRD definitions in the official linkerd/linkerd2 repository: https://github.com/linkerd/linkerd2/tree/main/charts/linkerd-crds/templates/policy

## Issues Found
- The post claimed it configured circuit breaking, but the examples only configure authorization and HTTPRoute traffic splitting. Removed "Circuit Breaking" from the tags and removed the circuit-breaking claim from the description.
- The prerequisites said "Linkerd installed (1.22+)", which confused Kubernetes and Linkerd versioning. Updated this to Kubernetes 1.29+ with Linkerd 2.19, matching the current Linkerd supported Kubernetes version table used for validation.
- The Server manifest used `policy.linkerd.io/v1beta2` and nested `spec.port.number`. The current storage version for Server is `policy.linkerd.io/v1beta3`, and `spec.port` is an int-or-string field. Updated the API version and changed the port to `port: 8080`.
- The Server manifest comment said `proxyProtocol` required mTLS. `proxyProtocol` configures protocol handling; the mTLS requirement comes from the authorization policy. Reworded the comment.
- The ServerAuthorization examples used `policy.linkerd.io/v1beta2`, which Linkerd does not serve for ServerAuthorization. Updated them to `policy.linkerd.io/v1beta1`.
- The HTTPRoute traffic-splitting example attached the route to a Linkerd Server. Linkerd traffic shifting uses HTTPRoute attached to the Service that clients call. Updated the `parentRefs` to target the `api-service` Service with `group: core` and `port: 8080`.
- The Flux kustomization listed `default-policy.yaml` earlier in the article but omitted it from `resources`. Added `default-policy.yaml`.
- The health probe ServerAuthorization implied path-level filtering, but ServerAuthorization cannot restrict HTTP paths. Updated the comment to state that it allows the whole Server and recommends a dedicated probe port for path isolation.
- The validation command used `linkerd viz routes` for traffic split metrics, but that command is for route metrics and depends on route definitions/service profiles. Updated it to `linkerd viz stat -n production --from deploy/frontend-service deploy`, consistent with the Linkerd traffic shifting documentation.

## Review Notes
- Linkerd's newer `AuthorizationPolicy` resource is preferred over `ServerAuthorization` and can target HTTPRoutes as well as Servers. The post remains valid because ServerAuthorization is still served, but a future revision should consider migrating the examples to AuthorizationPolicy and MeshTLSAuthentication.
- Namespace-level `config.linkerd.io/default-inbound-policy` changes should be planned carefully for existing workloads because proxy policy behavior may require pod restarts depending on when the annotation is applied.
