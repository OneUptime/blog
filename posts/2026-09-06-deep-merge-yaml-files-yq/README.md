# How to Deep-Merge Multiple YAML Files with Explicit Override Precedence in yq

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Configuration Management, Command Line, Automation

Description: Deep-merge YAML maps with Mike Farah yq v4 while making file order, scalar precedence, array behavior, and input assumptions explicit.

---

Mike Farah yq v4 uses the multiply operator, `*`, to merge maps recursively. When the same scalar path appears on both sides, the value on the right wins. That makes this command an ordered overlay pipeline:

```bash
yq eval-all '. as $doc ireduce ({}; . * $doc)' \
  base.yml region-eu.yml production.yml
```

The files are not peers. `base.yml` has the lowest precedence, `region-eu.yml` overrides it, and `production.yml` has the highest precedence. Writing that order explicitly is one of the most important parts of a reliable merge.

## Start with Three Layers

Suppose `base.yml` contains:

```yaml
app:
  image: registry.example.com/api:1.0
  replicas: 1
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
  features:
    - health
    - traces
logging:
  level: info
```

`region-eu.yml` contains:

```yaml
app:
  replicas: 2
  resources:
    requests:
      cpu: 500m
  features:
    - metrics
logging:
  format: json
```

And `production.yml` contains:

```yaml
app:
  image: registry.example.com/api:1.1
  resources:
    limits:
      cpu: 1
logging:
  level: warn
```

Run the merge:

```bash
yq eval-all '. as $doc ireduce ({}; . * $doc)' \
  base.yml region-eu.yml production.yml
```

The result is:

```yaml
app:
  image: registry.example.com/api:1.1
  replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 256Mi
    limits:
      cpu: 1
  features:
    - metrics
logging:
  level: warn
  format: json
```

Nested maps are combined. The later `cpu`, `image`, and `logging.level` values replace earlier values at the same paths. Keys omitted by a later layer remain in the result.

## Understand `eval-all` and `ireduce`

Normal `eval` processes documents one at a time. A merge needs all input documents available together, so use `eval-all`, whose short form is `ea`.

The expression has three parts:

```text
. as $doc ireduce ({}; . * $doc)
```

- `. as $doc` presents every loaded YAML document to the reducer in input order.
- `{}` is the initial accumulator.
- `. * $doc` deep-merges the next document onto the accumulated result.

Because `$doc` is on the right, each later document has precedence over earlier documents. Reversing the filenames reverses the conflict outcome.

For exactly two files, the file index makes the same rule visible:

```bash
yq eval-all '
  select(fi == 0) * select(fi == 1)
' base.yml override.yml
```

`fi` is the short form of `fileIndex`. The left document supplies defaults and the right document supplies overrides.

## Do Not Let a Glob Define Policy Accidentally

The official examples often use `*.yml`, which is concise:

```bash
yq ea '. as $doc ireduce ({}; . * $doc)' *.yml
```

The shell expands that glob before yq starts. The resulting filename order becomes the precedence order. A renamed file can therefore change the configuration even though its contents did not change.

For automation, use a Bash array whose order documents the policy:

```bash
layers=(
  config/base.yml
  config/regions/eu.yml
  config/environments/production.yml
)

yq ea '. as $doc ireduce ({}; . * $doc)' "${layers[@]}"
```

You can inspect what yq received with its file operators:

```bash
yq ea '{
  "filename": filename,
  "fileIndex": fi,
  "documentIndex": di
}' "${layers[@]}"
```

A file may itself contain several YAML documents. Each document participates in `eval-all`; `fi` identifies the file and `di` identifies a document within the stream. If one merged configuration per file is the contract, reject multi-document inputs before merging them.

## Choose Array Semantics Deliberately

The default `*` merge replaces an array on the left with an array at the same path on the right. That is why `features` in the example becomes only `metrics`.

To append arrays everywhere they conflict, use the `+` merge flag:

```bash
yq ea '. as $doc ireduce ({}; . *+ $doc)' \
  base.yml region-eu.yml production.yml
```

That produces `health`, `traces`, and `metrics` in `app.features`. It does not remove duplicates, and the flag applies to nested arrays throughout the merge.

The `d` flag deeply merges arrays by numeric position:

```bash
yq ea '. as $doc ireduce ({}; . *d $doc)' base.yml override.yml
```

Position-based merging is appropriate only when array index is meaningful. It does not match objects by a field such as `name`. For arrays of named objects, build an index by that unique field instead of assuming element zero in one file represents element zero in another.

## Use the Other Merge Flags for Schema Policies

yq supports several flags on the multiply merge operator:

| Form | Behavior |
| --- | --- |
| `*` | Deep-merge maps and replace conflicting arrays |
| `*+` | Deep-merge maps and append conflicting arrays |
| `*d` | Deep-merge arrays by position |
| `*?` | Update only fields already present on the left |
| `*n` | Add only fields absent from the left |
| `*c` | Allow the right side to replace custom YAML tags |

Flags can be combined, such as `*?+`. Treat each flag as a data-model decision. Appending every array or accepting only existing keys is much broader than changing a single path.

## Validate the Input Shape First

Multiplication also operates on numbers and strings, so validate that every merge input is a map when a configuration object is required:

```bash
layers=(base.yml region-eu.yml production.yml)

yq ea -e '
  [.] |
  ((length > 0) and all_c(tag == "!!map"))
' "${layers[@]}" >/dev/null
```

Collecting the stream into `[.]` lets `all_c` test every document and emits one final boolean. The `-e` flag turns a false result, null result, or no match into a nonzero exit status.

Then write the output only after that check succeeds:

```bash
yq ea '. as $doc ireduce ({}; . * $doc)' \
  "${layers[@]}" > merged.yml
```

This validates structure, not application semantics. If `replicas` must be an integer or only approved keys are allowed, add those checks or run the result through the application's schema validator.

## Preview the Precedence at One Path

Before accepting a large merge, show the value contributed by every input:

```bash
yq ea '{
  "source": filename,
  "image": .app.image,
  "replicas": .app.replicas
}' base.yml region-eu.yml production.yml
```

This is especially useful when a null value, an unexpected document, or an environment-specific file appears late in the input list.

## Preserve the Inputs

Generate a separate result rather than editing one of the source layers. A merged file is derived output, while the ordered input files remain the reviewable source of truth. If the destination already exists and consumers may read it concurrently, write to a same-directory temporary file, validate it, and replace the destination only after success.

## Conclusion

Use `eval-all` with `ireduce` and put the highest-precedence file last. Deep map merging is the default, but array behavior is a separate choice: replace with `*`, append with `*+`, or merge by position with `*d`. Name the input files in policy order, verify that every document is a map, and inspect important paths before publishing the merged result.

## Official Documentation

- [Mike Farah yq: Multiply Merge Operator](https://mikefarah.gitbook.io/yq/operators/multiply-merge)
- [Mike Farah yq: Reduce Operator](https://mikefarah.gitbook.io/yq/operators/reduce)
- [Mike Farah yq: File Operators](https://mikefarah.gitbook.io/yq/operators/file-operators)
- [Mike Farah yq: Evaluate All Command](https://mikefarah.gitbook.io/yq/commands/evaluate-all)
- [Mike Farah yq v4.53.6 Release](https://github.com/mikefarah/yq/releases/tag/v4.53.6)
