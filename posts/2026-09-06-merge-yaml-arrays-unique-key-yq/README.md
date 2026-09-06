# How to Merge YAML Arrays by a Unique Key Instead of Replacing Them with yq

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Configuration Management, Data Transformation, Automation

Description: Merge arrays of YAML objects by a stable identity field with Mike Farah yq v4, retaining unmatched items and deep-merging matched objects.

---

The normal yq deep merge knows how to match map keys, but it does not know that two array objects with `name: api` represent the same logical item. Default array merging replaces the earlier array, while the `d` flag merges by numeric position. Neither behavior is a keyed join.

To merge objects by identity, temporarily turn the array into a map keyed by the unique field, deep-merge that map, and turn its values back into an array.

## The Keyed Merge

Given `base.yml`:

```yaml
region: us
services:
  - name: api
    image: registry.example.com/api:v1
    replicas: 2
    env:
      LOG_LEVEL: info
  - name: worker
    image: registry.example.com/worker:v1
```

And `overlay.yml`:

```yaml
region: eu
services:
  - name: api
    image: registry.example.com/api:v2
    env:
      FEATURE_FLAG: enabled
  - name: cron
    image: registry.example.com/cron:v1
```

Run with one YAML document per input file; `fi` selects files, not individual documents:

```bash
yq eval-all '
  select(fi == 0) as $base |
  select(fi == 1) as $overlay |
  (
    (($base.services + $overlay.services)[] | {(.name): .})
      as $item ireduce ({}; . * $item)
  ) as $by_name |
  ($base * $overlay) |
  .services = ($by_name | to_entries | map(.value))
' base.yml overlay.yml
```

The result is:

```yaml
region: eu
services:
  - name: api
    image: registry.example.com/api:v2
    replicas: 2
    env:
      LOG_LEVEL: info
      FEATURE_FLAG: enabled
  - name: worker
    image: registry.example.com/worker:v1
  - name: cron
    image: registry.example.com/cron:v1
```

The `api` objects were merged because their `name` values match. `worker` exists only in the base and remains. `cron` exists only in the overlay and is added. Other top-level fields still use a normal deep merge, so the later `region` wins.

## Follow the Transformation

The expression performs five operations:

1. `select(fi == 0)` and `select(fi == 1)` bind the two input documents.
2. `$base.services + $overlay.services` concatenates the arrays without claiming that array position is identity.
3. `{(.name): .}` converts each object into a one-entry map keyed by its `name`.
4. `ireduce ({}; . * $item)` deep-merges those maps. Repeated names meet at the same map key, with the later object on the right.
5. `to_entries | map(.value)` removes the temporary identity keys and restores an array.

The final `($base * $overlay)` merges the rest of both documents before the reconstructed `services` array is assigned.

## Why `*d` Is Not a Keyed Merge

This shorter command is tempting:

```bash
yq ea 'select(fi == 0) *d select(fi == 1)' base.yml overlay.yml
```

The `d` flag treats array indexes like map keys. Element zero merges with element zero, element one with element one, and so on. If one file reorders the services or inserts an item at the beginning, unrelated objects can be combined.

Use `*d` only when array position is the actual schema identity. For Kubernetes containers, application records, and most named configuration entries, a stable field is safer.

## Validate Identity Before Merging

The reducer deliberately combines repeated keys, so malformed duplicates inside one input would otherwise be silently coalesced. Require a non-empty string name and uniqueness within each file:

```bash
for file in base.yml overlay.yml; do
  yq -e '
    (.services | tag == "!!seq") and
    (.services | all_c(
      (tag == "!!map") and
      ((.name | tag) == "!!str") and
      ((.name | length) > 0)
    )) and
    ((.services | map(.name) | length) ==
     (.services | map(.name) | unique | length))
  ' "$file" >/dev/null || {
    printf "invalid or duplicate service identity in %s\n" "$file" >&2
    exit 1
  }
done
```

The same name appearing once in each file is expected. Two occurrences of the same name within `base.yml` or within `overlay.yml` are rejected.

