# Validation Summary: How to Create Indexes with Collation in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (collation feature, index creation, `mongosh` shell)
- ICU Collation (locale and strength levels)

## Sources Consulted
- MongoDB official documentation: Collation — https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB official documentation: db.collection.createIndex() — https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB official documentation: Collation Strength Levels (ICU levels 1–5) — https://www.mongodb.com/docs/manual/reference/collation/#collation-document-fields
- MongoDB official documentation: db.createCollection() — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/

## Issues Found

1. **Incorrect collation strength level descriptions (comment in code block)**: The inline comment described strength levels as `1=case-insensitive, 2=accent-insensitive, 3=exact`. Per the ICU collation specification used by MongoDB: strength 1 (Primary) compares base characters only and ignores both case and accents; strength 2 (Secondary) ignores case but distinguishes accents; strength 3 (Tertiary, default) is the exact comparison. The comment `2=accent-insensitive` was particularly misleading since strength 2 actually *respects* accents. Fixed to `1=base characters only, 2=case-insensitive, 3=exact (default)`.

2. **Accented characters rendered as plain "e"**: The French collation section stated it handles `"e", "e", and "e"` — the accented characters were lost (likely an encoding issue during authoring). Fixed to `"é", "è", and "ê"`.

3. **Awkward `findOne` example with non-standard syntax**: The `findOne` call had unusual formatting with a dangling comma and used `const result =` assignment mixed with `mongosh` shell-style `db.users` calls. Replaced with the idiomatic `db.users.find().collation().limit(1)` pattern, which is consistent with the cursor-based `.collation()` approach used elsewhere in the post.

## Review Notes
- The post correctly notes that queries must specify the same collation as the index for the query planner to use the collation index. This is an important and often-missed detail.
- The collection-level collation section is accurate — indexes created on a collection with a default collation do inherit it unless explicitly overridden.
- Strength 1 is used in the French sorting example, which ignores both case and accents. For French sorting where accent distinctions matter in ordering, strength 2 or 3 might be more appropriate in practice, but strength 1 is still valid and the code works as shown.
