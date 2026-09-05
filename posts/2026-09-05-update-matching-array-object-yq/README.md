# How to Update Only the Array Object Matching a Name, Label, or Other Field with yq

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Configuration Management, Command Line, Automation

Description: Select and update only matching objects in a YAML array with Mike Farah yq v4 while detecting missing or duplicate identities before mutation.

---

To update a field inside selected YAML array objects, put the entire selection on the left side of the assignment:

```bash
NAME=api IMAGE='registry.example.com/api:v2' yq '
  (.services[] | select(.name == strenv(NAME))).image = strenv(IMAGE)
' config.yml
```

The parentheses are essential. They tell Mike Farah yq v4 to retain the original document and update the paths produced by the selection. Without them, it is easy to filter the document first and print only the matching fragment.

## Update One Object by Name

Given `config.yml`:

```yaml
services:
  - name: api
    image: registry.example.com/api:v1
    replicas: 2
    labels:
      tier: frontend
  - name: worker
    image: registry.example.com/worker:v1
    replicas: 1
    labels:
      tier: background
```

Run a non-mutating preview:

```bash
NAME=api IMAGE='registry.example.com/api:v2' yq '
  (.services[] | select(.name == strenv(NAME))).image = strenv(IMAGE)
' config.yml
```

Output:

```yaml
services:
  - name: api
    image: registry.example.com/api:v2
    replicas: 2
    labels:
      tier: frontend
  - name: worker
    image: registry.example.com/worker:v1
    replicas: 1
    labels:
      tier: background
```

Only the selected object's `image` path changes. After reviewing the result, add `-i`:

```bash
NAME=api IMAGE='registry.example.com/api:v2' yq -i '
  (.services[] | select(.name == strenv(NAME))).image = strenv(IMAGE)
' config.yml
```

`strenv` transports both values as strings and avoids shell interpolation inside the yq expression.

## Why Parentheses Matter

This expression first filters the stream and then updates that filtered value:

```bash
yq '.services[] | select(.name == "api") | .image = "api:v2"' config.yml
```

Its output is the selected service object, not necessarily the full root document you intended to write back. The official troubleshooting guide specifically calls out this trap.

Make the selected path the assignment target:

```bash
yq '(.services[] | select(.name == "api")).image = "api:v2"' config.yml
```

For a deeper target, include the leaf inside the parentheses or immediately after them:

```bash
yq '(.services[] | select(.name == "api") | .labels.version) = "v2"' \
  config.yml
```

Both styles make the left-hand path explicit.

## Update Several Fields on the Match

Repeat the same selection for a small number of fields:

```bash
NAME=api IMAGE='registry.example.com/api:v2' REPLICAS=4 yq '
  (.services[] | select(.name == strenv(NAME))).image = strenv(IMAGE) |
  (.services[] | select(.name == strenv(NAME))).replicas = env(REPLICAS)
' config.yml
```

Or use `with` to set the selected object as the temporary context:

```bash
NAME=api IMAGE='registry.example.com/api:v2' REPLICAS=4 yq '
  with(.services[] | select(.name == strenv(NAME));
    .image = strenv(IMAGE) |
    .replicas = env(REPLICAS)
  )
' config.yml
```

`env(REPLICAS)` parses `4` as an integer. Validate the input if the schema requires an integer; arbitrary text is also valid YAML and could otherwise become a string.

## Match a Label or Multiple Fields

Select by a nested label:

```bash
TIER=background REPLICAS=3 yq '
  (.services[] |
    select(.labels.tier == strenv(TIER))
  ).replicas = env(REPLICAS)
' config.yml
```

That intentionally updates **every** service whose tier matches. Combine predicates when the identity is composite:

```bash
NAME=api TIER=frontend IMAGE='registry.example.com/api:v3' yq '
  (.services[] |
    select(
      .name == strenv(NAME) and
      .labels.tier == strenv(TIER)
    )
  ).image = strenv(IMAGE)
' config.yml
```

Use `or` only when either condition should qualify an object. A broad predicate is a bulk update, not a lookup.

## Detect Zero or Multiple Matches

A normal assignment that selects nothing can still emit the unchanged root document and exit successfully. Adding `-e` to that update alone does not prove an item matched, because the final document is non-null and truthy.

Count first:

```bash
name=api

count=$(NAME=$name yq '
  [.services[] | select(.name == strenv(NAME))] | length
' config.yml)

if [[ $count -ne 1 ]]; then
  printf 'expected one service named %s; found %s\n' "$name" "$count" >&2
  exit 1
fi
```

