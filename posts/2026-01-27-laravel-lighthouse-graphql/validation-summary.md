# Validation Summary: How to Build GraphQL APIs with Laravel Lighthouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Laravel
- PHP
- GraphQL
- Lighthouse
- Eloquent
- Laravel Scout
- PHPUnit

## Sources Consulted
- Lighthouse installation documentation: https://lighthouse-php.com/6/getting-started/installation.html
- Lighthouse configuration documentation: https://lighthouse-php.com/6/getting-started/configuration.html
- Lighthouse default configuration source: https://raw.githubusercontent.com/nuwave/lighthouse/v6.63.1/src/lighthouse.php
- Lighthouse directive reference: https://lighthouse-php.com/6/api-reference/directives.html
- Lighthouse Eloquent relationships documentation: https://lighthouse-php.com/6/eloquent/relationships.html
- Lighthouse complex where conditions documentation: https://lighthouse-php.com/6/eloquent/complex-where-conditions.html
- Lighthouse subscription documentation: https://lighthouse-php.com/6/subscriptions/getting-started.html
- Lighthouse subscription field documentation: https://lighthouse-php.com/6/subscriptions/defining-fields.html
- Lighthouse subscription triggering documentation: https://lighthouse-php.com/6/subscriptions/trigger-subscriptions.html
- Lighthouse custom field directive documentation: https://lighthouse-php.com/6/custom-directives/field-directives.html
- Lighthouse field resolver documentation: https://lighthouse-php.com/6/the-basics/fields.html

## Issues Found
- The configuration example used the older `schema.register` shape. Updated it to the current `schema_path` option and adjusted namespace examples to match the current default config.
- The development UI section recommended `mll-lab/laravel-graphql-playground` and `/graphql-playground`. Updated it to the officially documented `mll-lab/laravel-graphiql` package and `/graphiql` path.
- Several ID lookup examples used `@eq` with `@find` or `@delete`. Updated primary-key lookups to use `@whereKey`, matching current Lighthouse examples.
- The `createPost` directive example did not set `user_id`, while the test expected posts to belong to the authenticated user. Added `@inject(context: "user.id", name: "user_id")`.
- The policy examples used deprecated `@can` and the nonexistent `@canAccess` directive. Replaced them with `@canFind` and `@canRoot`.
- The pagination comments described `CONNECTION` as cursor-based and more efficient for large datasets. Updated the wording to Relay-style connection pagination, since Lighthouse documents that it is not true cursor pagination.
- The advanced filtering example manually defined a generated `@whereConditions` input and omitted setup requirements. Updated the example to use `_ @whereConditions(columns: ...)` and noted the required service provider and scalar package.
- The `@search` example was mixed into a generic SQL filtering field. Moved it to a separate Scout-backed field and noted the Laravel Scout service provider requirement.
- The N+1 section referenced a nonexistent current `@batch` directive and included a custom batch loader that does not match Lighthouse's current relationship batching model. Reworked it to describe automatic batch loading through relationship directives.
- The custom directive example used a non-default namespace and older resolver signature/imports. Updated it to `App\GraphQL\Directives\LogQueryDirective` and the documented `GraphQLContext`/`ResolveInfo` resolver signature.
- The best-practices table referenced deprecated `@can` and `@batch`. Updated those rows to current authorization and relationship-batching guidance.

## Review Notes
The tutorial is now technically accurate for Lighthouse 6.x as documented on the official Lighthouse site. Some examples remain illustrative and assume standard Eloquent models, factories, policies, and authentication setup exist in the reader's Laravel application.
