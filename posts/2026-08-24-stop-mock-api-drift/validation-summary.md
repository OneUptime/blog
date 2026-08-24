# Validation Summary: How to Stop Mock APIs from Drifting Away from the Real Provider

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Pact consumer-driven contract testing
- Pact provider verification and provider states
- Pact Broker compatibility checks
- OpenAPI 3.x, including OpenAPI 3.2.0
- JSON Schema dialect handling
- Express and TypeScript
- HTTP request/response validation and conditional requests
- Mock API scenario validation
- CI/CD contract and conformance gates

## Sources Consulted

- [Pact: How Pact works](https://docs.pact.io/getting_started/how_pact_works)
- [Pact: Writing consumer tests](https://docs.pact.io/consumer)
- [Pact: Contract tests vs functional tests](https://docs.pact.io/consumer/contract_tests_not_functional_tests)
- [Pact provider verification](https://docs.pact.io/provider)
- [Pact provider states](https://docs.pact.io/getting_started/provider_states)
- [Pact matching](https://docs.pact.io/getting_started/matching)
- [Pact Broker](https://docs.pact.io/pact_broker)
- [Pact Broker: Can I Deploy](https://docs.pact.io/pact_broker/can_i_deploy)
- [Pact Broker versioning](https://docs.pact.io/getting_started/versioning_in_the_pact_broker)
- [Pact-JVM Spring and MockMvc provider verification](https://docs.pact.io/implementation_guides/jvm/provider/spring)
- [OpenAPI Specification 3.2.0](https://spec.openapis.org/oas/v3.2.0.html)
- [OpenAPI Specification 3.0.4 Schema Object](https://spec.openapis.org/oas/v3.0.4.html#schema-object)
- [OpenAPI Initiative: Providing Documentation and Examples](https://learn.openapis.org/specification/docs.html)
- [Express 5.x API Reference](https://expressjs.com/en/5x/api/)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)

## Issues Found

- The shared-contract invariant incorrectly implied that a Pact mock consumes the same immutable artifact as the provider verifier. The wording now distinguishes the Pact lifecycle, in which consumer interactions configure the mock and produce the pact, from the OpenAPI lifecycle, in which both checks can consume the same versioned artifact.
- Provider verification was described as always sending requests through a real HTTP boundary. Pact-JVM officially supports in-process targets such as Spring MockMvc, so the post now says the verifier replays the request against the provider's request-handling stack.
- The OpenAPI validation guidance assumed that every description explicitly declares a JSON Schema dialect. OpenAPI 3.1 and 3.2 can inherit the OAS dialect or override it with `$schema`, while OpenAPI 3.0 uses its own fixed Schema Object rules. The post now refers to the effective schema rules and any applicable dialect.
- The limitations section could be read as claiming that OpenAPI cannot describe OAuth flows. OpenAPI can describe supported OAuth flow configuration, URLs, scopes, and security requirements, but it does not verify end-to-end authorization behavior. The wording now makes that distinction explicit.
- The mock-response guidance assumed that every described response has a schema. A Media Type Object's `schema` is optional, and response selection also depends on the operation and status. The post now requires matching the described response first and schema validation only when a schema is present.
- Stateful acceptance scenarios and consumer contracts were presented as interchangeable alternatives. Pact contracts verify isolated request/response expectations and do not prove side effects or multi-request state transitions. The post now requires equivalent provider acceptance scenarios and limits consumer contracts to standalone interaction expectations.

## Review Notes

- The Express/TypeScript route fragment is syntactically valid for current Express APIs. Its hard-coded response is intentionally illustrative rather than a complete application.
- The JSON provenance example is valid JSON. The post contains no terminal commands or version-specific CLI flags.
- OpenAPI 3.2.0 is the latest published OpenAPI Specification as of the validation date. Implementations should still select mock and validation tooling that explicitly supports the pinned OAS version and its effective schema rules.
- For an environment-aware Pact Broker deployment check, the pipeline should record deployments or releases, or explicitly supply all counterpart application versions to the compatibility query.
- All external links in the post resolved to the intended current documentation pages. No deprecated APIs were found.
