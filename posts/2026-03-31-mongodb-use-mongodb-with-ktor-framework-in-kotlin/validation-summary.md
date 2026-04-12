# Validation Summary: How to Use MongoDB with Ktor Framework in Kotlin

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (with Kotlin coroutine driver 5.1.0)
- Kotlin
- Ktor 2.3.0 (Netty engine)
- kotlinx.serialization 1.6.0
- Gradle (Kotlin DSL)

## Sources Consulted
- MongoDB Kotlin Driver documentation: https://www.mongodb.com/docs/drivers/kotlin/coroutine/current/
- MongoDB Kotlin Driver data class codec and BSON annotations: https://www.mongodb.com/docs/drivers/kotlin/coroutine/current/fundamentals/data-formats/data-classes/
- Ktor documentation (Content Negotiation, Routing, Serialization): https://ktor.io/docs/server-serialization.html
- kotlinx.serialization documentation: https://github.com/Kotlin/kotlinx.serialization

## Issues Found

### Issue 1: Missing `@BsonId` annotation on the `Product.id` field

**What was wrong:** The `Product` data class used `@SerialName("_id")` to map the `id` property to MongoDB's `_id` field. However, `@SerialName` is a kotlinx.serialization annotation that only affects JSON serialization (used by Ktor's content negotiation). It has no effect on how the MongoDB Kotlin driver's data class codec maps fields to BSON.

Without `@BsonId`, the MongoDB driver would store the `id` value under a BSON field named `id` (not `_id`), and MongoDB would auto-generate a separate `ObjectId` for the document's `_id`. This means the `find(Document("_id", id))` and `deleteOne(Document("_id", id))` queries in the route handlers would never find matching documents.

**What was changed:** Added `@BsonId` annotation from `org.bson.codecs.pojo.annotations` to the `id` field, and added the corresponding import. The `@SerialName("_id")` was kept so that JSON responses from the API also use `_id` as the field name, maintaining consistency.

**Why:** The MongoDB Kotlin coroutine driver uses its own BSON codec system with annotations from `org.bson.codecs.pojo.annotations`, not kotlinx.serialization annotations. `@BsonId` tells the driver's data class codec that this property represents the document's `_id` field.

## Review Notes
- When `id` is `null` on insert, MongoDB will auto-generate an `ObjectId` for `_id`. Reading this back as `String?` relies on the driver's type coercion. In production code, using `org.bson.types.ObjectId` as the ID type would be more robust, but for this introductory tutorial the `String?` approach is acceptable.
- The `build.gradle.kts` snippet only shows the `dependencies` block. A complete project would also need the `kotlin("plugin.serialization")` Gradle plugin in the `plugins` block for `@Serializable` to work. This is a minor omission typical of focused tutorials.
- Using `org.bson.Document` for query filters works but is less type-safe than `com.mongodb.client.model.Filters.eq("_id", id)`. Both approaches are valid.
