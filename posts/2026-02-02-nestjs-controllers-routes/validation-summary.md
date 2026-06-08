# Validation Summary: How to Implement Controllers and Routes in NestJS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NestJS (controllers, routing, decorators, pipes, versioning)
- Node.js
- TypeScript
- Express (underlying HTTP adapter)
- class-validator (DTO validation decorators: IsString, IsEmail, IsEnum, ValidateNested, IsArray, etc.)
- class-transformer (Type decorator for nested DTOs)
- @nestjs/mapped-types (PartialType)

## Sources Consulted
- NestJS official docs — Controllers: https://docs.nestjs.com/controllers
- NestJS official docs — Pipes (ParseIntPipe, ParseBoolPipe, ParseUUIDPipe, DefaultValuePipe, ValidationPipe): https://docs.nestjs.com/pipes
- NestJS official docs — Validation: https://docs.nestjs.com/techniques/validation
- NestJS official docs — Versioning: https://docs.nestjs.com/techniques/versioning
- NestJS official docs — Mapped Types (PartialType): https://docs.nestjs.com/openapi/mapped-types
- NestJS official docs — Streaming files (StreamableFile): https://docs.nestjs.com/techniques/streaming-files
- class-validator README: https://github.com/typestack/class-validator
- Express 5 / path-to-regexp v8 changes regarding named wildcards (relevant to NestJS 11+)

## Issues Found
- **Wildcard route syntax inconsistency in the Route Summary table**: The body of the post correctly uses the NestJS 11+ (Express 5) named wildcard syntax `@All('*path')` with `@Param('path')`, but the summary table at the end showed the older `@All('*')` form. In Express 5 / NestJS 11+, bare `*` is no longer a valid path pattern; named wildcards (e.g. `*splat`, `*path`) are required. Updated the table entry to `@All('*path')` for consistency with the code example and current NestJS routing behavior.

## Review Notes
- The `HostParam` decorator is imported in the `auth.controller.ts` example but never used. This is a minor code-style issue, not a technical error, and was left as-is per the "only fix technical errors" guidance.
- `ParseBoolPipe` chained after `new DefaultValuePipe(true)` is valid — `ParseBoolPipe` accepts boolean values in addition to the strings `'true'`/`'false'`, so the default boolean flows through correctly.
- The `@All('*path')` example combined with `@Param('path')` is the correct pattern for NestJS 11+ where Express 5's path-to-regexp requires named wildcards. Readers using NestJS 10 or earlier would need `@All('*')` and access via `request.params[0]` or `@Param()` differently — worth a future note if the post is updated for multi-version support.
- All decorators (`@Controller`, `@Get`, `@Post`, `@Put`, `@Delete`, `@Param`, `@Body`, `@Query`, `@Headers`, `@Ip`, `@Req`, `@Res`, `@HttpCode`, `@Header`, `@Version`, `@All`), pipes, and validation decorators referenced are current and correctly used.
- `PartialType` is correctly imported from `@nestjs/mapped-types`; the post could also have noted the alternative `@nestjs/swagger` variant for OpenAPI-aware partial types, but neither is incorrect.
- The `transform: true` option on `ValidationPipe` is necessary for `ParseIntPipe`-style numeric query coercion to play nicely with DTOs, and the post enables it correctly in the global pipe setup.
