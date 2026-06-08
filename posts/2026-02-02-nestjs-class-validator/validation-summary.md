# Validation Summary: How to Add Validation with class-validator in NestJS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NestJS (ValidationPipe, controllers, modules, exception filters, pipes)
- class-validator (built-in decorators, custom decorators, async validators, validation groups)
- class-transformer (@Type, @Expose, implicit type conversion)
- TypeScript (decorators, DTOs, enums)
- Node.js / npm

## Sources Consulted
- NestJS official documentation — Validation: https://docs.nestjs.com/techniques/validation
- NestJS official documentation — Pipes: https://docs.nestjs.com/pipes
- NestJS official documentation — Exception filters: https://docs.nestjs.com/exception-filters
- class-validator GitHub README: https://github.com/typestack/class-validator
- class-transformer GitHub README: https://github.com/typestack/class-transformer
- class-validator decorator signatures (IsCreditCard, IsAlpha, IsAlphanumeric, IsPhoneNumber, IsIP, IsUUID, IsEnum, etc.)
- registerDecorator API reference in class-validator
- ValidatorConstraint / ValidatorConstraintInterface API reference

## Issues Found
No technical issues found.

The following items were checked carefully and confirmed correct:

- `ValidationPipe` options (`whitelist`, `forbidNonWhitelisted`, `transform`, `transformOptions.enableImplicitConversion`) are valid current options.
- The `@ValidateNested({ each: true })` + `@Type(() => Foo)` pattern for nested arrays/objects is the canonical approach and is described correctly.
- `useContainer(app.select(AppModule), { fallbackOnErrors: true })` is the correct pattern to enable DI in class-validator-managed validators.
- `@ValidatorConstraint({ name: 'isUniqueEmail', async: true })` paired with `@Injectable()` and providing the constraint in a module is the recommended approach for async validators with DI.
- Decorator signatures with locale/region as the first argument (e.g. `IsAlpha('en-US', options)`, `IsAlphanumeric('en-US', options)`, `IsPhoneNumber('US', options)`, `IsIP('4', options)`) are correct.
- `IsUUID('4', { each: true, message: ... })` correctly applies the validator to each array element.
- Validation groups behavior — only fields with decorators matching the requested groups are validated — is described correctly.
- The custom exception filter correctly extracts `exceptionResponse.message` (which class-validator/ValidationPipe returns as an array of strings by default).
- `ParseUUIDPipe({ version: '4' })` is a valid constructor signature.

## Review Notes
- The password regex `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/` is unusual: it only consumes a single character after the lookaheads (no quantifier or end-of-string anchor). It still functions correctly in conjunction with the separate `@MinLength(8)` because the four lookaheads enforce character-class composition over the whole string. A more conventional form would be `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/` (which would also restrict the allowed character set across the whole password). Not a bug given the message ("must contain ..."), but worth noting for future readers.
- The `CommonValidationsDto` example imports a few decorators (`IsBoolean`, `IsDate`, `IsNumber`, `IsUrl`, `IsUUID`, `IsJSON`, `IsCurrency`, `IsPostalCode`, `IsNegative`) and `Type` that are not used in the class body. Not technically incorrect, just unused imports a linter would flag.
- `@IsPositive()` combined with `@Min(1)` on `quantity` is slightly redundant (since `IsPositive` already requires > 0 and a positive integer is necessarily ≥ 1), but both pass — no functional issue.
- With `transform: true` + `enableImplicitConversion: true`, the explicit `@Type(() => Number)` on `PaginationDto` numeric fields is not strictly required, but it is harmless and makes intent clear without relying on implicit conversion.
- When the global `ValidationPipe` is already enabled and a method also applies `@UsePipes(new ValidationPipe({ groups: [...] }))`, the method-level pipe takes precedence for that handler — this is the intended pattern for groups and is correct as shown.
