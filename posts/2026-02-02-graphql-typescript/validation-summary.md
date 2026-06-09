# Validation Summary: How to Use GraphQL with TypeScript

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- GraphQL
- GraphQL Code Generator (`@graphql-codegen/cli`)
- `@graphql-codegen/typescript` plugin
- `@graphql-codegen/typescript-resolvers` plugin
- `@graphql-codegen/typescript-operations` plugin
- `@graphql-codegen/typed-document-node` plugin
- TypeGraphQL (code-first approach)
- `graphql-request` client

## Sources Consulted
- GraphQL Code Generator official documentation: https://the-guild.dev/graphql/codegen
- `@graphql-codegen/typescript` plugin docs: https://the-guild.dev/graphql/codegen/plugins/typescript/typescript
- `@graphql-codegen/typescript-resolvers` plugin docs: https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-resolvers
- `@graphql-codegen/typed-document-node` plugin docs: https://the-guild.dev/graphql/codegen/plugins/typescript/typed-document-node
- Client preset docs: https://the-guild.dev/graphql/codegen/docs/guides/react-vue
- `import-types` preset docs: https://the-guild.dev/graphql/codegen/plugins/presets/import-types-preset
- TypeGraphQL documentation: https://typegraphql.com/docs/introduction.html
- `graphql-request` documentation: https://github.com/jasonkuhrt/graphql-request
- GraphQL spec: https://spec.graphql.org/

## Issues Found

**1. Inconsistent codegen configuration for client operations**

In the "Typed GraphQL Clients" section, the codegen config used `preset: 'client'` with empty `plugins: []` outputting to a single `.ts` file:

```typescript
'./src/generated/operations.ts': {
  preset: 'client',
  plugins: []
}
```

This was incorrect for several reasons:
- The `client` preset requires the output path to be a directory (e.g., `./src/gql/`), not a `.ts` file.
- The `client` preset bundles its own functionality and does not require the separately installed `@graphql-codegen/typescript-operations` and `@graphql-codegen/typed-document-node` plugins shown in the install command.
- The `client` preset uses a different API pattern — a `graphql()` tag function — rather than the `GetUserDocument`/`CreateUserDocument` named exports used in the post's client code example.

**Fix applied**: Replaced the `client` preset config with the `import-types` preset using the `typescript-operations` and `typed-document-node` plugins. This matches the install command (which installs both plugins) and the client code (which imports `GetUserDocument` and `CreateUserDocument` as ready-to-use `TypedDocumentNode` exports):

```typescript
'./src/generated/operations.ts': {
  preset: 'import-types',
  presetConfig: {
    typesPath: './types'
  },
  plugins: ['typescript-operations', 'typed-document-node']
}
```

## Review Notes

- The `maybeValue`, `enumsAsConst`, `strictScalars`, `enumsAsTypes`, `avoidOptionals`, `immutableTypes`, and `useTypeImports` configuration options referenced in the post are all valid `@graphql-codegen/typescript` plugin options as documented.
- The schema-first resolver code uses the global `crypto.randomUUID()`, which is available as a global in Node.js 19+. For older Node versions, an explicit `import { randomUUID } from 'crypto'` would be needed. This is not technically incorrect for modern Node, but worth noting.
- The TypeGraphQL class fields (`id: string;`, `email: string;`) lack initializers and would require either the `!` definite assignment assertion or `strictPropertyInitialization: false` in `tsconfig.json` to compile under strict mode. Many TypeGraphQL examples in official docs accept this caveat; left as-is.
- The TypeGraphQL example currently does not register the resolver with a schema builder (e.g., `buildSchema`), but this is reasonable for a brief illustrative snippet.
- The `graphql-request` `GraphQLClient.request(document, variables)` usage is current and correct.
- TypeGraphQL maintenance status: TypeGraphQL has been actively maintained but contributors should check the project status before adopting it; alternatives like Nexus and Pothos exist in the code-first space.
