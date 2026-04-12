# Validation Summary: How to Use KMongo for Idiomatic Kotlin MongoDB Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Kotlin
- KMongo (org.litote.kmongo)
- KMongo Coroutine module (kmongo-coroutine)
- Kotlin Coroutines (kotlinx-coroutines-core)
- Gradle Kotlin DSL (build.gradle.kts)

## Sources Consulted
- [KMongo GitHub Repository (deprecated)](https://github.com/Litote/kmongo) — confirmed deprecated status and latest version
- [KMongo Documentation](https://litote.org/kmongo/) — verified API usage: `eq`, `lt`, `and`, `ascending`, `setValue`, `inc`, `match`, `group`, `sum`, `upsert()`
- [KMongo Quick Start](https://litote.org/kmongo/quick-start/) — verified client creation pattern with `KMongo.createClient()` and `.coroutine`
- [KMongo Typed Queries](https://litote.org/kmongo/typed-queries/) — verified property reference filter syntax
- [Maven Central: kmongo-coroutine](https://central.sonatype.com/artifact/org.litote.kmongo/kmongo-coroutine/versions) — confirmed version 4.11.0 exists, latest is 5.6.0
- [Official MongoDB Kotlin Driver Docs](https://www.mongodb.com/docs/drivers/kotlin/coroutine/current/) — confirmed as official replacement
- [MongoDB KMongo Migration Guide](https://www.mongodb.com/docs/drivers/kotlin/coroutine/current/migrate-kmongo/) — confirmed migration path exists

## Issues Found

### 1. Missing deprecation notice (factual accuracy)
**What was wrong:** The introduction presented KMongo as a current, active framework with no mention that it was deprecated in June 2023 in favor of the official MongoDB Kotlin Driver.
**What was changed:** Added a blockquote note after the introduction paragraph informing readers of the deprecation, linking to the official MongoDB Kotlin Driver and the migration guide.
**Why:** A tutorial published in 2026 for a library deprecated since 2023 must disclose this to readers so they can make informed decisions about adopting it for new projects.

### 2. Outdated dependency version (4.11.0 → 5.6.0)
**What was wrong:** The installation section specified `kmongo-coroutine:4.11.0`, which is a valid but outdated version (released ~2023). The latest maintenance release is 5.6.0 (March 2025).
**What was changed:** Updated the version from `4.11.0` to `5.6.0` in the Gradle dependency block.
**Why:** Even for a deprecated library, users should use the latest maintenance release to benefit from bug fixes. The core API is unchanged between 4.11.0 and 5.6.0.

## Review Notes
- **`CategorySummary` data class is undefined:** The aggregation section references `CategorySummary` without defining it. Readers would need to infer the structure (e.g., `data class CategorySummary(val category: String, val count: Int)`). Additionally, since MongoDB's `$group` stage outputs `_id` for the group key, proper deserialization into a `category` field would require `@BsonId` or `@BsonProperty("_id")` on the `category` property, or a custom codec. This is a completeness issue rather than a strict error, since the example illustrates the KMongo aggregation pattern.
- **All KMongo API usage is correct:** The filter operators (`eq`, `lt`, `and`), sort helper (`ascending`), update operators (`setValue`, `inc`), aggregation stages (`match`, `group`, `sum`), and `upsert()` helper are all verified to exist in KMongo's source and documentation.
- **Client creation pattern is correct:** `KMongo.createClient()` from `org.litote.kmongo.reactivestreams` with `.coroutine` extension to get a `CoroutineClient` is the documented approach.
- **Upsert with data class is valid:** KMongo's `CoroutineCollection.updateOne` has an overload accepting a data class directly as the update parameter, which internally converts it using `toBsonModifier`.
- **kotlinx-coroutines-core 1.8.0** is a valid version, though more recent releases exist. This is not incorrect.
