# How to Update Every Nested Key Matching a Name Pattern with Recursive yq Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Configuration Management, Command Line, Automation

Description: Find and update deeply nested YAML values by key-name regex with Mike Farah yq v4 while controlling types, match counts, aliases, and renames.

---

Mike Farah yq's recursive descent operator, `..`, visits every value node in a YAML document. Combine it with `key`, `test`, and a parenthesized assignment target to update values whose key names match a pattern at any depth.

```bash
KEY_PATTERN='^timeout(_ms)?$' VALUE=5000 yq '
  (.. | select(
    (kind == "scalar") and
    ((key | tag) == "!!str") and
    (key | test(strenv(KEY_PATTERN)))
  )) = env(VALUE)
' config.yml
```

The key-type check is important because recursive descent also visits the root and array elements, whose keys are null or numeric rather than strings.

## Update Matching Keys at Any Depth

Given `config.yml`:

```yaml
defaults:
  timeout: 1000
services:
  - name: api
    timeout_ms: 2000
    nested:
      timeout: 3000
  - name: worker
    timeout_seconds: 4
```

Run:

```bash
KEY_PATTERN='^timeout(_ms)?$' VALUE=5000 yq '
  (.. | select(
    (kind == "scalar") and
    ((key | tag) == "!!str") and
    (key | test(strenv(KEY_PATTERN)))
  )) = env(VALUE)
' config.yml
```

Output:

```yaml
defaults:
  timeout: 5000
services:
  - name: api
    timeout_ms: 5000
    nested:
      timeout: 5000
  - name: worker
    timeout_seconds: 4
```

The anchored regex matches exactly `timeout` or `timeout_ms`. It does not match `timeout_seconds`.

## Understand the Selection

This part selects candidate value nodes:

```text
.. | select(...)
```

For each candidate:

- `kind == "scalar"` prevents a matching map or sequence from being replaced wholesale.
- `key` returns the current map key or array index.
- `key | tag` distinguishes string map keys from numeric array indexes and the keyless root.
- `key | test(...)` applies a regular expression to the key name.

The complete recursive selector is wrapped in parentheses on the left side of `=`. That updates matching paths in the original document instead of printing only the matched fragments.

## Use the Right Value Boundary

`env(VALUE)` parses the environment value as YAML. In the example, `5000` becomes an integer.

For a string value, use `strenv`:

```bash
KEY_PATTERN='^log(_level)?$' VALUE=warning yq '
  (.. | select(
    (kind == "scalar") and
    ((key | tag) == "!!str") and
    (key | test(strenv(KEY_PATTERN)))
  )) = strenv(VALUE)
' config.yml
```

Using `env` for a value such as `true`, `null`, `[one, two]`, or `{mode: fast}` creates a boolean, null, sequence, or map. Choose the function from the destination schema, not from convenience.

## Count Matches Before Editing

A recursive pattern can be broader or narrower than expected. Preview the matching paths:

```bash
KEY_PATTERN='^timeout(_ms)?$' yq '
  [.. | select(
    (kind == "scalar") and
    ((key | tag) == "!!str") and
    (key | test(strenv(KEY_PATTERN)))
  ) | path]
' config.yml
```

Count them:

```bash
KEY_PATTERN='^timeout(_ms)?$' yq '
  [.. | select(
    (kind == "scalar") and
    ((key | tag) == "!!str") and
    (key | test(strenv(KEY_PATTERN)))
  )] | length
' config.yml
```

For a single-document file, require at least one match in the same operation:

```bash
KEY_PATTERN='^timeout(_ms)?$' VALUE=5000 yq -e -i '
  select(([.. | select(
    (kind == "scalar") and
    ((key | tag) == "!!str") and
    (key | test(strenv(KEY_PATTERN)))
  )] | length) > 0) |
  (.. | select(
    (kind == "scalar") and
    ((key | tag) == "!!str") and
    (key | test(strenv(KEY_PATTERN)))
  )) = env(VALUE)
' config.yml
```

If the count is zero, the outer `select` emits nothing and `-e` returns nonzero. If there should be an exact number of matches, replace `> 0` with that explicit equality.

