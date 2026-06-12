# Validation Summary: How to Build GraphQL APIs with Rails and GraphQL-Ruby

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Ruby on Rails
- GraphQL
- GraphQL-Ruby
- graphql-batch
- Action Cable subscriptions
- RSpec request specs
- JWT authentication

## Sources Consulted
- GraphQL-Ruby Generators: https://graphql-ruby.org/schema/generators
- GraphQL-Ruby Using Connections: https://graphql-ruby.org/pagination/using_connections
- GraphQL-Ruby Input Objects: https://graphql-ruby.org/type_definitions/input_objects
- GraphQL-Ruby Mutation Classes: https://graphql-ruby.org/mutations/mutation_classes
- GraphQL-Ruby Error Handling: https://graphql-ruby.org/errors/error_handling
- GraphQL-Ruby ActionCableSubscriptions API documentation: https://graphql-ruby.org/api-doc/2.0.8/GraphQL/Subscriptions/ActionCableSubscriptions.html
- Shopify graphql-batch README: https://github.com/Shopify/graphql-batch
- GraphQL-Ruby Dataloader vs. GraphQL-Batch: https://graphql-ruby.org/dataloader/adopting.html
- GraphQL-Ruby ActiveRecordAssociationSource API documentation: https://graphql-ruby.org/api-doc/2.5.24/GraphQL/Dataloader/ActiveRecordAssociationSource.html

## Issues Found
- The posts query used `Types::PostConnectionType`, but the post never defined that custom connection type. Changed it to `Types::PostType.connection_type`, which is the documented GraphQL-Ruby way to generate a connection type for cursor-based pagination.
- The input-object mutation example used `argument :input` inside a generated `BaseMutation`. Since GraphQL-Ruby's generated base mutation uses Relay Classic mutation conventions and wraps arguments in a generated mutation input object, this made the client-side example misleading. Changed the mutation argument to `attributes` and updated the test query to use `CreatePostInput!` with nested `attributes`.
- The graphql-batch record loader did not guard against repeated fulfillment. Updated it to follow the official loader pattern by checking `fulfilled?` before fulfilling each id.
- The subscriptions section said to configure Action Cable as the transport, but the schema plugin alone is not the full transport setup. Adjusted the wording to say the schema enables the Action Cable subscription backend.

## Review Notes
- The article remains a high-level tutorial and assumes application-specific Rails models, scopes, JWT helpers, and GraphQL union/search result types exist.
- GraphQL-Ruby now includes `GraphQL::Dataloader`, but `graphql-batch` is still documented and widely used, so the batching section is technically valid.
