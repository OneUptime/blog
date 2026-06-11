# Validation Summary: How to Implement Linkerd Server Resource

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Linkerd policy resources
- Kubernetes custom resources
- Linkerd Server, ServerAuthorization, AuthorizationPolicy, MeshTLSAuthentication, and NetworkAuthentication
- Linkerd CLI and diagnostics commands
- Kubernetes YAML manifests and kubectl commands

## Sources Consulted
- Linkerd Authorization Policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd Authorization Policy feature documentation: https://linkerd.io/2-edge/features/server-policy/
- Linkerd Restricting Access to Services guide: https://linkerd.io/2-edge/tasks/restricting-access/
- Linkerd diagnostics CLI reference: https://linkerd.io/2-edge/reference/cli/diagnostics/
- Linkerd Proxy Log Level reference: https://linkerd.io/2-edge/reference/proxy-log-level/
- Linkerd Modifying Proxy Log Level task: https://linkerd.io/2-edge/tasks/modifying-proxy-log-level/
- Linkerd current Server CRD template: https://raw.githubusercontent.com/linkerd/linkerd2/main/charts/linkerd-crds/templates/policy/server.yaml
- Linkerd control-plane Helm values: https://raw.githubusercontent.com/linkerd/linkerd2/main/charts/linkerd-control-plane/values.yaml

## Issues Found
- Updated Server examples from `policy.linkerd.io/v1beta2` to `policy.linkerd.io/v1beta3`, the current storage version in the Linkerd Server CRD.
- Updated the prerequisite from Linkerd 2.12 to Linkerd 2.16 for the `v1beta3` examples and audit-mode guidance.
- Corrected the claim that Servers alone do not restrict traffic. Linkerd denies traffic to a Server by default unless it is explicitly authorized or `accessPolicy: audit` is set.
- Added `accessPolicy` to the Server anatomy and clarified that the default is `deny`.
- Corrected the default policy install flag from `policyController.defaultAllowPolicy` to `proxy.defaultInboundPolicy`.
- Added `audit` to the default policy list because it is supported by current Linkerd policy configuration.
- Corrected protocol feature wording so HTTP/gRPC route metrics, retries, and timeouts are described as route-based capabilities rather than effects of `proxyProtocol` alone.
- Corrected opaque/TLS protocol descriptions to preserve Linkerd mTLS between meshed proxies while noting the lack of L7 features.
- Updated `linkerd diagnostics policy` to include the target port argument.
- Replaced a pod annotation example for proxy debug logging with a deployment pod-template patch and rollout restart, matching Linkerd's persistent proxy log-level guidance.
- Corrected the troubleshooting note that Server CRD changes are dynamic, while default policy annotation changes require pod restart.

## Review Notes
ServerAuthorization is still documented by Linkerd but AuthorizationPolicy is the preferred and more flexible resource. The post now labels ServerAuthorization as older rather than already deprecated.
