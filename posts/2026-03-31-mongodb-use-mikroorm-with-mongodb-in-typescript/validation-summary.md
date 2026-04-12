# Validation Summary: How to Use MikroORM with MongoDB in TypeScript

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- MikroORM (with `@mikro-orm/core` and `@mikro-orm/mongodb`)
- TypeScript
- Node.js

## Sources Consulted
- MikroORM official documentation — https://mikro-orm.io/docs
- MikroORM MongoDB usage guide — https://mikro-orm.io/docs/usage-with-mongo
- MikroORM GitHub repository — https://github.com/mikro-orm/mikro-orm
- MikroORM `@Property` decorator options — https://mikro-orm.io/docs/decorators#property
- npm registry for `@mikro-orm/core` and `@mikro-orm/mongodb`

## Issues Found

1. **Introduction: incorrect decorator source** — The intro stated "MongoDB entities use decorators from `@mikro-orm/mongodb`". Entity decorators (`@Entity`, `@Property`, `@PrimaryKey`, `@SerializedPrimaryKey`) are imported from `@mikro-orm/core`, not the MongoDB driver package. Fixed to clarify that decorators come from `@mikro-orm/core` with the `@mikro-orm/mongodb` driver.

2. **`@Property({ default: true })` on `inStock` field** — The `default` option in `@Property()` is a SQL-only schema generator option that has no effect with MongoDB (MongoDB has no schema-level column defaults). The class initializer `= true` already handles the default value correctly. Removed the `{ default: true }` option to avoid misleading readers.

3. **`orderBy: { price: 1 }` in CRUD example** — MikroORM does not accept MongoDB's native numeric ordering values (`1`/`-1`). It uses string values (`'asc'`, `'desc'`) or the `QueryOrder` enum (`QueryOrder.ASC`, `QueryOrder.DESC`). Changed to `{ price: 'asc' }` to match MikroORM's API, consistent with the repository example later in the post which already uses `'asc'`.

## Review Notes
- The `persistAndFlush` and `removeAndFlush` convenience methods used in the CRUD section may be removed in MikroORM v7. If targeting v7, the patterns `em.persist(entity); await em.flush()` and `em.remove(entity); await em.flush()` are safer alternatives. Since the blog does not pin a version, the current code works with v6 but readers should check their version.
- The `em.create()` method in MikroORM v5+ auto-persists the entity, so calling `persistAndFlush` after `create` is technically redundant — `await em.flush()` alone would suffice. This is not incorrect, just slightly redundant.
- The entity pattern using `_id: ObjectId` with `@PrimaryKey()` and `id: string` with `@SerializedPrimaryKey()` is the correct documented pattern for MongoDB entities.
- All other code examples, imports, configuration options, and API usage are correct and current.
