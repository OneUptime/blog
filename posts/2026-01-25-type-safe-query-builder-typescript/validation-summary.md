# Validation Summary: How to Build a Type-Safe Query Builder in TypeScript

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- TypeScript
- TypeScript generics, `keyof`, mapped types, and utility types
- SQL query builders
- PostgreSQL parameterized queries
- node-postgres (`pg`) connection pooling and query execution

## Sources Consulted
- TypeScript Handbook: Keyof Type Operator: https://www.typescriptlang.org/docs/handbook/2/keyof-types.html
- TypeScript Handbook: Classes and member visibility: https://www.typescriptlang.org/docs/handbook/2/classes.html
- TypeScript Handbook: Generics: https://www.typescriptlang.org/docs/handbook/2/generics.html
- TypeScript Handbook: Utility Types (`Partial`, `Record`): https://www.typescriptlang.org/docs/handbook/utility-types.html
- node-postgres queries and parameterized query documentation: https://node-postgres.com/features/queries
- node-postgres Pool API documentation: https://node-postgres.com/apis/pool
- PostgreSQL row and array comparisons: https://www.postgresql.org/docs/current/functions-comparisons.html

## Issues Found
- The generic constraint `S extends Record<string, unknown> = DatabaseSchema` did not compile because `DatabaseSchema` does not declare a string index signature. Changed the schema constraint to `S extends object` and constrained row types with `T extends object`.
- `JoinableQueryBuilder` accessed `tableName` and `joins` even though the base class marked them `private`. Changed those members to `protected` and removed the `any` cast from `addJoin`.
- The `Operator` type included `IN`, but the builder generated only a single placeholder and did not implement valid list or array comparison SQL. Removed `IN` from the simple operator set shown in the tutorial.
- `IS NULL` and `IS NOT NULL` conditions were treated like value-bearing predicates and could leave unused parameters in the built query. Added separate null/value operator types, overloads for `where`, and parameter insertion only for value operators.
- Join typing allowed joining columns with incompatible value types, such as a numeric foreign key to a string column. Added a `CompatibleColumnNames` helper so join columns must have matching TypeScript value types.
- The left join result type used `Partial<S[K]>`, which models optional properties, not nullable SQL values. Replaced it with a mapped `Nullable<T>` type that marks joined table column values as `null`-able.
- `ConditionalQueryBuilder<T>` extended a now object-constrained parent without constraining `T`. Added `T extends object`.
- The insert builder comment claimed it ensured all required columns were provided, but the implementation accepts `Partial<T>`. Reworded the comment to accurately state that it provides type-safe column values.
- A conditional-query usage example reused the identifier `query`, which conflicted with the earlier `query()` factory if examples were combined. Renamed the example variable to `searchQuery`.
- `getActiveUsers()` returned `Promise<User[]>` while selecting only a subset of user columns. Changed the example to `selectAll()` so the declared result type matches the selected columns.

## Review Notes
- The examples are intentionally educational and still trust the caller for result typing in `db.execute<T>()`; a production-grade builder would usually carry selected-column types into the result type.
- The local blog repository does not install `pg`, so the `pg` snippet was verified against node-postgres documentation rather than compiled in this workspace.