## Transform Each Old Value Relatively

Use `|=` when the new value depends on the old value. To double every integer key ending in `_limit`:

```bash
KEY_PATTERN='_limit$' yq '
  (.. | select(
    (tag == "!!int") and
    ((key | tag) == "!!str") and
    (key | test(strenv(KEY_PATTERN)))
  )) |= . * 2
' config.yml
```

The right side runs once with each selected scalar as context. Plain `=` evaluates its right side against the broader input context, so relative assignment is the clearer form for calculations and string rewrites.

## Rename Matching Keys Instead of Their Values

`..` visits values but excludes map key nodes. The three-dot form, `...`, includes both values and map keys. Filter with `is_key` before rewriting names:

```bash
KEY_PATTERN='^old_' REPLACEMENT='' yq '
  (... | select(
    is_key and test(strenv(KEY_PATTERN))
  )) |= sub(strenv(KEY_PATTERN); strenv(REPLACEMENT))
' config.yml
```

For this input:

```yaml
old_name: top
nested:
  old_value: one
  keep: two
```

The output is:

```yaml
name: top
nested:
  value: one
  keep: two
```

Renaming keys can create collisions. If both `old_name` and `name` exist under the same parent, the result may contain duplicate or overwritten semantics depending on subsequent processing. Preview every old path and proposed new name, then reject collisions before editing production data.

## Write Regexes as a Contract

yq uses Go's regular-expression engine, whose syntax follows RE2. Anchor patterns when a full key-name match is intended:

| Pattern | Meaning |
| --- | --- |
| `^timeout$` | Only `timeout` |
| `^timeout(_ms)?$` | `timeout` or `timeout_ms` |
| `(?i)^log_level$` | Case-insensitive exact match |
| `_limit$` | Any string key ending in `_limit` |

Do not use yq's string equality operator as a substitute for regex equality. String equality supports wildcard behavior, while `test` makes the regular-expression policy explicit.

## Know the Alias Boundary

The official recursive-descent documentation notes that `..` does not traverse through alias targets or YAML merge documents. It visits an alias node, but it does not recursively revisit the anchored content through every alias reference.

If every materialized copy must be edited independently, exploding aliases first is possible:

```bash
yq --yaml-fix-merge-anchor-to-spec=true '
  explode(.) |
  (.. | select(
    (kind == "scalar") and
    ((key | tag) == "!!str") and
    (key | test("^timeout$"))
  )) = 5000
' config.yml
```

`explode(.)` removes anchors and aliases by materializing their values. That is a structural change, not merely a search option. If shared anchor semantics must remain, update the anchor definition directly instead.

## Consider Multi-Document Files

Normal `yq` evaluation applies the expression to every YAML document in sequence. The at-least-one guard shown above is evaluated separately per document, so documents with no match are omitted.

If the requirement is to preserve every document and require at least one match across the complete stream, use `eval-all`, collect the stream, perform one global count, then emit documents with `split_doc`. Do not assume a truthy result from one document proves all documents met their own constraints.

## Conclusion

Use `..` to visit values recursively, filter by a string `key`, apply `test` with an anchored RE2 pattern, and put the full selector on the assignment's left side. Restrict node kinds and value types, count matches before editing, use `...` plus `is_key` only for key renames, and handle anchors and multi-document streams as explicit boundaries.

## Official Documentation

- [Mike Farah yq: Recursive Descent Glob](https://mikefarah.gitbook.io/yq/operators/recursive-descent-glob)
- [Mike Farah yq: Keys Operator](https://mikefarah.gitbook.io/yq/operators/keys)
- [Mike Farah yq: String Operators and Regex Syntax](https://mikefarah.gitbook.io/yq/operators/string-operators)
- [Mike Farah yq: Assign Update Operator](https://mikefarah.gitbook.io/yq/operators/assign-update)
- [Mike Farah yq: Path Operator](https://mikefarah.gitbook.io/yq/operators/path)
- [Mike Farah yq v4.53.6 Release](https://github.com/mikefarah/yq/releases/tag/v4.53.6)
