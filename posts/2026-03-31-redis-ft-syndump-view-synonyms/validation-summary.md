# Validation Summary: How to Use FT.SYNDUMP in Redis to View Synonyms

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RediSearch (Redis Search module)
- FT.SYNDUMP command
- FT.SYNUPDATE command
- FT.CREATE command
- redis-py (Python Redis client)

## Sources Consulted
- Official Redis documentation for FT.SYNDUMP: https://redis.io/docs/latest/commands/ft.syndump/
- Official Redis documentation for FT.SYNUPDATE: https://redis.io/docs/latest/commands/ft.synupdate/
- Official Redis documentation for FT.CREATE: https://redis.io/docs/latest/commands/ft.create/
- redis-py source code (syndump parsing logic in `redis/commands/search/commands.py`)

## Issues Found

### 1. FT.SYNDUMP return format was completely inverted (Critical)
**What was wrong:** The entire post described the FT.SYNDUMP output as mapping group IDs to term arrays (group_id → terms). The actual format per the official Redis docs is the opposite: it maps terms to group ID arrays (term → group_ids). Each odd entry is a synonym term and each even entry is the list of group IDs that term belongs to.

**What was changed:**
- Updated the introductory description to say "Each term maps to the list of synonym group IDs it belongs to" instead of "Each synonym group is identified by its group ID and contains the list of terms."
- Updated the Syntax section's return description from "alternating between group IDs and their term arrays" to "alternating between terms and their synonym group ID arrays."
- Completely rewrote the example output to show the correct term → group_ids format (e.g., `"car"` → `["vehicles"]` instead of `"vehicles"` → `["car", "automobile", ...]`).
- Updated the mermaid diagram to illustrate term → group ID mapping.
- Fixed the "Parsing the Output" section to show terms at even indexes and group ID arrays at odd indexes.
- Fixed the Summary section.

### 2. Python client output was inverted (Critical)
**What was wrong:** The Python example showed `r.ft("products").syndump()` returning `{"vehicles": ["car", ...]}` (group → terms). The redis-py `_parse_syndump` method actually returns `{"car": ["vehicles"], "automobile": ["vehicles"], ...}` (term → group_ids), matching the underlying Redis wire format.

**What was changed:** Corrected the Python dict example to `{"car": ["vehicles"], "automobile": ["vehicles"], "laptop": ["computing"], ...}` and added a clarifying comment.

### 3. Minor wording fixes
Updated several phrases throughout to consistently refer to the correct mapping direction (term → group IDs rather than group → terms).

## Review Notes
- The FT.CREATE syntax, FT.SYNUPDATE syntax, and general command usage are all correct.
- The claim that there is no built-in command to delete a synonym group is accurate.
- The workaround of overwriting a group with a single term to effectively neutralize it is a reasonable suggestion.
- The `--` comment syntax used in Redis code blocks is acceptable as redis-cli treats it as a comment-like convention in documentation, though it is not an official Redis comment syntax.
- The Python code is shown in a `text` code block rather than `python`, which is acceptable given it's a brief snippet.
