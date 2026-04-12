# Validation Summary: How to Serialize and Deserialize MongoDB Documents in Java

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Java Driver (4.x+)
- BSON library (`org.bson`)
- POJO Codec (`org.bson.codecs.pojo`)
- Extended JSON serialization (`JsonWriterSettings`, `JsonMode`)

## Sources Consulted
- MongoDB Java Driver documentation: https://www.mongodb.com/docs/drivers/java/sync/current/
- MongoDB BSON types reference: https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB Extended JSON (v2) specification: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/
- `org.bson.json.JsonMode` API reference: https://mongodb.github.io/mongo-java-driver/4.11/apidocs/bson/org/bson/json/JsonMode.html

## Issues Found

### 1. Incorrect default JSON output mode (line 137)
- **What was wrong:** The comment `// Canonical Extended JSON` on `doc.toJson()` stated the default output is canonical, but since MongoDB Java Driver 4.x, `Document.toJson()` defaults to `JsonMode.RELAXED` (Relaxed Extended JSON), not canonical.
- **What was changed:** Corrected the comment to `// Relaxed Extended JSON (default mode)` and replaced the redundant explicit `JsonMode.RELAXED` example with an explicit `JsonMode.EXTENDED` example for canonical mode. This makes the three examples show three distinct modes (relaxed default, canonical explicit, shell explicit).
- **Why:** The original code would mislead readers into thinking `toJson()` preserves all BSON type wrappers when it actually uses relaxed format by default.

### 2. Description mentioned "Jackson integration" (line 7)
- **What was wrong:** The post description claimed coverage of "Jackson integration for mapping BSON types to Java classes," but the post does not mention or demonstrate Jackson (`jackson-databind`, `mongojack`, or `bson4jackson`) at all.
- **What was changed:** Replaced "Jackson integration" with "JSON export settings" to accurately reflect the content.
- **Why:** The description should match the actual content of the post.

## Review Notes
- The `@BsonProperty` import on line 80 is included but unused in the POJO example. It's a commonly paired import with `@BsonId` so it's not harmful, but could be removed for cleanliness.
- The summary mentions `java.time.Instant` as an option for timestamps, which is supported via the POJO codec's `InstantCodec`, but the post doesn't demonstrate it. Not incorrect, but could benefit from a brief example in a future update.
- `JsonMode.SHELL` is used for "mongosh" compatibility. While SHELL mode predates mongosh (it was designed for the legacy `mongo` shell), the format remains compatible with mongosh, so the comment is acceptable.
- The canonical Extended JSON format in the Java driver uses `JsonMode.EXTENDED` (not a hypothetical `JsonMode.CANONICAL`), which is the standard enum value name.
