# Validation Summary: How to Build Interceptors in NestJS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NestJS interceptors
- TypeScript
- Node.js
- RxJS Observables and operators
- NestJS dependency injection and global providers
- NestJS custom metadata with `SetMetadata` and `Reflector`
- HTTP exception handling in NestJS

## Sources Consulted
- NestJS Interceptors documentation: https://docs.nestjs.com/interceptors
- NestJS Execution Context and metadata documentation: https://docs.nestjs.com/fundamentals/execution-context
- NestJS Exception Filters documentation: https://docs.nestjs.com/exception-filters
- NestJS Caching documentation: https://docs.nestjs.com/techniques/caching
- RxJS `timeout` operator documentation: https://rxjs.dev/api/operators/timeout
- RxJS `catchError` operator documentation: https://rxjs.dev/api/operators/catchError
- Node.js `process.hrtime.bigint()` documentation: https://nodejs.org/api/process.html

## Issues Found
- The timeout section showed `timeout.interceptor.ts` and `timeout.decorator.ts` in the same TypeScript code block, leaving an `import` declaration after executable class code. Split the decorator into its own code block so each file example is valid independently.
- The metrics interceptor used `throw error` inside an RxJS `catchError` selector. Changed it to `return throwError(() => error)` to match RxJS error-handling patterns and keep the operator callback returning an observable.
- The error formatting interceptor assumed `HttpException.getResponse()` always returned a non-null object with string `error` or `message` fields. Added guards so custom `HttpException` response objects do not cause formatting code to throw while handling another error.
- The conditional interceptor usage comment implied that `@ExcludeInterceptor('LoggingInterceptor')` would skip the earlier logging interceptor automatically. Reworded it to clarify that only a `ConditionalInterceptor` subclass that reads the metadata can skip itself.
- The multiple global interceptor example referenced interceptor classes without importing them. Added imports for the interceptor classes used in the module snippet.

## Review Notes
The examples are accurate for HTTP controllers using NestJS interceptors. For production use, the custom in-memory cache and in-process metrics buffer should be replaced or backed by shared infrastructure when running multiple application instances.
