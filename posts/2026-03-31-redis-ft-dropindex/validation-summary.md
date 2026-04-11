# Validation Summary: How to Use FT.DROPINDEX in Redis to Delete Search Indexes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RediSearch (Redis Stack Search module)
- FT.DROPINDEX command
- FT.CREATE, FT.INFO commands
- redis-py (Python Redis client)
- Bash scripting with redis-cli

## Sources Consulted
- Official Redis FT.DROPINDEX documentation (https://redis.io/docs/latest/commands/ft.dropindex/)
- Official Redis FT.CREATE documentation (https://redis.io/docs/latest/commands/ft.create/)
- Official Redis FT.INFO documentation (https://redis.io/docs/latest/commands/ft.info/)
- Redis KB article on FT.DROPINDEX DD behavior
- redis-py source code for `dropindex()` method signature and `IndexDefinition` class

## Issues Found
1. **Line 54 — Incorrect description of DD flag behavior**: The post stated "All keys that matched the index's prefix (`user:*`) are now also deleted," implying DD works by prefix-matching keys. In reality, DD deletes only documents that were *successfully indexed* and tracked in the index's internal metadata. Keys that failed indexation (e.g., schema type mismatch) or were not yet indexed (if async indexing was still in progress) are not deleted. Changed to: "All documents that were successfully indexed under this index are now also deleted."

2. **Lines 128-133 — Mermaid flowchart incorrectly depicted DD as a prefix scan**: The flowchart showed "Scan all keys matching index prefix: user:*" followed by "Delete each matching key from Redis." This gives readers the wrong mental model. DD uses the index's internal document tracking, not a prefix scan. Updated the flowchart to reflect the actual mechanism and added a clarifying note about keys that failed indexation or were not yet indexed.

## Review Notes
- The error message `Unknown Index name` on line 37 may vary across Redis Stack versions. Some versions return `"idx:users: no such index"` instead. The blog's version is plausible for `FT.INFO` but readers on newer Redis Stack versions may see different output.
- The Python code passes `delete_documents=False` explicitly, which is the default value. This is fine for clarity/documentation purposes.
- The bash script's approach of checking for index existence via `grep -c "index_name"` on `FT.INFO` output is functional but somewhat fragile; a more robust approach would use `FT._LIST` to enumerate indexes. This is a minor style observation, not a correctness issue.
- The `FT.CREATE` syntax shown in the Mermaid diagram is correct and current.
