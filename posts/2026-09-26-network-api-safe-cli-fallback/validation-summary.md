# Validation Summary: How to Prefer NETCONF, RESTCONF, or gNMI While Keeping a Safe CLI Fallback

## Status
validated

## Post Type
Technical guide covering network automation backend selection and safe fallback policy.

## Technologies Covered
- NETCONF capabilities, datastores, validation, confirmed commit, and rollback-on-error
- RESTCONF, YANG resources, HTTP conditional requests, PUT, and PATCH
- OpenConfig gNMI capabilities, Get, Set, Subscribe, and transaction boundaries
- gRPC status codes and uncertain write outcomes
- SSH host-key verification and device CLI adapters
- YAML application policy and JSON result records

## Sources Consulted
- [RFC 6241: NETCONF](https://datatracker.ietf.org/doc/html/rfc6241), especially sections 7.2 and 8.1–8.6: edit semantics, capability discovery, candidate, confirmed commit, rollback-on-error, and validation.
- [RFC 8040: RESTCONF](https://datatracker.ietf.org/doc/html/rfc8040), especially sections 1.4, 3.4.1.2, 3.5.2, 4.5–4.6, and 7: datastore interactions, entity tags, edit operations, and errors.
- [OpenConfig gNMI specification](https://github.com/openconfig/reference/blob/master/rpc/gnmi/gnmi-specification.md), sections 3.2–3.5: discovery, retrieval, Set transaction scope, update/replace behavior, errors, and subscriptions.
- [gRPC status codes](https://grpc.io/docs/guides/status-codes/): distinctions among unsupported operations, authentication/authorization errors, unavailability, and deadlines.
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.4): HTTP 403/404 and concealment of forbidden resources.
- [RFC 4253: SSH Transport Layer Protocol](https://www.rfc-editor.org/rfc/rfc4253.html), section 8: server host-key verification.
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/): mapping, sequence, comment, and scalar syntax.
- [RFC 8259: JSON](https://www.rfc-editor.org/rfc/rfc8259.html): object, string, and boolean syntax.
- [Author GitHub profile](https://github.com/nawazdhandala): verified the author link resolves to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- The post contains technical implementation guidance and two structured examples, so it qualifies for technical validation. README.md required no changes.
- NETCONF transaction features are correctly described as capabilities that must be checked. Error handling does not universally imply restoration of the original configuration.
- RESTCONF conditional edits and the distinction between individual requests and multi-request workflows are accurate. The warning against assuming confirmed-commit behavior is appropriate.
- gNMI groups changes within one SetRequest transaction. Capability discovery advertises models and encodings; it does not replace qualification of specific paths, permissions, or device behavior.
- The recommendation to reconcile after a lost response is sound. gRPC explicitly allows a deadline error even when a state-changing operation succeeded. The fallback matrix is an application safety policy, not a protocol-mandated algorithm.
- Parsed the YAML example with PyYAML safe_load and the JSON example with Python json.loads; both succeeded. The YAML keys and driver profile name are explicitly illustrative application policy, not a vendor schema or an available driver. The JSON is an application result shape, not a protocol response.
- There are no executable API clients, terminal commands, concrete device configurations, or release-specific compatibility promises to run or verify. Device behavior, CLI pagination, parser reliability, privilege restrictions, and recovery procedures require the integration tests advocated by the post; no live-device tests were performed.
- The protocol-reference links and author link resolve to the expected resources. No deprecated API usage or inaccurate version-specific claims were identified.
- A future implementation should include the profile version in its stored evidence as the prose recommends; its omission from the deliberately small JSON example is not a protocol or syntax error.
