# Validation Summary: How to Handle Exceptions with Custom Filters in NestJS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NestJS
- Node.js
- TypeScript
- Express
- class-validator / class-transformer validation through NestJS ValidationPipe
- HTTP exception handling
- Jest-style unit testing

## Sources Consulted
- NestJS Exception Filters documentation: https://docs.nestjs.com/exception-filters
- NestJS Validation documentation: https://docs.nestjs.com/techniques/validation
- NestJS Middleware documentation: https://docs.nestjs.com/middleware
- NestJS Migration Guide for NestJS 11 / Express 5 wildcard routing: https://docs.nestjs.com/migration-guide
- OneUptime homepage, for referenced product URL: https://oneuptime.com/
- GitHub author profile URL: https://github.com/nawazdhandala

## Issues Found
- The post said filters should be registered from most specific to most general, but the current NestJS exception filter documentation states that when a catch-all filter is combined with type-specific filters, the catch-all filter should be declared first so specific filters can correctly handle their bound exception types. I updated the registration comment and conclusion wording to match NestJS documentation.
- The middleware example used `forRoutes('*')`. The NestJS 11 migration guide says all-routes middleware should use a named wildcard such as `'{*splat}'` for Express 5-compatible path matching. I updated the example to `forRoutes('{*splat}')`.

## Review Notes
The examples use direct Express `Request` and `Response` objects, which is valid for Express-based NestJS applications. The official NestJS docs also show a platform-agnostic alternative using `HttpAdapterHost`, which could be considered in a future revision if the post wants to support both Express and Fastify adapters more explicitly.
