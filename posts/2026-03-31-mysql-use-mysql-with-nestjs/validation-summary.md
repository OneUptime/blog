# Validation Summary: How to Use MySQL with NestJS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- NestJS
- TypeORM (0.3+)
- Node.js
- TypeScript
- mysql2 driver

## Sources Consulted
- TypeORM official documentation — https://typeorm.io/
- TypeORM EntityManager API — https://typeorm.io/entity-manager-api
- NestJS Database (TypeORM) documentation — https://docs.nestjs.com/techniques/database
- NestJS TypeORM recipe — https://docs.nestjs.com/recipes/sql-typeorm
- TypeORM migration CLI documentation — https://typeorm.io/migrations

## Issues Found
1. **`manager.decrement()` missing entity class argument** (Handling Transactions section): The call `manager.decrement({ id: productId }, 'stock', 1)` was missing the required first argument — the entity class. The `EntityManager.decrement()` signature is `decrement(entityClass, conditions, propertyPath, value)`. Fixed to `manager.decrement(Product, { id: productId }, 'stock', 1)`.

## Review Notes
- The code snippets omit some standard imports (e.g., `@Module` from `@nestjs/common`, `@Injectable` from `@nestjs/common`, and the `Product`/`Order` entity imports in the transaction example). This is a common and acceptable pattern in blog tutorials that focus on the relevant API rather than boilerplate, but beginners may need to add those imports themselves.
- The migration commands use `npx typeorm` with a `.ts` data source file. This works in NestJS projects where ts-node is available, but some setups may require `npx typeorm-ts-node-commonjs` instead. Both approaches are documented in TypeORM's official docs.
- All TypeORM APIs used (`forRoot`, `forFeature`, `@InjectRepository`, `Repository`, `DataSource.transaction`) are current for TypeORM 0.3+ and are not deprecated.
