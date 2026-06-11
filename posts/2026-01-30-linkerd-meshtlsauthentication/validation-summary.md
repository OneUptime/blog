# Validation Summary: How to Build Linkerd MeshTLSAuthentication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Linkerd
- Kubernetes
- Linkerd policy CRDs: MeshTLSAuthentication, AuthorizationPolicy, Server
- mTLS workload identity
- Linkerd CLI and Linkerd Viz
- Smallstep `step` certificate generation

## Sources Consulted
- Linkerd Authorization Policy reference: https://linkerd.io/2-edge/reference/authorization-policy/
- Linkerd Restricting Access To Services task: https://linkerd.io/2-edge/tasks/restricting-access/
- Linkerd Generating your own mTLS root certificates task: https://linkerd.io/2-edge/tasks/generate-certificates/
- Linkerd Viz CLI reference: https://linkerd.io/2-edge/reference/cli/viz/
- Linkerd MeshTLSAuthentication CRD template: https://github.com/linkerd/linkerd2/blob/main/charts/linkerd-crds/templates/policy/meshtls-authentication.yaml
- Linkerd AuthorizationPolicy CRD template: https://github.com/linkerd/linkerd2/blob/main/charts/linkerd-crds/templates/policy/authorization-policy.yaml

## Issues Found
- Fixed the introductory identity example to include the `serviceaccount` segment used by Linkerd workload identities.
- Changed "complete specification" to "common specification" because the MeshTLSAuthentication spec also supports `identityRefs`, not only `identities`.
- Updated the ServiceAccount reference example to use `identityRefs`, which is the direct CRD-supported way to reference ServiceAccounts.
- Corrected an AuthorizationPolicy `targetRef.group` from `core` to `policy.linkerd.io` for a Linkerd `Server`.
- Added the required `linkerd install --crds | kubectl apply -f -` step before installing the Linkerd control plane with custom certificates.
- Corrected a cross-namespace `linkerd viz tap` command to use `--to-namespace` and the documented `deploy/...` resource shorthand.
- Replaced an unreliable proxy certificate file inspection command with `linkerd viz edges`, which is documented as displaying proxy identities.
- Replaced HTTP `curl` checks against a PostgreSQL port with `pg_isready`, and changed the expected unauthorized result from HTTP 403 to a denied TCP connection.
- Replaced the nonexistent "MeshTLSAuthentication in permissive mode" guidance with Linkerd Server `accessPolicy: audit` mode.

## Review Notes
The post now matches the current Linkerd edge documentation for the policy resources reviewed. Several examples remain illustrative and assume the referenced target workloads, ports, ServiceAccounts, and clients exist in the cluster.
