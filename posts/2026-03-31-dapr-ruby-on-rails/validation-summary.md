# Validation Summary: How to Use Dapr with Ruby on Rails Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar HTTP API)
- Ruby on Rails
- HTTParty (Ruby HTTP client gem)
- Dapr State Management API
- Dapr Pub/Sub API
- Dapr Service Invocation API
- Dapr CLI

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Publish/Subscribe API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Service Invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Subscription methods (programmatic): https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr CLI reference (dapr run): https://docs.dapr.io/reference/cli/dapr-run/
- HTTParty gem documentation: https://github.com/jnunemaker/httparty

## Issues Found
1. **Unnecessary `faraday` gem in Gemfile** — The Gemfile snippet listed both `gem 'httparty'` and `gem 'faraday'`, but Faraday is never used anywhere in the post. All HTTP calls use HTTParty exclusively. Removed `gem 'faraday'` from the Gemfile snippet to avoid confusion.

## Review Notes
- The Dapr pub/sub subscription discovery response uses the `route` (singular string) field format, which is the legacy form. Current Dapr documentation (v1.14+) documents the `routes` (object with `rules` and `default`) format. The singular `route` form still works via backward compatibility, so it is not technically wrong, but authors may want to update to the current format in a future revision.
- The `invoke_service` method correctly uses Ruby's `send` to dispatch to HTTParty class methods (`get`, `post`, etc.), which is a valid Ruby pattern.
- All Dapr HTTP API endpoint paths (`/v1.0/state/`, `/v1.0/publish/`, `/v1.0/invoke/`) are correct and current.
- The 204 status code check for missing state keys is correct per Dapr API behavior.
- The `dapr run` CLI command syntax and flags are correct.
- The CloudEvent `data` field access pattern and `{ status: 'SUCCESS' }` acknowledgment response are correct per Dapr pub/sub documentation.
