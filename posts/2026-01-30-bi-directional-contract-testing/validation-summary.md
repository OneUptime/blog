# Validation Summary: How to Build Bi-Directional Contract Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bi-directional contract testing
- Pact and Pact JS
- Pact Broker CLI
- PactFlow / Swagger Contract Testing
- OpenAPI 3.0.3
- GitHub Actions
- JavaScript / Node.js

## Sources Consulted
- Pact Broker Client CLI documentation: https://docs.pact.io/pact_broker/client_cli/readme
- Pact CLI documentation: https://docs.pact.io/implementation_guides/cli/pact-cli
- Pact JS consumer testing documentation: https://docs.pact.io/implementation_guides/javascript/docs/consumer
- Pact JS matching documentation: https://docs.pact.io/implementation_guides/javascript/docs/matching
- Pact Broker `can-i-deploy` documentation: https://docs.pact.io/pact_broker/can_i_deploy
- PactFlow bi-directional contract testing overview: https://pactflow.io/bi-directional-contract-testing/
- OpenAPI Specification v3.0.3: https://spec.openapis.org/oas/v3.0.3.html
- Current `@pact-foundation/pact-cli` CLI help output for `pactflow publish-provider-contract`, `pact-broker publish`, and `pact-broker can-i-deploy`

## Issues Found
- The post described provider OpenAPI contract publishing as a Pact Broker command. Official Pact documentation marks provider contract publishing as a PactFlow-only command using `pactflow publish-provider-contract`, so the command and wording were updated to refer to PactFlow / Swagger Contract Testing.
- The provider publishing examples omitted self-verification result information. Added `--verification-exit-code 0` to show the provider contract is published after a successful verification step.
- The post said the broker "uses" the included schema comparison code internally. Changed this to a conceptual example because real broker comparison implementations are product-specific.
- The programmatic `can-i-deploy` example used an unsupported `PactBroker.canDeploy` API shape. Replaced it with a Node.js wrapper around the documented `pact-broker can-i-deploy --output json` CLI command.
- The best-practices table recommended semantic versioning for Pact versions. Pact guidance emphasizes unique application versions, often including a VCS identifier, for accurate `can-i-deploy` results, so that row was corrected.

## Review Notes
The Pact JS examples use the older `PactV3` interface, which is still available, while current Pact JS documentation recommends the `Pact` / PactV4 interface for new tests unless a project specifically needs Pact specification v3 output.
