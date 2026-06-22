# Validation Summary: How to Configure Contract Testing with Pact

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pact
- Pact JS
- Pact Broker
- PactFlow / Swagger Contract Testing
- JavaScript / Node.js
- Jest
- GitHub Actions
- Docker Compose
- Python and Go Pact libraries

## Sources Consulted
- Pact JS consumer testing docs: https://docs.pact.io/implementation_guides/javascript/docs/consumer
- Pact JS provider verification docs: https://docs.pact.io/implementation_guides/javascript/docs/provider
- Pact JS matching docs: https://docs.pact.io/implementation_guides/javascript/docs/matching
- Pact JS message docs: https://docs.pact.io/implementation_guides/javascript/docs/messages
- Pact JS v16 migration docs: https://docs.pact.io/implementation_guides/javascript/docs/migrations/16
- Pact Broker Docker image docs: https://docs.pact.io/pact_broker/docker_images/pactfoundation
- Pact Broker client CLI docs: https://docs.pact.io/pact_broker/client_cli/readme
- Pact Broker can-i-deploy docs: https://docs.pact.io/pact_broker/can_i_deploy
- Pact command line tools docs: https://docs.pact.io/implementation_guides/cli
- Swagger Contract Testing bi-directional publishing docs: https://support.smartbear.com/swagger/contract-testing/docs/en/user-guide/contract-testing/bi-directional-contract-testing/publishing-contracts.html
- PactFlow GitHub Actions can-i-deploy docs: https://github.com/pactflow/actions/tree/main/can-i-deploy
- Jest 30 upgrade docs: https://jestjs.io/docs/upgrading-to-jest30
- Current npm package metadata for @pact-foundation/pact and @pact-foundation/pact-cli
- Current PyPI package metadata for pact-python

## Issues Found
- The JavaScript installation command only installed `@pact-foundation/pact`, but later examples use the `pact-broker` and `pactflow` CLI commands. Added `@pact-foundation/pact-cli`, which exposes those binaries for Node projects.
- The consumer test command used Jest's old `--testPathPattern` CLI flag. Updated it to `--testPathPatterns`, which is the current Jest 30 flag.
- The Pact publishing example imported `Publisher` from `@pact-foundation/pact`, but the current Pact JS package does not export `Publisher`. Replaced the script with the documented `pact-broker publish` CLI command.
- The GitHub Actions `can-i-deploy` example used `pactflow/actions/can-i-deploy@v1` with `broker_token`. Updated it to the documented `@v2` action and `token` input.
- The message pact example used `path`, `like`, `eachLike`, and `integer` without defining them. Added the required imports and matcher destructuring.
- The message pact example passed an async handler to `synchronousBodyHandler`. Switched it to `asynchronousBodyHandler`, which matches the async function.
- The bi-directional contract testing example incorrectly showed `Verifier` options as if Pact JS could verify an OpenAPI spec directly. Replaced it with the documented PactFlow/Swagger Contract Testing `pactflow publish-provider-contract` flow for publishing an OpenAPI provider contract and self-verification results.

## Review Notes
- Pact JS v16 currently requires Node.js 20 or later; the GitHub Actions example already uses Node 20.
- The provider state and matcher examples are illustrative and still require project-specific functions such as `seedUser`, `deleteUser`, database setup, and `handleOrderCreatedEvent`.
