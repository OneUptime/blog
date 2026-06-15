# Validation Summary: How to Implement RBAC with Custom Guards in NestJS

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Node.js
- TypeScript
- NestJS
- NestJS guards and decorators
- Passport JWT authentication
- Role-Based Access Control (RBAC)
- Jest / NestJS testing utilities

## Sources Consulted
- NestJS Guards documentation: https://docs.nestjs.com/guards
- NestJS Authorization documentation: https://docs.nestjs.com/security/authorization
- NestJS Authentication documentation: https://docs.nestjs.com/security/authentication
- NestJS Passport recipe: https://docs.nestjs.com/recipes/passport
- NestJS Execution Context and metadata documentation: https://docs.nestjs.com/fundamentals/execution-context
- NestJS Request lifecycle documentation: https://docs.nestjs.com/faq/request-lifecycle
- NestJS CLI usage documentation: https://docs.nestjs.com/cli/usages
- NestJS Configuration documentation: https://docs.nestjs.com/techniques/configuration
- passport-jwt README: https://github.com/mikenicholson/passport-jwt

## Issues Found
- The setup commands used `ConfigService` from `@nestjs/config` later in the article but did not install `@nestjs/config`. Added the missing `npm install @nestjs/config` command.
- The article registered `JwtAuthGuard` globally but did not define it. More importantly, a normal global Passport JWT guard would reject `@Public()` routes before the RBAC guard could allow them. Added a `JwtAuthGuard` implementation that checks `IS_PUBLIC_KEY` with `Reflector.getAllAndOverride()` before delegating to `AuthGuard('jwt')`, matching the NestJS authentication pattern for public routes.
- The auth module injected `ConfigService` into `JwtStrategy` but did not initialize `ConfigModule` in the module imports. Updated the module example to include `ConfigModule.forRoot({ isGlobal: true })`.
- The resource ownership decorator used `Reflect.metadata`, which is less consistent with NestJS examples and can cause TypeScript typing issues unless reflect-metadata typings are available. Replaced it with NestJS `SetMetadata`.
- The controller example threw `ForbiddenException` but did not import it from `@nestjs/common`. Added the missing import.

## Review Notes
- The examples are technically valid as a guide, but several surrounding services and DTOs (`UsersService`, `AuthService`, `PostsService`, `CreateUserDto`, `UpdateUserDto`) are assumed rather than fully implemented.
- The `ResourceOwnerGuard` assumes another guard or interceptor loads `request.resource`; that assumption is stated in the post and is acceptable for this guide.
- For production systems, role/permission definitions should usually be stored in a database or policy service and cache invalidation should be designed explicitly.
