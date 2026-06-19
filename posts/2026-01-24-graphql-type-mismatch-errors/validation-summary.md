# Validation Summary: How to Fix 'Type Mismatch' Errors in GraphQL Schema

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- GraphQL schemas and type system
- GraphQL resolver result coercion and nullability
- GraphQL lists, enums, interfaces, unions, and custom scalars
- GraphQL.js
- Apollo Server
- JavaScript
- TypeScript

## Sources Consulted
- GraphQL Specification, October 2021: https://spec.graphql.org/October2021/
- GraphQL Schemas and Types documentation: https://graphql.org/learn/schema/
- GraphQL.js abstract types documentation: https://www.graphql-js.org/docs/abstract-types/
- Apollo Server custom scalars documentation: https://www.apollographql.com/docs/apollo-server/schema/custom-scalars
- Apollo Server unions and interfaces documentation: https://www.apollographql.com/docs/apollo-server/schema/unions-interfaces
- Apollo Server plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference

## Issues Found
- The initial type-system explanation and Mermaid diagram implied that resolver return types are checked during schema validation before execution. Updated it to distinguish operation validation from execution-time field completion and result coercion, matching the GraphQL execution model.
- The boolean conversion example used `Boolean(userData.isActive)`, which converts non-empty strings such as `"false"` to `true`. Replaced it with an explicit conversion for boolean `true` and the string `"true"`.
- The nullable-field Mermaid diagram said nullable fields are "always valid." Changed it to "Null Accepted" because nullable fields can still fail for other type mismatches.
- The list resolver fix could return `[null]` for a non-null item list and could throw when `user` was missing. Updated it to return an empty list for missing results and to guard `user?.tags`.
- The enum mapping example called `.toLowerCase()` directly on `order.status`, which could throw for missing or non-string values. Wrapped the value with `String(...)` before lookup.
- The JSON scalar example referenced undefined `parseObject` and `parseLiteral` helpers. Added a helper for object literals and made list parsing call the scalar's `parseLiteral` method recursively.
- The interface/union section stated that `__resolveType` is always required and included a misleading comment about adding `__typename`. Updated the language to mention `__resolveType` or `isTypeOf`, and removed the incorrect comment.
- The runtime validation middleware imported an unused directive visitor and validated resolver output against the parent type instead of the field return type. Rewrote the snippet to use GraphQL.js type helpers, validate against the resolved field type, and avoid recursively requiring fields that GraphQL may resolve later.
- The final takeaway on abstract types was too absolute. Updated it to recommend explicit `__resolveType` or `isTypeOf` logic.

## Review Notes
The examples are intentionally framework-agnostic in places and use placeholder `database` calls, so they are illustrative rather than drop-in runnable applications. The Apollo Server plugin example matches the current plugin lifecycle shape, but production error logging should normally use structured logging and avoid exposing stack traces outside development.
