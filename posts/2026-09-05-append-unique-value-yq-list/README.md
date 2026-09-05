# How to Append to a yq List Only If the Value Is Not Already Present

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Configuration Management, Command Line, Automation

Description: Append a scalar or object to a YAML array only when absent, using exact array subtraction or deliberate deduplication with Mike Farah yq v4.

---

An idempotent configuration command should produce the same document on its second run. A plain array append does not:

```bash
VALUE=traces yq -i '.plugins += [strenv(VALUE)]' config.yml
```

Run twice, and `traces` appears twice. To append one scalar only when it is absent-without deleting unrelated pre-existing duplicates-subtract the current array from the one-element candidate array:

```bash
VALUE=traces yq '
  .plugins = (
    (.plugins // []) +
    ([strenv(VALUE)] - (.plugins // []))
  )
' config.yml
```

## See the Exact Behavior

Given:

```yaml
plugins:
  - logs
  - metrics
```

With `VALUE=traces`, the expression produces:

```yaml
plugins:
  - logs
  - metrics
  - traces
```

With `VALUE=metrics`, it produces the unchanged array. Array subtraction removes from its left operand any values present in its right operand:

```text
[candidate] - existing
```

The result is `[candidate]` when absent or `[]` when present. Array addition then concatenates that zero-or-one list to the existing values.

After previewing, add `-i`:

```bash
VALUE=$value yq -i '
  .plugins = (
    (.plugins // []) +
    ([strenv(VALUE)] - (.plugins // []))
  )
' config.yml
```

`strenv` ensures a value such as `true`, `001`, or `null` remains a string.

## Initialize an Absent List

The `(.plugins // [])` expression treats a missing or null `plugins` node as an empty array. It also treats false as a fallback condition. Since `plugins: false` is likely invalid rather than absent, validate the shape in important automation:

```bash
yq -e '
  (has("plugins") | not) or
  (.plugins | tag == "!!null") or (.plugins | tag == "!!seq")
' config.yml >/dev/null
```

Then run the append expression. This separates convenient null initialization from malformed input.

## Choose Between Conditional Append and Deduplication

If the existing list is:

```yaml
plugins:
  - logs
  - logs
```

The subtraction recipe preserves both existing `logs` entries. Its contract is narrowly append-if-absent.

If the desired contract is instead to clean the whole list, append and run `unique`:

```bash
VALUE=traces yq '
  .plugins = ((.plugins // []) + [strenv(VALUE)] | unique)
' config.yml
```

The official `unique` operator maintains the original order while filtering duplicate values. This removes old duplicates as well as preventing a new one. In v4.53.3, scalar uniqueness is keyed by the scalar's text rather than its YAML tag, so a string and number with the same textual value can collapse together. Validate a homogeneous list before using `unique` when types matter.

That difference can matter. Removing duplicates may be a helpful repair, or it may hide an upstream generation bug. Choose it explicitly.

## Preserve YAML Types

The recursive comparison used by array subtraction includes built-in scalar tags and compares scalar text; custom scalar tags are resolved to their underlying types, and collection tags are ignored. Therefore the string `"3"` and integer `3` are different candidates in this recipe. Append a number with `env`:

```bash
VALUE=3 yq '
  .ports = (
    (.ports // []) +
    ([env(VALUE)] - (.ports // []))
  )
' service.yml
```

Append the text `3` with `strenv`:

```bash
VALUE=3 yq '
  .codes = (
    (.codes // []) +
    ([strenv(VALUE)] - (.codes // []))
  )
' service.yml
```

Do not let visual similarity choose the type. Follow the consuming schema and verify with the `tag` operator when needed.

## Append an Object by Full Equality

Array subtraction can compare complete object values:

```bash
ITEM='{name: traces, enabled: true}' yq '
  env(ITEM) as $item |
  .plugins = (
    (.plugins // []) +
    ([$item] - (.plugins // []))
  )
' config.yml
```

This appends only when no existing object is deeply equal to the candidate. An object with the same `name` but a different `enabled` value is not equal, so both will remain.

Use this only when full object equality defines identity. `env(ITEM)` parses a complete YAML node, so the variable must come from a trusted serialized source. For arbitrary Bash data, construct the object with `strenv` and `env` fields instead:

```bash
NAME=traces ENABLED=true yq '
  {"name": strenv(NAME), "enabled": env(ENABLED)} as $item |
  .plugins = ((.plugins // []) + ([$item] - (.plugins // [])))
' config.yml
```

## Enforce Uniqueness by One Field

When object identity is `name`, `unique_by(.name)` is concise:

```bash
NAME=traces ENABLED=true yq '
  .plugins = (
    (.plugins // []) +
    [{"name": strenv(NAME), "enabled": env(ENABLED)}] |
    unique_by(.name)
  )
' config.yml
```

