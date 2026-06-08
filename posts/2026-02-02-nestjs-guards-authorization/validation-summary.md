# Validation Summary: How to Use Guards for Authorization in NestJS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NestJS (framework)
- TypeScript
- `@nestjs/common` (CanActivate, ExecutionContext, UseGuards, SetMetadata, etc.)
- `@nestjs/core` (Reflector, APP_GUARD)
- `@nestjs/passport` (AuthGuard, PassportStrategy)
- `passport-jwt` (Strategy, ExtractJwt)
- JWT-based authentication
- Role-Based Access Control (RBAC)

## Sources Consulted
- NestJS official documentation — Guards: https://docs.nestjs.com/guards
- NestJS official documentation — Authentication: https://docs.nestjs.com/security/authentication
- NestJS official documentation — Authorization (RBAC): https://docs.nestjs.com/security/authorization
- NestJS official documentation — Custom decorators and Reflector: https://docs.nestjs.com/fundamentals/execution-context
- `@nestjs/passport` package documentation
- `passport-jwt` package documentation

## Issues Found
No technical issues found.

All technical claims and code examples were verified against the official NestJS documentation:

- The `CanActivate` interface signature and return types are correct.
- The default behavior of NestJS throwing a `ForbiddenException` when a guard returns `false` is correct.
- `ExecutionContext` correctly extends `ArgumentsHost` and exposes `switchToHttp()`, `switchToWs()`, `switchToRpc()`, `getHandler()`, and `getClass()` as documented.
- Guard registration patterns (`@UseGuards()` on method/class, `app.useGlobalGuards()`, and `APP_GUARD` provider token) are all accurate.
- The note that `useGlobalGuards(new AuthGuard())` does not support DI, and that `APP_GUARD` should be used for DI-aware global guards, matches the official docs.
- JWT guard pattern extending `AuthGuard('jwt')` from `@nestjs/passport`, including the `handleRequest` override for custom error handling, is the recommended pattern.
- `PassportStrategy(Strategy)` with `ExtractJwt.fromAuthHeaderAsBearerToken()`, `ignoreExpiration: false`, and `secretOrKey` is the canonical `passport-jwt` setup.
- The `SetMetadata` + custom decorator + `Reflector.getAllAndOverride` pattern matches the official RBAC recipe.
- Guard execution order (Global → Controller → Method, and left-to-right within `@UseGuards()`) is correct.
- The Public route decorator pattern mirrors the official NestJS authentication recipe.

## Review Notes
- The post uses both `reflector.get<T>(metadataKey, target)` (in the permission guard) and `reflector.getAllAndOverride<T>(metadataKey, targets)` (elsewhere). Both are valid APIs; the official docs lean toward `getAllAndOverride`/`getAll` for collecting metadata from multiple targets (handler + class). The `get` usage in the permission guard only inspects the handler, which is consistent with its single-target signature, so this is fine — though readers may wish to use `getAllAndOverride` to also support class-level `@SetMetadata('permission', ...)`.
- The `JwtAuthGuard` constructor in the Public Routes example calls `super()` with no arguments, which is appropriate because the parent `AuthGuard('jwt')` mixin handles initialization internally.
- The post uses `process.env.JWT_SECRET` directly for the JWT secret. This works, but in production NestJS apps `ConfigService` from `@nestjs/config` is generally preferred. This is a stylistic choice, not a correctness issue.
- No version-specific caveats; the patterns shown are current as of NestJS 10/11.
