# Validation Summary: How to Create Dependency Injection Container in TypeScript

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript (legacy/experimental decorators)
- reflect-metadata (`Reflect.getMetadata`, `Reflect.defineMetadata`, `design:paramtypes`)
- Dependency Injection pattern (constructor injection, singleton/transient/scoped scopes, child containers)
- tsyringe (Microsoft) — comparison reference
- InversifyJS — comparison reference
- Jest (mocks, `jest.Mocked<T>`, `jest.fn`) for testing examples
- Express middleware example for request-scoped containers

## Sources Consulted
- tsyringe README and source: https://github.com/microsoft/tsyringe
- InversifyJS: https://github.com/inversify/InversifyJS
- Bundlephobia for inversify: https://bundlephobia.com/package/inversify
- Bundlephobia for tsyringe: https://bundlephobia.com/package/tsyringe
- TypeScript Decorators handbook: https://www.typescriptlang.org/docs/handbook/decorators.html
- reflect-metadata: https://github.com/rbuckton/reflect-metadata

## Issues Found

1. **Comparison table — tsyringe scopes were understated.** The original table said tsyringe supports only "Singleton, Transient". tsyringe actually supports four lifecycle scopes: `Transient` (default), `Singleton`, `ResolutionScoped`, and `ContainerScoped`. Updated the cell to list all four.

2. **Comparison table — bundle sizes were inaccurate.** The original table claimed `~8KB` for tsyringe and `~50KB` for InversifyJS. Per Bundlephobia, current minified sizes are approximately `~13KB` for tsyringe (v4.x) and `~65KB` for inversify (v8.x). Updated the row label to "Bundle size (minified)" and corrected the figures. Custom container `~2KB` left as-is (a plausible self-reported estimate).

## Review Notes
- The `experimentalDecorators` + `emitDecoratorMetadata` approach used throughout the post is currently the only way to use parameter decorators in TypeScript. The new TC39 Stage 3 decorators (TS 5.0+) do not support parameter decorators, so legacy decorators remain required for DI auto-wiring. This is not a concern but worth knowing for readers wondering about the new decorator syntax.
- The `_brand: T` field on `InjectionToken<T>` is a standard branded-type trick to reduce structural-typing collisions between tokens of different generic parameters. Not perfect, but commonly used and acceptable.
- The Express middleware snippet uses `req.container = ...` which in real code would require a TypeScript module augmentation for `Express.Request`. This is illustrative; not flagged as an error.
- The `mockDatabase: jest.Mocked<Database>` example includes `connect`/`disconnect` methods that are not present on the `Database` interface as informally sketched earlier in the post. Since `Database` is never formally defined, this is illustrative — not a blocking issue.
- `Reflect.getMetadata('design:paramtypes', target)` and the use of `reflect-metadata` polyfill plus `emitDecoratorMetadata` are all correct.
- Bundle-size comparisons can drift over time; the corrected numbers reflect the latest published versions at review time but may need refreshing in the future.
