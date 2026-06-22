# Validation Summary: How to Validate Data with Custom Pipes in NestJS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- NestJS
- TypeScript
- Node.js
- ValidationPipe
- Custom pipes
- Dependency injection
- JavaScript number parsing

## Sources Consulted
- NestJS pipes documentation: https://docs.nestjs.com/pipes
- NestJS validation documentation: https://docs.nestjs.com/techniques/validation
- NestJS providers and dependency injection documentation: https://docs.nestjs.com/providers
- NestJS custom providers documentation: https://docs.nestjs.com/fundamentals/custom-providers
- NestJS PipeTransform interface source: https://github.com/nestjs/nest/blob/master/packages/common/interfaces/features/pipe-transform.interface.ts
- ECMAScript parseInt specification: https://tc39.es/ecma262/#sec-parseint-string-radix
- TypeScript handbook on classes and `super()`: https://www.typescriptlang.org/docs/handbook/2/classes.html

## Issues Found
- The numeric pipe examples used `parseInt()` and `parseFloat()`, which accept partial strings such as `12abc` and can silently truncate decimal input. Updated the examples to convert the full value with `Number()`, reject empty and non-finite values, and use `Number.isInteger()` where whole numbers are required.
- The async entity-exists example instantiated a pipe in a decorator with `this.usersService` and `this.productsService`. Decorator expressions are evaluated before controller instances exist, so that pattern cannot access constructor-injected services. Replaced it with a DI-friendly pipe factory that returns a Nest mixin class and injects the selected service token.
- The HTML pipe comment described the example as sanitizing HTML to prevent XSS. The code performs HTML entity escaping, not full HTML sanitization, so the wording was corrected to avoid overstating the security guarantee.
- The array pipe catch block accessed `error.message` directly. In strict TypeScript, caught values are `unknown`, so the example now checks `error instanceof Error` before reading the message.
- `UuidArrayPipe` referenced `this.uuidRegex` inside the object passed to `super()`, which is invalid because subclasses cannot use `this` before `super()` completes. Moved the regex to a module-level constant and used that in the validator.
- `UuidArrayPipe` lowercased array items before confirming they were strings. Updated the transformer so non-string items pass through to the validator instead of throwing a method error.

## Review Notes
The remaining NestJS concepts are aligned with the official documentation: pipes implement `PipeTransform`, run before route handlers, can transform or validate request arguments, can be bound by class or instance at parameter level, and `ValidationPipe` can be registered globally with `useGlobalPipes()` or via the `APP_PIPE` provider token. The post uses illustrative snippets rather than complete files, so controller/service/decorator imports are not exhaustive in every example.
