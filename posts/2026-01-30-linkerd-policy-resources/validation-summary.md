# Validation Summary: How to Build Linkerd Policy Resources

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linkerd authorization policy
- Kubernetes custom resources
- Linkerd Server and ServerAuthorization resources
- Linkerd AuthorizationPolicy, MeshTLSAuthentication, and NetworkAuthentication resources
- Linkerd CLI and Linkerd Viz CLI
- Kubernetes probes and namespace annotations

## Sources Consulted
- Linkerd Authorization Policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd install CLI reference: https://linkerd.io/2-edge/reference/cli/install/
- Linkerd diagnostics CLI reference: https://linkerd.io/2-edge/reference/cli/diagnostics/
- Linkerd identity CLI reference: https://linkerd.io/2-edge/reference/cli/identity/
- Linkerd Viz CLI reference: https://linkerd.io/2-edge/reference/cli/viz/
- Linkerd TCP Proxying and Protocol Detection feature docs: https://linkerd.io/2-edge/features/protocol-detection/
- Linkerd Configuring Per-Route Authorization Policy task: https://linkerd.io/2-edge/tasks/configuring-per-route-policy/

## Issues Found
- The Server description said a Server defines a named set of ports on a workload. Updated it to match Linkerd's model: a Server selects a port on pods in the same namespace.
- The policy evaluation flow implied that a defined Server with no matching authorization falls back to the default policy. Updated it to show Server `accessPolicy`, whose default is `deny`.
- The default policy examples used `policyController.defaultAllowPolicy`, which is not the current documented install setting. Replaced those commands with `linkerd install --default-inbound-policy ...`.
- The default policy table omitted `audit`. Added the current `audit` mode and its behavior.
- The `linkerd identity` example targeted `deploy/api`, but the command operates on pods or label selectors. Replaced it with a label selector example.
- The `linkerd diagnostics policy` example used an unsupported `--port` flag form. Replaced it with the documented positional port argument.
- The traffic observation command used `linkerd viz stat ... --from deploy` while claiming to show caller identities. Replaced it with `linkerd viz edges deploy -n production`, which is documented to show connections and proxy identities.

## Review Notes
The YAML snippets were parsed locally with PyYAML after the corrections. The post still uses `ServerAuthorization` because it is relevant for migration and legacy coverage, but the post correctly presents `AuthorizationPolicy` as the preferred approach.
