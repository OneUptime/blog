# Validation Summary: How to Detect Breaking API Changes with Consumer-Driven Contract Tests

## Status
validated

## Post Type
Technical guide / CI/CD workflow guide

## Technologies Covered
- Consumer-driven contract testing
- Pact and Pact JS (`PactV3`)
- TypeScript and Jest-style assertions
- Pact Broker and the unified Pact CLI
- HTTP and JSON API compatibility
- Pact provider verification, provider states, and matching rules
- Pact Broker versioning, branches, deployments, releases, pending pacts, and work-in-progress pacts
- CI/CD deployment gates with `can-i-deploy`
- OpenAPI schema diffing

## Sources Consulted
- [Pact: How Pact works](https://docs.pact.io/getting_started/how_pact_works) - consumer tests, pact generation, interaction replay, and provider verification.
- [Pact: Writing Consumer tests](https://docs.pact.io/consumer) - consumer-test scope, response handling, matchers, extra response keys, and sensitive test data.
- [Pact JS consumer testing](https://docs.pact.io/implementation_guides/javascript/docs/consumer) - `PactV3.executeTest`, contract generation, and the separate publication step.
- [Pact JS matching](https://docs.pact.io/implementation_guides/javascript/docs/matching) - integer, number, exact-value, object, and array matcher behavior.
- [Pact JS 16 migration guide](https://docs.pact.io/implementation_guides/javascript/docs/migrations/16) - current `Pact`/`PactV4` aliases and continued `PactV3` support.
- [Pact specification philosophy](https://docs.pact.io/implementation_guides/pact_specification) - Postel's Law, unexpected response fields, and Pact's inability to assert that a response key or header is absent.
- [Pact provider verification](https://docs.pact.io/provider) - local provider verification, downstream stubbing, request validation, CI publication, and deployment checks.
- [Pact authentication and authorization guidance](https://docs.pact.io/provider/handling_auth) - separate auth testing, controlled test credentials, provider states, request modification, and external auth stubbing.
- [Pact provider states](https://docs.pact.io/getting_started/provider_states) - preconditions and interaction isolation.
- [Pact Broker overview](https://docs.pact.io/pact_broker/overview) and [versioning guidance](https://docs.pact.io/getting_started/versioning_in_the_pact_broker) - Broker records, the Matrix, commit-based application versions, and verification pairs.
- [Pacticipant version numbers](https://docs.pact.io/pact_broker/pacticipant_version_numbers) and [branches](https://docs.pact.io/pact_broker/branches) - immutable source identity and branch metadata.
- [Consumer version selectors](https://docs.pact.io/pact_broker/advanced_topics/consumer_version_selectors) - main-branch, matching-branch, deployed, and released contract selection.
- [Pending pacts](https://docs.pact.io/pact_broker/advanced_topics/pending_pacts) and [work-in-progress pacts](https://docs.pact.io/pact_broker/advanced_topics/wip_pacts) - failure handling and automatic inclusion of new contracts.
- [Pact Broker `can-i-deploy`](https://docs.pact.io/pact_broker/can_i_deploy) and [recording deployments and releases](https://docs.pact.io/pact_broker/recording_deployments_and_releases) - environment-aware checks and the required check/deploy/record order.
- [Current Pact command-line tools](https://docs.pact.io/implementation_guides/cli) and [Pact Broker CLI](https://docs.pact.io/implementation_guides/cli/pact-broker-cli) - unified and standalone command names, flags, and environment variables.
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) - the role of an OpenAPI Description in formally describing an API surface.

## Issues Found
1. **The consumer test was said to publish the pact itself.** A successful Pact consumer test generates the pact artifact, while publication is a separate consumer-build or CLI step. The introduction now distinguishes generation from publication.
2. **The post implied Pact could enforce an exact closed JSON response object.** Standard Pact response verification ignores unexpected JSON keys and cannot assert that a response key or header is absent. The text now identifies this blind spot for strict decoders instead of implying Pact will catch it.
3. **The Pact JS callback and numeric matcher guidance were underspecified.** The `pact.executeTest(...)` callback is valid for the still-supported `PactV3` interface, so the example now names that interface. The matcher advice now calls for an integer matcher when `amountMinor` must remain an integer, rather than a generic type matcher that may accept any JSON number.
4. **Credential and authorization guidance was too categorical.** Pact permits agreed non-secret test credentials and several auth-testing strategies, including separate tests and controlled substitutes. The text now prohibits real credentials and allows authentication or authorization to be exercised in Pact verification or covered separately while retaining the requirement to exercise real request parsing and serialization.
5. **The CI flow recorded deployment metadata before checking compatibility.** `can-i-deploy` must run before deployment or release; `record-deployment` or `record-release` must run only after success. The flow now uses `publish result -> query compatibility -> deploy/release -> record deployment/release`.
6. **The command example used the legacy CLI executable.** `pact-broker can-i-deploy` remains valid for legacy Ruby/Pact JS CLI distributions, but the current official recommendation for new workflows is the unified `pact` CLI. The example now uses `pact broker can-i-deploy`, keeps the valid `--to-environment` flag, and states that the Broker connection details must be supplied through CLI environment variables.
7. **The expand-and-contract sequence overstated what the Pact Matrix reports and omitted released consumers.** The Matrix records version-pair verification outcomes; it does not directly report that a specific field is unused. The corrected sequence verifies the provider candidate after removing `amountMinor` against relevant deployed or released-and-supported contracts and gates deployment with `can-i-deploy`.
8. **Two false-confidence bullets were overbroad.** Extra response fields do not fail standard Pact verification, so the exact-matching warning now refers to irrelevant value changes and dynamic values. Provider states are necessary for stateful interactions, not every interaction, so that warning is now scoped accordingly.

## Review Notes
- All six official documentation URLs already present in the post resolve to the intended Pact documentation pages.
- Pact JS 16 makes the V4 DSL available as the default `Pact` export, where `executeTest` is chained from an interaction builder. `PactV3` remains supported, and the callback shown in the post is valid for that interface.
- The standalone current Broker client uses `pact-broker-cli can-i-deploy`; legacy distributions expose `pact-broker can-i-deploy`. Pinning the CLI version in CI remains important because executable names and supported workflows differ.
- Pending pacts still execute and publish failed verification results; their purpose is to keep a new consumer expectation from failing the regular provider-changed build. A failed result still prevents the incompatible consumer from passing `can-i-deploy`. WIP pacts automatically include applicable unselected branch-head contracts and are always pending.
- The HTTP and JSON examples are valid, the `--pacticipant`, `--version`, and `--to-environment` options are current, and the remaining Pact Broker, provider-state, versioning, OpenAPI, and deployment-safety explanations agree with the official sources.
