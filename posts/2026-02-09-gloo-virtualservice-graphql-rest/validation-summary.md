# Validation Summary: How to Configure Gloo VirtualService for GraphQL and REST API Routing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Gloo Gateway / Gloo Edge VirtualService
- Gloo Gateway Enterprise GraphQLApi
- GraphQL
- REST API routing
- Kubernetes custom resources
- Gloo transformations
- Gloo Enterprise external auth
- Gloo Enterprise rate limiting
- kubectl and curl

## Sources Consulted
- Gloo Edge latest VirtualService API reference: https://docs.solo.io/gloo-edge/latest/reference/api/github.com/solo-io/gloo/projects/gateway/api/v1/virtual_service.proto.sk/
- Gloo Edge 1.19.x VirtualService API reference, including `graphqlApiRef`: https://docs.solo.io/gloo-edge/v1.19.x/reference/api/github.com/solo-io/gloo/projects/gateway/api/v1/virtual_service.proto.sk/
- Gloo Edge latest GraphQL API reference, noting GraphQL API fields are removed from use as of Gloo 1.20: https://docs.solo.io/gloo-edge/latest/reference/api/github.com/solo-io/gloo/projects/gloo/api/v1/enterprise/options/graphql/v1beta1/graphql.proto.sk/
- Gloo Edge 1.19.x GraphQL API reference: https://docs.solo.io/gloo-edge/v1.19.x/reference/api/github.com/solo-io/gloo/projects/gloo/api/v1/enterprise/options/graphql/v1beta1/graphql.proto.sk/
- Gloo Edge GraphQL manual schema configuration guide: https://docs.solo.io/gloo-edge/v1.18.x/guides/graphql/resolver_config/
- Gloo Edge GraphQL schema stitching guide: https://docs.solo.io/gloo-edge/v1.18.x/guides/graphql/stitching/
- Gloo Edge GraphQL API security guide: https://docs.solo.io/gloo-edge/v1.19.x/guides/graphql/getting_started/secure_api/
- Gloo Edge transformations guide: https://docs.solo.io/gloo-edge/latest/guides/traffic_management/request_processing/transformations/
- Gloo Edge RateLimitConfig API reference: https://docs.solo.io/gloo-edge/v1.18.x/reference/api/github.com/solo-io/solo-apis/api/rate-limiter/v1alpha1/ratelimit.proto.sk/

## Issues Found
- The original post described built-in Gloo GraphQL support without a version caveat. Current Gloo Edge documentation marks the GraphQL API feature as removed from use as of Gloo 1.20, so the post now scopes built-in GraphQL API and schema stitching examples to Gloo Gateway Enterprise 1.19.x and earlier.
- The GraphQL upstream example used an invalid `spec.graphql.schemaDefinition` field on an `Upstream`. Replaced it with a `graphql.gloo.solo.io/v1beta1` `GraphQLApi` using `executableSchema.executor.remote.upstreamRef` and `schemaDefinition`.
- The GraphQL route examples routed to GraphQL APIs with `routeAction.single.upstream`. For Gloo Gateway Enterprise GraphQL APIs, the documented route field is `graphqlApiRef`, so the GraphQL VirtualService examples were updated.
- The query-based routing section used an undocumented `graphqlSchemaFilter` matcher. Replaced it with a valid `graphqlApiRef` route example.
- The schema stitching example used an invalid `graphqlStitched` Upstream shape. Replaced it with a `GraphQLApi` `stitchedSchema.subschemas` example using documented `typeMerge` fields.
- The REST-to-GraphQL transformation matched `/users/{id}` with `exact` and referenced `{{ extraction("id") }}` without defining an extractor. Updated the matcher to `regex`, added a path-header extractor, and referenced the extracted value as `{{ id }}`.
- The rate-limit example defined server descriptors but no client-side `raw.rateLimits` actions. Added a `genericKey` action and aligned the descriptor key with the documented `generic_key` emitted by that action.
- Updated best-practice wording from GraphQL Playground to Gloo's GraphQL UI / GraphiQL wording, matching the official Gloo documentation.

## Review Notes
The post is now technically accurate for Gloo Gateway Enterprise 1.19.x and earlier GraphQL API behavior. Readers using Gloo 1.20 or later should not expect the built-in `GraphQLApi` feature to be available.
