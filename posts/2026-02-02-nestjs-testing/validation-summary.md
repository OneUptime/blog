# Validation Summary: How to Write Tests in NestJS

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- NestJS (`@nestjs/common`, `@nestjs/testing`, `@nestjs/typeorm`)
- TypeScript
- Jest
- TypeORM (`Repository`, `findOne`, `create`, `save`)
- Supertest (HTTP assertions for e2e tests)
- NestJS CLI generated `package.json` test scripts

## Sources Consulted
- NestJS official documentation — Testing: https://docs.nestjs.com/fundamentals/testing
- NestJS official documentation — Database (TypeORM integration): https://docs.nestjs.com/techniques/database
- NestJS official documentation — Pipes (`ParseIntPipe`, `ValidationPipe`): https://docs.nestjs.com/pipes
- TypeORM Repository API documentation: https://typeorm.io/repository-api
- Jest documentation — Mock Functions: https://jestjs.io/docs/mock-functions
- Supertest README: https://github.com/ladjs/supertest
- NestJS CLI scaffolding (default `package.json` scripts and e2e setup)

## Issues Found
- **Duplicate `const module` declaration in a single code block** (section: "Mocking Providers and Dependencies"). The example showed two snippets — a factory-function example and an `overrideProvider`/`overrideGuard` example — both declaring `const module: TestingModule = ...` inside the same fenced TypeScript block. As written, this would produce a TypeScript "Cannot redeclare block-scoped variable 'module'" compile error. Fixed by splitting the two examples into separate fenced code blocks so each `const module` lives in its own scope, preserving the author's variable naming and intent.

## Review Notes
- All other code examples are syntactically valid and use current, non-deprecated APIs:
  - `findOne({ where: { id } })` is the correct TypeORM 0.3+ signature (object-based criteria), not the deprecated `findOne(id)` form.
  - `getRepositoryToken(User)` is the correct injection token helper from `@nestjs/typeorm`.
  - `overrideProvider(...).useValue(...)` chained with `overrideGuard(...).useValue(...)` matches the documented `TestingModuleBuilder` fluent API.
  - `import * as request from 'supertest';` is the style used by the default NestJS e2e scaffold and works under standard NestJS `tsconfig.json` (with `esModuleInterop`, `import request from 'supertest'` would also work — both are acceptable).
  - `ValidationPipe` usage and `app.getHttpServer()` in the supertest setup match official docs.
- The `GET /users/1` and `GET /users/99999` e2e tests assume specific database state (a user with id 1 exists, id 99999 does not). This is a test-design caveat rather than a technical error — in a real project these would typically be paired with database seeding or a transactional rollback strategy, but the post is illustrative rather than prescribing a full e2e setup.
- The controller method `findOne` is not declared `async`, but returns a `Promise` directly from the service. Awaiting it in the spec (`const result = await controller.findOne(1);`) is correct.
- `ParseIntPipe` only runs during HTTP dispatch; the controller unit test calling `controller.findOne(1)` directly bypasses the pipe, which is the standard and expected behavior for unit testing controllers in isolation.
