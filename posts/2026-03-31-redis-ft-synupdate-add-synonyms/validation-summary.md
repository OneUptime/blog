# Validation Summary: How to Use FT.SYNUPDATE in Redis to Add Synonyms

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RediSearch (Redis Stack Search module)
- FT.SYNUPDATE command
- FT.SYNDUMP command
- FT.CREATE and FT.SEARCH commands

## Sources Consulted
- Official Redis FT.SYNUPDATE documentation: https://redis.io/docs/latest/commands/ft.synupdate/
- Official Redis FT.SYNDUMP documentation: https://redis.io/docs/latest/commands/ft.syndump/
- Redis Synonyms overview: https://redis.io/docs/latest/develop/ai/search-and-query/advanced-concepts/synonyms/

## Issues Found

### 1. FT.SYNUPDATE incorrectly described as replacing synonym groups
- **What was wrong:** The post stated "Calling `FT.SYNUPDATE` with an existing group ID replaces the group's terms" and instructed readers to "include all terms (old plus new)" when updating a group.
- **What was changed:** Corrected to explain that FT.SYNUPDATE **adds** new terms to an existing group (it does not replace). Updated the example to only pass the new term ("truck") and added a note that terms cannot be removed from a synonym group once added.
- **Why:** The official documentation states FT.SYNUPDATE "creates or updates a synonym group with additional terms." The operation is additive, not a replacement.

### 2. FT.SYNDUMP output format was incorrect
- **What was wrong:** The post showed FT.SYNDUMP output grouped as group_id -> list of terms (e.g., "vehicles" followed by a nested list of "car", "automobile", etc.).
- **What was changed:** Corrected the output to show the actual format: a flat list of terms, each followed by an array of synonym group IDs it belongs to (term -> group_ids).
- **Why:** The official FT.SYNDUMP documentation specifies the return value as pairs of term and array of synonym group IDs.

### 3. SKIPINITIALSCAN description was misleading
- **What was wrong:** The post stated "The synonym will apply to documents indexed after this point," implying existing documents would not be matched at all. The syntax section described it as "do not re-index existing documents."
- **What was changed:** Updated both the syntax bullet point and the example section to clarify that SKIPINITIALSCAN skips updating the inverted index for existing documents, but query-time synonym expansion still matches existing documents.
- **Why:** Synonyms in RediSearch work at both index time (inverted index entries) and query time (query expansion). SKIPINITIALSCAN only affects the index-time component; query-time expansion still covers existing documents.

### 4. Invalid Redis comment syntax
- **What was wrong:** The update example used `--` as comment markers inside a Redis code block (`-- Original group: vehicles = car, automobile, vehicle`). Redis CLI does not support `--` comments.
- **What was changed:** Removed the comment lines as part of the rewrite of the update example section.
- **Why:** If a reader copies the code block into a Redis CLI, the `--` lines would cause errors.

## Review Notes
- The post correctly identifies that synonym group IDs are strings (confirmed by official docs: "which can be any short string").
- The post correctly notes that synonym expansion happens at query time and does not modify stored data, though the full picture is more nuanced (synonyms operate at both index time and query time internally).
- The FT.SEARCH output examples appear reasonable for the given sample data and synonym configuration.
- The practical use case examples (e-commerce, technical docs, medical/legal) are well-chosen and the commands are syntactically correct.
- The mermaid diagrams accurately represent the conceptual flow of synonym matching.
