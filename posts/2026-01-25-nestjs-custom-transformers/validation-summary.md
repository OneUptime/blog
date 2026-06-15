# Validation Summary: How to Transform Data with Custom NestJS Transformers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NestJS
- TypeScript
- Node.js
- class-transformer
- class-validator
- DTO validation
- Custom pipes and parameter decorators

## Sources Consulted
- NestJS Pipes documentation: https://docs.nestjs.com/pipes
- NestJS Validation documentation: https://docs.nestjs.com/techniques/validation
- NestJS Custom Decorators documentation: https://docs.nestjs.com/custom-decorators
- NestJS Request Lifecycle FAQ: https://docs.nestjs.com/faq/request-lifecycle
- class-transformer official repository documentation: https://github.com/typestack/class-transformer
- class-validator official repository documentation: https://github.com/typestack/class-validator
- OWASP Cross-Site Scripting Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- DOMPurify official repository documentation: https://github.com/cure53/DOMPurify

## Issues Found
- The trim pipe comment said it only transformed POST/PUT requests, but `ArgumentMetadata.type === 'body'` applies to body-bound values regardless of HTTP method. Updated the comment to say it transforms request body values.
- The date transformer claimed to normalize localized date formats, but JavaScript `Date` parsing for non-ISO strings is runtime-dependent. Updated the wording to describe ISO strings, timestamps, and other formats that the runtime can parse consistently.
- Numeric date parsing returned `Date` objects without checking whether they were valid. Added validity checks for both seconds and milliseconds timestamp branches.
- The email and phone `@Transform()` examples could throw on non-string values before `class-validator` could report a validation error. Added type guards so invalid types are passed through to validation instead.
- The HTML sanitization example implied regex replacements were enough to remove XSS content. Added a clear code comment that production XSS protection should use a vetted sanitizer such as DOMPurify or sanitize-html.

## Review Notes
The examples use current NestJS APIs such as `PipeTransform`, `ArgumentMetadata`, `useGlobalPipes`, `ValidationPipe`, `@UsePipes()`, and `createParamDecorator()`. `ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })` matches official NestJS validation behavior. The custom `ParsedInt` decorator is valid, though NestJS's built-in `ParseIntPipe` remains the usual choice for simple route parameter parsing.
