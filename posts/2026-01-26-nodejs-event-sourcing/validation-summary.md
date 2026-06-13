# Validation Summary: How to Build Event Sourcing Systems in Node.js

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Node.js
- TypeScript
- npm
- ts-node
- uuid
- Event Sourcing
- CQRS
- Domain aggregates
- Event stores
- Projections and read models
- Snapshots

## Sources Consulted
- TypeScript TSConfig `types` option: https://www.typescriptlang.org/tsconfig/types
- TypeScript TSConfig `lib` option: https://www.typescriptlang.org/tsconfig/lib.html
- npm dependency and devDependency documentation: https://docs.npmjs.com/specifying-dependencies-and-devdependencies-in-a-package-json-file/
- uuid npm package documentation: https://www.npmjs.com/package/uuid
- @types/uuid npm package notice: https://www.npmjs.com/package/@types/uuid
- Microsoft Azure Architecture Center event sourcing pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing
- Microsoft Azure Architecture Center CQRS pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs
- Local verification with Node.js 22.22.0, npm 10.9.4, TypeScript, ts-node, and uuid in a clean temporary project.

## Issues Found
- The setup command installed `@types/uuid`, but the current `uuid` package ships its own TypeScript definitions and `@types/uuid` is only a stub package. Removed `@types/uuid` from the dev dependency install command.
- The `tsconfig.json` snippet did not explicitly include Node globals. In a clean project with the current toolchain, the snippets failed to type-check because `console` and `setTimeout` were not available. Added `"types": ["node"]`.
- The event store comment said returning a copied array prevented external modification. That was too broad because the event objects are still shared. Reworded it to say it prevents callers from replacing the internal array.
- The projection runner was described as subscribing to the event store, but the implementation polls `loadAll()` on an interval. Reworded the description to say it polls the event store.
- The snapshot repository only created a snapshot when the final aggregate version was exactly divisible by the snapshot frequency, so a batched save could skip a snapshot boundary. Updated the condition to snapshot when the save crosses a snapshot boundary.

## Review Notes
- The corrected snippets were assembled into a clean temporary TypeScript project and verified with `npx tsc --noEmit` and `npx ts-node src/main.ts`.
- The sample remains intentionally in-memory and uses `any` for snapshot access as the post already warns; this is acceptable for a tutorial but should be replaced with explicit serialization methods in production code.
