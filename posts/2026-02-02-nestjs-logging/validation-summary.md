# Validation Summary: How to Add Logging to NestJS Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NestJS (built-in `Logger`, `LoggerService` interface, interceptors, middleware)
- TypeScript
- Winston + `nest-winston`
- Express (Request/Response types, headers, status codes)
- RxJS (`Observable`, `tap` operator)
- `uuid` package (v4)

## Sources Consulted
- NestJS Logger documentation: https://docs.nestjs.com/techniques/logger
- NestJS Interceptors documentation: https://docs.nestjs.com/interceptors
- NestJS Middleware documentation: https://docs.nestjs.com/middleware
- NestJS Custom providers / `APP_INTERCEPTOR`: https://docs.nestjs.com/fundamentals/custom-providers
- `nest-winston` package documentation: https://github.com/gremo/nest-winston
- Winston documentation: https://github.com/winstonjs/winston
- Express documentation for `Request`/`Response` types and `setHeader`
- `uuid` package documentation: https://github.com/uuidjs/uuid

## Issues Found
No technical issues found.

Verified items:
- `Logger` import from `@nestjs/common` and signature `new Logger(context)` — correct.
- Log level methods (`log`, `error`, `warn`, `debug`, `verbose`) — match NestJS's standard log levels.
- `Logger.error(message, stack, context?)` signature — matches NestJS's documented API.
- `NestFactory.create(AppModule, { logger: [...] })` option with log-level array — correct.
- `bufferLogs: true` option for `NestFactory.create` — correct, documented for deferring log output until the custom logger is registered.
- `app.useLogger(app.get(CustomLoggerService))` pattern with `Scope.TRANSIENT` — correct.
- `LoggerService` interface from `@nestjs/common` — correct; the custom implementation covers the documented methods.
- `WinstonModule.forRoot()` and `WINSTON_MODULE_PROVIDER` injection token from `nest-winston` — correct.
- Winston format helpers (`combine`, `timestamp`, `colorize`, `printf`, `json`) and transports (`Console`, `File`) — match Winston's API.
- `NestInterceptor`, `ExecutionContext`, `CallHandler` imports from `@nestjs/common` — correct.
- `APP_INTERCEPTOR` from `@nestjs/core` for global interceptor registration — correct.
- `NestMiddleware`, `MiddlewareConsumer`, `NestModule` and `consumer.apply(...).forRoutes('*')` — match NestJS middleware API.
- `uuid` v4 import (`import { v4 as uuidv4 } from 'uuid'`) — correct named import.
- Express `Request`/`Response` typing and `res.setHeader` usage — correct.
- The log output format example (`[Nest] 12345 - 02/02/2026, ... LOG [Context]`) accurately reflects NestJS's `ConsoleLogger` default output.

## Review Notes
- Minor cosmetic: in the first version of `LoggingInterceptor`, `body` is destructured from `request` but never used. Not a technical error; harmless.
- NestJS 10 introduced a `fatal` log level (and `Logger.fatal()`). The post lists five levels and does not mention `fatal`. Not incorrect for general guidance, but readers using NestJS 10+ may want to be aware.
- `forRoutes('*')` is the long-standing documented wildcard syntax. With NestJS v11 (which moves to Express 5 / path-to-regexp v6), some wildcard route patterns behave differently. The plain `'*'` pattern in middleware `forRoutes` is still documented and supported, so this remains correct, but readers targeting NestJS 11+ should consult current docs if they extend the pattern.
- The example `findOne(id)` call on a TypeORM-style repository uses the legacy signature. Modern TypeORM expects `findOne({ where: { id } })`. The snippet is illustrative for the logging discussion (not a TypeORM tutorial), so this is acceptable context but worth noting if copied verbatim.
- Custom logger `verbose` uses `console.log` rather than a dedicated verbose stream. This is a stylistic choice and not incorrect; `console` has no `verbose` method.