Then update while no concurrent writer can change the file. For a single yq operation, make the exact-one condition gate the root output:

```bash
NAME=api IMAGE='registry.example.com/api:v2' yq -e -i '
  ([.services[] | select(.name == strenv(NAME))] | length == 1) as $one |
  select($one) |
  (.services[] | select(.name == strenv(NAME))).image = strenv(IMAGE)
' config.yml
```

If there are zero or two matches, `select($one)` emits nothing. `-e` returns failure and v4.53.3 does not replace the input file. Its current error path can leave the unused in-place temporary file behind, so job-level temporary-directory cleanup may still be needed.

This guards the matching invariant inside the same evaluation. It still does not coordinate two separate processes that replace the file concurrently; use a shared lock or repository workflow for that.

## Validate the Array Shape

Before an important mutation, ensure `services` is an array of maps and the update value has the expected type:

```bash
REPLICAS=4 yq -e '
  (.services | tag == "!!seq") and
  (.services | all_c(
    (tag == "!!map") and
    ((.name | tag) == "!!str")
  )) and
  ((env(REPLICAS) | tag) == "!!int") and
  (env(REPLICAS) >= 1)
' config.yml >/dev/null
```

Without a shape check, a missing or misspelled path can be mistaken for an empty match. Requiring a string `name` is also important because v4.53.3 scalar equality compares textual values without requiring equal YAML tags. If an object lacks `labels`, traversal generally yields null and the predicate simply does not select it; decide whether that should be ignored or treated as malformed input.

## Understand String Wildcards

Mike Farah yq's string equality supports wildcard matching. A selector such as:

```bash
select(.name == "api*")
```

matches `api`, `api-canary`, and other names with that prefix. This can be useful, but a caller-provided `NAME` containing `*` or `?` may unexpectedly become a bulk update.

When names follow Kubernetes or DNS-style identifier rules, validate that input before yq. If literal wildcard characters are permitted, use an exact string comparison based on mutual containment:

```bash
NAME=$name IMAGE=$image yq '
  (.services[] |
    select(
      .name as $candidate |
      (($candidate | contains(strenv(NAME))) and
       (strenv(NAME) | contains($candidate)))
    )
  ).image = strenv(IMAGE)
' config.yml
```

A string contains another in both directions only when their complete contents are equal. The extra parentheses are important for yq expression precedence.

## Update Based on the Old Value

Use relative assignment `|=` when the new field depends on its current value:

```bash
NAME=worker yq '
  (.services[] | select(.name == strenv(NAME)).replicas) |= . + 1
' config.yml
```

The right side runs with the selected `replicas` node as context. Plain `=` runs its right side against the broader input context. That distinction matters for calculations and sibling references.

For multiple relative changes within the matched object:

```bash
NAME=worker yq '
  with(.services[] | select(.name == strenv(NAME));
    .replicas |= . + 1 |
    .labels.generation = "next"
  )
' config.yml
```

## Preserve Comments and Formatting Expectations

Mike Farah yq attempts to preserve comments and style, but its official documentation notes that not every scenario can be retained by the underlying YAML library. Always review the diff, especially around array items, anchors, aliases, folded strings, and comments attached to keys.

Do not use array reconstruction with `map` when a direct selected-path assignment is sufficient; a direct update more clearly expresses which existing node should retain its metadata.

## Conclusion

Put the complete `select` pipeline inside the left side of the assignment, pass match values with `strenv`, and preview before adding `-i`. Decide whether multiple matches are intentional. When identity should be unique, gate the update on a count of exactly one in the same `-e -i` evaluation. Validate the array shape and reject or exactly handle wildcard-bearing input so a targeted update cannot silently become a bulk edit.

## Official Documentation

- [Mike Farah yq: Select Operator](https://mikefarah.gitbook.io/yq/operators/select)
- [Mike Farah yq: Assign Update Operator](https://mikefarah.gitbook.io/yq/operators/assign-update)
- [Mike Farah yq: With Operator](https://mikefarah.gitbook.io/yq/operators/with)
- [Mike Farah yq: Tips for Updating Deeply Selected Paths](https://mikefarah.gitbook.io/yq/usage/tips-and-tricks)
- [Mike Farah yq: Environment Variable Operators](https://mikefarah.gitbook.io/yq/operators/env-variable-operators)
- [Mike Farah yq v4.53.3: Equality Implementation](https://github.com/mikefarah/yq/blob/v4.53.3/pkg/yqlib/operator_equals.go)
