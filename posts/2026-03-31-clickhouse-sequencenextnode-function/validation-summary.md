# Validation Summary: How to Use sequenceNextNode() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- `sequenceNextNode()` parametric aggregate function

## Sources Consulted
- ClickHouse official documentation for `sequenceNextNode()`: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/parametric-functions#sequencenextnode
- ClickHouse source repository docs (parametric-functions.md): https://github.com/ClickHouse/ClickHouse/blob/master/docs/en/sql-reference/aggregate-functions/parametric-functions.md

## Issues Found

### 1. Wrong second argument in all code examples (Critical)
**What was wrong:** Every code example passed `1` as the second argument, treating it as a "condition that qualifies rows as candidates for the result." According to the official documentation, the second argument is `event_column` — a column reference of type `String` or `Nullable(String)` whose value the function returns.
**What was changed:** Replaced `1` with `event_name` (the column whose value should be returned) in all code examples and the mermaid diagram.

### 2. Missing `base_condition` argument in all code examples (Critical)
**What was wrong:** The actual function signature is `(timestamp, event_column, base_condition, event1, event2, ...)`. The blog omitted the `base_condition` parameter entirely, causing all pattern conditions to be shifted one position left. What the blog treated as "pattern conditions" were actually occupying the `base_condition` slot.
**What was changed:** Added `1` (always true) as the `base_condition` argument in all examples, and shifted pattern conditions to their correct positions.

### 3. Incorrect syntax description and parameter documentation (Critical)
**What was wrong:** The syntax section described the second argument as `event_cond` ("condition that qualifies rows as candidates for the result") and omitted `base_condition` entirely. The correct parameters are `event_column` (a column reference) and `base_condition` (a boolean condition the base point must satisfy).
**What was changed:** Corrected the syntax block and parameter descriptions to match the official documentation.

### 4. Incorrect use of `head`/`tail` base parameter (Major)
**What was wrong:** Most examples used `'head'` (forward) or `'tail'` (backward), but the described intents (e.g., "find what happens after any login event") don't match this behavior. `head` anchors at the first event in the group — it only works if the target event happens to BE the first event. `tail` similarly anchors at the last event.
**What was changed:** Changed forward-looking examples to use `'first_match'` (finds the first occurrence of the pattern) and backward-looking examples to use `'last_match'` (finds the last occurrence), which match the described intent. Kept `'head'` in the mermaid diagram where it was contextually correct (the example shows login as the first event).

### 5. Transition matrix example was fundamentally flawed (Major)
**What was wrong:** The "Building a Transition Matrix" example used `event_name = event_name` as a pattern condition (always true, comparing a column to itself) and grouped by `user_id, event_name, toStartOfHour(event_time)`, which fragments the event sequence and makes the aggregate function meaningless. `sequenceNextNode()` is not designed for building generic transition matrices.
**What was changed:** Replaced the section with a correct example that finds the most common next events after visiting a specific page, which is what `sequenceNextNode()` actually does well. Updated the section title to match.

### 6. Missing experimental setting requirement (Minor)
**What was wrong:** `sequenceNextNode()` is an experimental function that requires `SET allow_experimental_funnel_functions = 1` to use. The blog did not mention this prerequisite.
**What was changed:** Added a note with the required SET command near the top of the post, immediately after the introductory paragraph.

## Review Notes
- The `allow_experimental_funnel_functions` setting name may change in future ClickHouse versions if the function graduates from experimental status.
- The mermaid diagram uses pseudocode-style syntax in the note annotations (e.g., `event_name='login'`); this is acceptable for illustration purposes.
- The summary paragraph was lightly adjusted to say "event column" instead of "event condition" to match the corrected terminology.
