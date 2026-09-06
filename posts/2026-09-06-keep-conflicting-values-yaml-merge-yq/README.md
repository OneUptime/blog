# How to Keep Every Conflicting Value When Merging YAML Files with yq

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Configuration Management, Data Transformation, Automation

Description: Preserve all values at selected conflicting YAML paths with Mike Farah yq v4 while retaining normal override behavior elsewhere.

---

A normal deep merge must choose one side of a scalar conflict. With Mike Farah yq, the right-hand value wins:

```bash
yq ea '. as $doc ireduce ({}; . * $doc)' defaults.yml region.yml
```

If both files define `service.endpoint`, this command keeps only the later endpoint. The `+` merge flag does not change scalar conflicts; it only appends arrays. To keep every occurrence, make the lossless fields arrays deliberately.

## Keep Selected Conflicts as Arrays

Suppose `defaults.yml` contains:

```yaml
service:
  endpoint: https://primary.example.com
  retries: 3
  modes:
    - read
logging:
  level: info
```

And `region.yml` contains:

```yaml
service:
  endpoint: https://backup.example.com
  retries: 5
  modes:
    - write
logging:
  format: json
```

This expression first performs a normal merge and then replaces the designated conflict paths with arrays collected from every document:

```bash
yq eval-all '
  [.] as $docs |
  ($docs[] as $doc ireduce ({}; . * $doc)) as $merged |
  $merged |
  .service.endpoint = [
    $docs[] |
    .service | select(has("endpoint")) | .endpoint
  ] |
  .service.retries = [
    $docs[] |
    .service | select(has("retries")) | .retries
  ]
' defaults.yml region.yml
```

Output:

```yaml
service:
  endpoint:
    - https://primary.example.com
    - https://backup.example.com
  retries:
    - 3
    - 5
  modes:
    - write
logging:
  level: info
  format: json
```

Only `service.endpoint` and `service.retries` become lossless lists. The unrelated `modes` array follows normal merge behavior and is replaced by the later array. Nested logging keys still deep-merge normally.

## Why the Collection Checks `has`

Reading an absent path normally produces null. If a document does not define `endpoint`, simply collecting `.service.endpoint` would add a null that was never present in the source.

This pipeline checks map membership first:

```text
.service | select(has("endpoint")) | .endpoint
```

It excludes an absent key but retains an explicitly present null value. That distinction matters when null means disabled or intentionally cleared.

The output path is always an array, even if only one source defines it. This is deliberate: a stable schema is easier for consumers than a field that switches between scalar and array depending on the number of inputs.

## `*+` Works When the Schema Already Uses Arrays

If every value that must be preserved is already represented as an array, the append merge flag is much simpler:

```yaml
# defaults.yml
service:
  endpoints:
    - https://primary.example.com
```

```yaml
# region.yml
service:
  endpoints:
    - https://backup.example.com
```

Merge with:

```bash
yq ea '. as $doc ireduce ({}; . *+ $doc)' \
  defaults.yml region.yml
```

Result:

```yaml
service:
  endpoints:
    - https://primary.example.com
    - https://backup.example.com
```

This is ideal when the schema naturally says there may be several endpoints. Remember that `*+` appends every conflicting array in the document, not just `service.endpoints`.

## Wrap Known Scalar Paths Before an Append Merge

Another valid pattern converts selected scalar fields to one-element arrays in every input, then uses `*+`:

```bash
yq ea '
  (
    (.service | select(has("endpoint")) | .endpoint),
    (.service | select(has("retries")) | .retries)
  ) |= [.] |
  . as $doc ireduce ({}; . *+ $doc)
' defaults.yml region.yml
```

This produces the same collected values and also appends `service.modes`. Use it only when append semantics are correct for all arrays. The earlier collect-after-merge expression is safer when unrelated arrays should retain normal replacement behavior.

## Produce a Conflict Report with Source Names

Sometimes the merged configuration should not change its schema. In that case, leave normal precedence intact and emit a separate report for human or CI review:

```bash
yq ea '[
  . |
  select(.service | has("endpoint")) |
  {
    "source": filename,
    "value": .service.endpoint
  }
]' defaults.yml region.yml
```

Output:

```yaml
- source: defaults.yml
  value: https://primary.example.com
- source: region.yml
  value: https://backup.example.com
```

The `filename` operator records provenance before the documents are reduced. You can write this report as a CI artifact while still generating a conventional last-file-wins configuration.

## Preserve Occurrences or Preserve Unique Values

The collection expression keeps every occurrence, including repeated equal values. That is often the right audit behavior because it proves which layers supplied a setting.

If the output schema represents a set rather than an ordered history, deduplicate explicitly:

```bash
.service.endpoint |= unique
```

In v4.53.6, `unique` retains the first occurrence and preserves input order. It compares node values, so different spellings of null such as `null` and `~` remain separate entries. Normalize those spellings first if deduplication or a CI conflict check should treat them as the same value. Do not add it merely to make output shorter. Duplicate occurrences can carry useful evidence about redundant configuration layers.

## Keep Precedence Explicit

The collected arrays follow input order. Put the lowest-precedence source first and the highest-precedence source last:

```bash
inputs=(defaults.yml region-eu.yml production.yml)
```

Pass `"${inputs[@]}"` to the complete collection command shown earlier. Even though every selected value survives, order may still communicate preference or fallback order to consumers. Document whether the first or last element is authoritative.

## Validate the New Schema

Turning a scalar into a sequence is a schema change. A program expecting `service.retries` to be an integer will not accept a list of integers.

Validate the result against its intended consumer, or write conflicts under a separate namespace:

```yaml
service:
  endpoint: https://backup.example.com
mergeAudit:
  serviceEndpoints:
    - https://primary.example.com
    - https://backup.example.com
```

Keeping operational configuration and merge evidence separate is often safer than deploying a lossless representation directly.

Also validate root document types before reducing them:

```bash
yq ea -e '
  [.] |
  ((length > 0) and all_c(tag == "!!map"))
' defaults.yml region.yml >/dev/null
```

## Do Not Confuse Appending with Conflict Detection

`*+` does not tell you whether values disagree. It appends arrays whether their elements are equal or different, and scalar conflicts still follow right-hand precedence. Likewise, collecting a path proves that several sources supplied values, not that those values differ.

If CI should fail only when distinct values exist, collect the path and compare `unique | length` with one. Keep that check separate from the merge so the failure policy is visible.

## Conclusion

There is no merge flag that automatically turns every scalar conflict into a safe multi-value field. Identify the paths whose complete history matters, collect those values in input order, and keep normal merge behavior elsewhere. Use `*+` only when arrays across the entire merge should append, retain explicit nulls with `has`, and validate any schema change before consumers receive it.

## Official Documentation

- [Mike Farah yq: Multiply Merge Operator](https://mikefarah.gitbook.io/yq/operators/multiply-merge)
- [Mike Farah yq: Collect into Array](https://mikefarah.gitbook.io/yq/operators/collect-into-array)
- [Mike Farah yq: Has Operator](https://mikefarah.gitbook.io/yq/operators/has)
- [Mike Farah yq: File Operators](https://mikefarah.gitbook.io/yq/operators/file-operators)
- [Mike Farah yq: Unique Operator](https://mikefarah.gitbook.io/yq/operators/unique)
- [Mike Farah yq v4.53.6 Release](https://github.com/mikefarah/yq/releases/tag/v4.53.6)
