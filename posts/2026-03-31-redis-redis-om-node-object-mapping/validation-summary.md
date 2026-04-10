# Validation Summary: How to Use redis-om-node for Object Mapping

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Redis Stack)
- Node.js
- redis-om (npm package, v0.4.x)
- RedisJSON module
- RediSearch module

## Sources Consulted
- redis-om npm package source and README: https://github.com/redis/redis-om-node
- redis-om v0.4.0 migration/changelog (breaking changes from v0.3.x to v0.4.x)
- redis-om TypeScript type definitions (Schema, Repository, Entity, EntityId exports)

## Issues Found

### 1. Deprecated `Client` class usage (Defining a Schema and Repository section)
- **What was wrong:** The post imported `Client` from `redis-om` and used `new Client().open('redis://localhost:6379')` to connect. The `Client` class is deprecated in redis-om v0.4.x.
- **What was changed:** Replaced with `createClient()` from the `redis` package and `await redis.connect()`. Updated the import to `import { createClient } from 'redis'` and `import { Schema, Repository } from 'redis-om'`.
- **Why:** The current recommended approach is to use the Node Redis client directly and pass it to the Repository constructor.

### 2. Deprecated `client.fetchRepository()` usage (Defining a Schema and Repository section)
- **What was wrong:** Used `client.fetchRepository(productSchema)` to create a repository.
- **What was changed:** Replaced with `new Repository(productSchema, redis)`.
- **Why:** `fetchRepository()` was a method on the deprecated `Client` class. The current API uses the `Repository` constructor directly, accepting the schema and a Redis client.

### 3. Removed `createEntity()` method (Creating Entities section)
- **What was wrong:** Used `productRepo.createEntity({...})` followed by `productRepo.save(product)` with save returning an ID string.
- **What was changed:** Replaced with `await productRepo.save({...})` which accepts a plain object directly. The returned value is the saved entity (not just an ID). To access the auto-generated ID, use `product[EntityId]` (imported symbol).
- **Why:** `createEntity()` was removed in v0.4.0. Entities are now plain JavaScript objects, not class instances. `repo.save()` accepts plain objects directly and returns the entity with `EntityId` attached.

### 4. Missing `redis` package in installation (Installation section)
- **What was wrong:** Only `npm install redis-om` was listed.
- **What was changed:** Updated to `npm install redis-om redis`.
- **Why:** Since the current API requires importing `createClient` from the `redis` package, both packages need to be installed.

### 5. Same deprecated patterns in TypeScript example (TypeScript Example section)
- **What was wrong:** Used `Client` import, `new Client().open()`, and `client.fetchRepository()`.
- **What was changed:** Updated to use `createClient` from `redis`, `await redis.connect()`, and `new Repository<Product>(schema, redis)`.
- **Why:** Same deprecation issues as the JavaScript examples.

## Review Notes
- The search API (`.where()`, `.and()`, `.equals()`, `.true()`, `.matches()`, `.sortBy()`, `.return.all()`, `.return.page()`) is correct and unchanged from earlier versions.
- The `.expire()` and `.remove()` repository methods are correct.
- Schema field types (`text`, `number`, `string`, `boolean`, `string[]`) are all valid.
- The `Entity` type is exported from redis-om and can be extended via `interface Product extends Entity`, which is correct.
- For `sortBy` to work, the field should ideally be marked `sortable: true` in the schema definition. The post does not mention this, but it may work without it depending on the field type and Redis version. This is a minor omission, not a bug.
