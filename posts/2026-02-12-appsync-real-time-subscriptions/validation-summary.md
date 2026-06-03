# Validation Summary: Use AppSync Real-Time Subscriptions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS AppSync
- GraphQL subscriptions
- WebSocket real-time protocol
- AWS Amplify JavaScript client
- AppSync JavaScript resolvers
- CloudWatch metrics
- AppSync authorization directives

## Sources Consulted
- AWS AppSync: Using subscriptions for real-time data applications: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html
- AWS AppSync: Defining enhanced subscriptions filters: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-enhanced-filtering.html
- AWS AppSync: Building a real-time WebSocket client: https://docs.aws.amazon.com/appsync/latest/devguide/real-time-websocket-client.html
- AWS AppSync: Transformation helpers in $util.transform: https://docs.aws.amazon.com/appsync/latest/devguide/transformation-helpers-in-utils-transform.html
- AWS AppSync: Extensions: https://docs.aws.amazon.com/appsync/latest/devguide/extensions.html
- AWS AppSync: Monitoring and CloudWatch metrics: https://docs.aws.amazon.com/appsync/latest/devguide/monitoring.html
- AWS AppSync quotas: https://docs.aws.amazon.com/general/latest/gr/appsync.html
- AWS AppSync authorization and authentication: https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html
- AWS Amplify React GraphQL API setup: https://docs.amplify.aws/gen1/react/build-a-backend/graphqlapi/set-up-graphql-api/

## Issues Found
- Clarified subscription delivery semantics. AWS AppSync sends fields from the mutation selection set, and the subscription selection set must be compatible with it. The post previously described this too broadly as the mutation's return value.
- Added `category` and `maxPrice` arguments to `onProductChange` because the later subscription example used those arguments.
- Fixed the enhanced subscription filter resolver. `extensions.setSubscriptionFilter()` must run in the subscription resolver response handler, not the request handler, and the response should return `null`.
- Replaced the enhanced filter example with the current `util.transform.toSubscriptionFilter()` shape used by AppSync JavaScript resolvers.
- Added `Amplify.configure(config)` and the generated `amplifyconfiguration.json` import before `generateClient()`, matching current Amplify setup requirements.
- Added an empty `variables` object to the raw WebSocket subscription registration payload to match AWS AppSync's documented registration format.
- Replaced the outdated "10,000 concurrent WebSocket connections by default" claim with current documented quota categories such as connection rate, inbound and outbound message rate, subscriptions per connection, and payload size.

## Review Notes
- AWS now documents AppSync Events as a newer WebSocket PubSub option, but GraphQL subscriptions remain supported and technically relevant for this post.
- The raw WebSocket example is intentionally minimal and still omits production reconnection, `start_ack`, `error`, `ka`, and `stop` handling.
