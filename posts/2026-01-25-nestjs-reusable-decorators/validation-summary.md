# Validation Summary: How to Create Reusable Decorators in NestJS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NestJS
- TypeScript
- Node.js
- RxJS
- class-validator
- TypeORM
- NestJS Swagger/OpenAPI decorators

## Sources Consulted
- NestJS custom decorators documentation: https://docs.nestjs.com/custom-decorators
- NestJS interceptors documentation: https://docs.nestjs.com/interceptors
- NestJS validation documentation: https://docs.nestjs.com/techniques/validation
- NestJS OpenAPI decorators documentation: https://docs.nestjs.com/openapi/decorators
- TypeScript decorators handbook: https://www.typescriptlang.org/docs/handbook/decorators.html
- class-validator documentation: https://github.com/typestack/class-validator
- Node.js crypto.randomUUID documentation: https://nodejs.org/api/crypto.html#cryptorandomuuidoptions

## Issues Found
- The request metadata example used `crypto.randomUUID()` without importing or otherwise defining `crypto`. Changed it to import `randomUUID` from `node:crypto` and call `randomUUID()`.
- The retry decorator assumed caught values were always `Error` objects. Updated the catch block to rethrow non-`Error` values before passing the error to `retryOn`, and normalized `attempts` to at least one to avoid throwing `undefined` when `attempts: 0` is provided.
- The `SecureController` decorator example used `SetMetadata` but did not import it. Added `SetMetadata` to the `@nestjs/common` import.
- The `AuthenticatedEndpoint` file example used `applyDecorators`, `SetMetadata`, and several Swagger decorators without imports. Added the missing imports.
- The validation decorator example referenced `User` without importing it. Added an example entity import.
- The async class-validator constraint injected a TypeORM repository but did not mention the required Nest/class-validator dependency injection setup. Added a minimal `main.ts` example showing `useContainer(app.select(AppModule), { fallbackOnErrors: true })` and noted that the constraint should be registered as a provider.

## Review Notes
- The cache interceptor example is technically valid for demonstrating metadata plus interception, but production use should generally consider Nest's cache manager integration, distributed cache backends, cache invalidation, request-body-aware keys for relevant methods, and cache size limits.
- Several controller usage snippets remain intentionally abbreviated and assume common NestJS imports such as `Controller`, `Get`, `Post`, `Body`, and DTO/entity types are defined elsewhere.