Validation also prevents null, boolean, or numeric identities from becoming surprising map keys. If names are case-insensitive in the application, normalize or reject case collisions before the merge rather than changing identity rules implicitly.

## Change the Identity Field Explicitly

For objects keyed by `id`, use `.id` as the identity and `.rules` as the array path, and update the validation expression to use those fields too:

```bash
yq ea '
  select(fi == 0) as $base |
  select(fi == 1) as $overlay |
  (
    (($base.rules + $overlay.rules)[] | {(.id): .})
      as $item ireduce ({}; . * $item)
  ) as $by_id |
  ($base * $overlay) |
  .rules = ($by_id | to_entries | map(.value))
' base.yml overlay.yml
```

For a composite identity, construct one collision-free key. A delimiter is safe only if the component values cannot contain it:

```bash
{((.namespace // "default") + "/" + .name): .}
```

Validate both components and document the default namespace rule. Avoid concatenating arbitrary fields without a delimiter or length encoding, because different pairs can produce the same string.

## Decide How Fields Inside a Match Merge

The reducer uses `. * $item`, so matched objects follow normal deep-merge behavior:

- Later scalar fields override earlier scalar fields.
- Nested maps merge recursively.
- Nested arrays are replaced by later arrays.
- Fields present only in the earlier object remain.

If every nested array in a matched object should append, change the reducer to `ireduce ({}; . *+ $item)`. That is a broad policy and can duplicate values. If only one nested array should append, merge that field separately after the object merge.

Null is also a real value. If an overlay explicitly sets a scalar field to null, the keyed merge retains that null rather than treating it as an absent field. Define whether null means clear, inherit, or invalid before using overlays as deployment input.

## Preserve a Predictable Order

The example emits identities in first-seen map order: base identities appear first, an overlay update stays at its existing identity, and new overlay identities follow. If consumers assign meaning to order, do not leave that behavior implicit.

You can sort the reconstructed array explicitly:

```bash
.services = ($by_name | to_entries | map(.value) | sort_by(.name))
```

Sorting makes output stable but changes any deliberate source ordering. An alternative is to store an explicit `order` field and sort by that field after validation.

## Scale Beyond Two Files Carefully

For several overlays, apply the same model: concatenate all item streams in lowest-to-highest precedence order, reduce them into the identity map, then restore the array. Keep the filename list explicit. Also decide whether top-level fields use the same precedence order.

If the input can be large, remember that `eval-all` loads every document into memory. For ordinary configuration files this is convenient; for large datasets, a purpose-built streaming join may be more appropriate.

## Preview Before Writing

The complete merge command above prints to standard output. Review that output first, then rerun the same expression and redirect it to a derived `merged.yml` file.

Do not use `-i` on one of the source files while it is also an input to a multi-file merge. Keeping source layers immutable makes precedence and review much easier to reason about.

## Conclusion

A unique-key array merge is a data transformation, not a merge flag. Concatenate the arrays, index each object by its validated identity, deep-merge matching map entries, and convert the values back to an array. Validate uniqueness within every source, choose nested-array semantics deliberately, and make ordering part of the contract when consumers care about it.

## Official Documentation

- [Mike Farah yq: Merge Arrays of Objects by Key](https://mikefarah.gitbook.io/yq/operators/multiply-merge#merge-arrays-of-objects-together-matching-on-a-key)
- [Mike Farah yq: Multiply Merge Operator](https://mikefarah.gitbook.io/yq/operators/multiply-merge)
- [Mike Farah yq: Reduce Operator](https://mikefarah.gitbook.io/yq/operators/reduce)
- [Mike Farah yq: Entries Operator](https://mikefarah.gitbook.io/yq/operators/entries)
- [Mike Farah yq: Unique Operator](https://mikefarah.gitbook.io/yq/operators/unique)
- [Mike Farah yq v4.53.6 Release](https://github.com/mikefarah/yq/releases/tag/v4.53.6)
