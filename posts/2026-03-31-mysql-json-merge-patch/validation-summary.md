# Validation Summary: How to Use JSON_MERGE_PATCH() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- SQL
- JSON functions (JSON_MERGE_PATCH, JSON_MERGE_PRESERVE, JSON_OBJECT)
- RFC 7396 (JSON Merge Patch)

## Sources Consulted
- MySQL 8.0 Reference Manual: JSON_MERGE_PATCH() — https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-merge-patch
- MySQL 8.0 Reference Manual: JSON_MERGE_PRESERVE() — https://dev.mysql.com/doc/refman/8.0/en/json-modification-functions.html#function_json-merge-preserve
- RFC 7396: JSON Merge Patch — https://datatracker.ietf.org/doc/html/rfc7396

## Issues Found

### 1. Incorrect output and contradictory note in "Applying a Patch Update" section

**What was wrong:** The expected output showed `"notifications": {"email": false}` — with the `sms` key missing. The accompanying note stated: "The `notifications` object was merged recursively. `sms: false` was lost because the patch replaced the entire `notifications` sub-object with only the provided keys." This is contradictory (it says "merged recursively" but then describes replacement behavior) and factually incorrect.

Per RFC 7396 and MySQL's implementation, when both the target value and the patch value for a given key are JSON objects, they are merged recursively. Since the original `notifications` is `{"email": true, "sms": false}` and the patch `notifications` is `{"email": false}`, both are objects, so recursive merging applies. The `sms` key is absent from the patch, so it is preserved in the result. The correct output is `{"email": false, "sms": false}`.

**What was changed:** Fixed the output to include `"sms": false` in the notifications object. Rewrote the note to accurately explain that recursive merging preserved the `sms` key, and clarified that replacement only occurs when the patch value is a non-object type.

**Why:** The original text would mislead readers into thinking JSON_MERGE_PATCH replaces nested objects entirely, which contradicts the core recursive merge behavior defined in RFC 7396 and is precisely the distinction that makes JSON_MERGE_PATCH useful for partial updates.

## Review Notes
- The post correctly notes that `JSON_MERGE_PATCH()` follows RFC 7396 semantics and was introduced in MySQL 8.0.3 (implicitly, by using the function name rather than the deprecated `JSON_MERGE()`).
- The comparison with `JSON_MERGE_PRESERVE()` is accurate: arrays are replaced by PATCH but concatenated by PRESERVE, and scalar values are replaced by PATCH but combined into arrays by PRESERVE.
- All SQL syntax is correct and would execute without errors on MySQL 8.0+.
- The mermaid diagram correctly illustrates the merge behavior.
- The "Basic Merge", "Removing a Key with null", "Merging Multiple Documents", "Flattening Nested Objects", and "Building a Patch from Column Values" sections are all technically correct.
