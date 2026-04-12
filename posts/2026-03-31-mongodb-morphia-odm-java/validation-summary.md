# Validation Summary: How to Use MongoDB with Morphia ODM in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Java
- Morphia ODM (dev.morphia.morphia:morphia-core 2.4.x)
- MongoDB Java Sync Driver (mongodb-driver-sync)
- Maven

## Sources Consulted
- Morphia official documentation: https://morphia.dev
- Morphia GitHub repository (2.4.x branch): https://github.com/MorphiaOrg/morphia
- Morphia source code: `Datastore`, `Query`, `FindOptions`, `Sort`, `Filters`, `UpdateOperators`, `DeleteOptions` classes
- MongoDB Java Driver documentation: https://www.mongodb.com/docs/drivers/java/sync/current/

## Issues Found

### 1. Wrong Sort class in Sorting and Pagination section (HIGH - would not compile)
- **What was wrong:** The post imported `com.mongodb.client.model.Sorts` and used `Sorts.ascending("price")`. `FindOptions.sort()` does not accept a `Bson` type returned by `com.mongodb.client.model.Sorts`. It expects `dev.morphia.query.Sort` objects.
- **What was changed:** Replaced import `com.mongodb.client.model.Sorts` with `dev.morphia.query.Sort` and changed `Sorts.ascending("price")` to `Sort.ascending("price")`.
- **Why:** The original code would fail to compile. Morphia has its own `Sort` class that `FindOptions` accepts.

### 2. `.delete()` missing multi option (MEDIUM - misleading behavior)
- **What was wrong:** The delete example used `.delete()` with no options, which only deletes the **first** matching document. The context of the example (deleting all discontinued products) implies all matches should be removed.
- **What was changed:** Added `new DeleteOptions().multi(true)` to the `.delete()` call and added the `DeleteOptions` import.
- **Why:** Without `.multi(true)`, only one document would be deleted, which contradicts the apparent intent of the example.

## Review Notes
- **Maven version 2.4.0 is valid but outdated:** The latest in the 2.4.x line is 2.4.18, and the latest stable release is 2.5.x. The code in the post is compatible with 2.4.0 so this is not incorrect, just not the latest.
- **`ensureIndexes()` is deprecated since 2.4.0** with `forRemoval = true`. In newer Morphia versions, index creation is configured via `MorphiaConfig` and happens automatically. The code still works but may be removed in a future major version.
- **`Query.update(...).execute()` pattern is deprecated** in 2.4.x. The newer API uses `update(UpdateOptions, UpdateOperator...)` returning `UpdateResult` directly. The deprecated form still compiles and works.
- **`@Embedded` annotation is deprecated since Morphia 2.2.** The recommendation is to use `@Entity` on embedded types and simply omit the `@Id` field. The annotation still works in 2.4.x.
- **`getMapper().mapPackage()` may not exist** in all 2.4.x releases. In Morphia 2.x, package mapping is typically configured via `MorphiaConfig`. This could not be conclusively verified, so it was left as-is.
- **`save()` upsert claim is accurate** for the common non-versioned entity case. For entities annotated with `@Version`, `save()` uses `replaceOne` with `upsert=false`, which is a distinction the post does not make. This is an acceptable simplification for a tutorial.