Because the existing array comes first and `unique_by` maintains original order, an existing object wins. The command prevents an append but does **not** update the existing object's `enabled` field.

If the candidate should override or merge an existing object, that operation is an upsert, not append-if-absent. Use a selector-based update plus conditional append and define how duplicate identities are handled.

## Do Not Use String `contains` as Equality

The `contains` operator on strings tests substring inclusion. The official documentation points out that array containment can also use containment behavior for string elements. A check involving `cat` and `cats` may therefore surprise someone expecting exact scalar equality.

Array subtraction is especially clear for append-if-absent because its recursive comparison is type-aware and treats wildcard characters literally. For a boolean preflight, `any_c(. == strenv(VALUE))` is common, but Mike Farah yq's scalar `==` comparison supports wildcard patterns and compares scalar text without requiring matching YAML tags. Validate both type and caller-provided wildcard characters if exact string identity is required.

The subtraction recipe treats a literal `*` as a scalar value rather than a glob in v4.53.3, which is another reason it is useful here.

## Validate the Result in CI

After rendering a candidate, assert both array type and occurrence count:

```bash
VALUE=$value yq -e '
  strenv(VALUE) as $wanted |
  (
    (.plugins | tag == "!!seq") and
    ([.plugins[] |
      . as $candidate |
      select(
        (($candidate | contains($wanted)) and
         ($wanted | contains($candidate)))
      )
    ] | length == 1)
  )
' candidate.yml >/dev/null
```

For scalar strings, mutual `contains` checks are true only when both the text and string tag match exactly. They do not interpret `*` or `?` as patterns. If list elements may be non-strings, validate the intended element type separately.

If duplicates anywhere are forbidden:

```bash
yq -e '
  (.plugins | length) == (.plugins | unique | length)
' candidate.yml >/dev/null
```

This follows v4.53.3's `unique` semantics, including its scalar-text behavior. Add a homogeneous-tag check when a mixed string-and-number list should treat equal-looking values as distinct. Validation after construction catches wrong paths and pre-existing corruption before publication.

## Add Several Candidate Values

If candidate values are already a trusted YAML array:

```bash
CANDIDATES='[metrics, traces, profiles]' yq '
  env(CANDIDATES) as $new |
  .plugins = ((.plugins // []) + ($new - (.plugins // [])))
' config.yml
```

This appends candidates absent from the old list in candidate order. If `CANDIDATES` itself contains duplicates, those duplicates can survive because subtraction only compares against the old list. Apply `unique` to the candidate array to remove candidate duplicates; apply it to the final result when global uniqueness is the contract, since candidate-only deduplication leaves old duplicates intact:

```bash
CANDIDATES='[metrics, traces, traces]' yq '
  env(CANDIDATES) as $new |
  .plugins = ((.plugins // []) + $new | unique)
' config.yml
```

Again, validate that `env(CANDIDATES)` has tag `!!seq` before using untrusted configuration.

## Consider Ordering, Comments, and Concurrent Writers

Conditional append preserves the order of existing items and places a new value at the end. `unique` also preserves the first occurrence's order, according to the official documentation.

Array reconstruction may affect comment placement or style. Mike Farah yq attempts to preserve presentation but documents limitations inherited from its YAML parser. Review representative fixtures when comments or anchors matter.

No expression prevents two separate processes from both reading an old file and racing to replace it. Use one configuration owner or a lock shared by every writer. Never write with `yq ... file > file`; use `-i` or a validated temporary-file replacement.

## Conclusion

For a precise append-if-absent operation, append the result of `[candidate] - existing`. It leaves existing order and duplicates alone. Use `unique` when the broader contract is to deduplicate the entire scalar list, and `unique_by(field)` when the first object with a field value should win. Preserve YAML types with `strenv` or `env`, validate array shape, and use a true upsert when an existing object must be updated rather than merely retained.

## Official Documentation

- [Mike Farah yq: Subtract Operator](https://mikefarah.gitbook.io/yq/operators/subtract)
- [Mike Farah yq: Add Operator](https://mikefarah.gitbook.io/yq/operators/add)
- [Mike Farah yq: Unique Operator](https://mikefarah.gitbook.io/yq/operators/unique)
- [Mike Farah yq: Contains Operator](https://mikefarah.gitbook.io/yq/operators/contains)
- [Mike Farah yq: Environment Variable Operators](https://mikefarah.gitbook.io/yq/operators/env-variable-operators)
- [Mike Farah yq v4.53.3: Unique Implementation](https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/operator_unique.go)
- [Mike Farah yq v4.53.3: Recursive Node Comparison](https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/lib.go)
