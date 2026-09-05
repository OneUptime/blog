# How to Upsert a YAML Array Item with yq When the Object May Not Exist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Configuration Management, Command Line, Automation

Description: Update an existing object or append a new one in a YAML array with one idempotent Mike Farah yq v4 expression and explicit identity rules.

---

An upsert has two branches: update the array object whose identity matches, or append a new object when no match exists. A correct yq recipe must also decide what to do with a missing array, duplicate identities, unspecified fields, wildcard characters, and wrong input types.

This Mike Farah yq v4 expression updates by `name` while preserving an existing object's other fields:

```bash
NAME=worker IMAGE='worker:v2' REPLICAS=3 yq '
  (.services // []) as $old |
  {
    "name": strenv(NAME),
    "image": strenv(IMAGE),
    "replicas": env(REPLICAS)
  } as $new |
  .services = (
    ($old | map(
      with(select(.name == $new.name); . *= $new)
    )) +
    [$new | select(($old | any_c(.name == $new.name)) | not)]
  )
' config.yml
```

It uses `map` to merge into matches and `select(... | not)` to emit the append candidate only when the old array contains no matching name.

## See Both Branches

Start with:

```yaml
services:
  - name: api
    image: api:v1
    replicas: 2
    owner: platform
  - name: worker
    image: worker:v1
    replicas: 1
    queue: jobs
```

With `NAME=worker`, the result is:

```yaml
services:
  - name: api
    image: api:v1
    replicas: 2
    owner: platform
  - name: worker
    image: worker:v2
    replicas: 3
    queue: jobs
```

The merge updates `image` and `replicas` while retaining `queue`.

With `NAME=cron`, `IMAGE=cron:v1`, and `REPLICAS=1`, the result is:

```yaml
services:
  - name: api
    image: api:v1
    replicas: 2
    owner: platform
  - name: worker
    image: worker:v1
    replicas: 1
    queue: jobs
  - name: cron
    image: cron:v1
    replicas: 1
```

Running the same cron command again updates that item and does not append another one, making the operation idempotent when names are unique.

## Understand Each Stage

First, normalize an absent or null array:

```text
(.services // []) as $old
```

The alternative operator also treats false as absent. A `services: false` value is probably malformed rather than an empty array, so validate the input shape before relying on normalization.

Second, construct one typed candidate:

```text
{"name": strenv(NAME), "image": strenv(IMAGE), "replicas": env(REPLICAS)}
```

Third, transform every old element:

```text
$old | map(with(select(.name == $new.name); . *= $new))
```

`with` preserves nonmatching items and changes the context to a matching item for the merge. The multiply assignment performs a deep map merge; values from `$new` override conflicts.

Finally, create either a one-element append array or an empty array:

```text
[$new | select(($old | any_c(.name == $new.name)) | not)]
```

`any_c` returns true when any old item satisfies the condition. Negating it allows `$new` through only for the missing case. Array addition concatenates the transformed old array and that zero-or-one candidate array.

## Validate Before Editing In Place

Check required variables in Bash:

```bash
: "${NAME:?NAME is required}"
: "${IMAGE:?IMAGE is required}"
: "${REPLICAS:?REPLICAS is required}"
```

Check the existing shape and new type in yq, exiting the script if validation fails:

```bash
REPLICAS=$REPLICAS yq -e '
  ((.services == null) or (.services | tag == "!!seq")) and
  ((.services // []) | all_c(
    (tag == "!!map") and
    ((.name | tag) == "!!str")
  )) and
  ((env(REPLICAS) | tag) == "!!int") and
  (env(REPLICAS) >= 1)
' config.yml >/dev/null || exit 1
```

The name-tag check is not redundant: in v4.53.3, scalar `==` compares textual values and does not require matching YAML tags. Without it, an external string name such as `3` can also match an integer-valued `name: 3`.

Preview the upsert without `-i`, inspect the diff, and then run the same expression with `yq -i`.

## Decide Whether to Merge or Replace

The example uses:

```text
. *= $new
```

This preserves fields not mentioned in the candidate and deeply merges nested maps. That is usually desirable for patch-like configuration.

To replace a matched object completely, use:

```text
with(select(.name == $new.name); . = $new)
```

Replacement deletes unspecified fields such as `queue` or `owner`. Make that destructive behavior explicit in review.

For shallow merging, addition merges maps only at the top level, while the multiply operator is the documented deep merge. Arrays have additional merge options; do not assume a nested list will merge by item identity unless the expression says so.

## Define a Duplicate Policy

If the source already contains two objects named `worker`, the basic expression updates both and does not append. That may conceal invalid configuration.

Reject duplicates before the upsert:

```bash
NAME=$NAME yq -e '
  [.services[] | select(.name == strenv(NAME))] |
  length <= 1
' config.yml >/dev/null || exit 1
```

For global name uniqueness, compare lengths before and after `unique_by`:

```bash
yq -e '
  (.services // []) as $items |
  ($items | length) == ($items | unique_by(.name) | length)
' config.yml >/dev/null || exit 1
```

`unique_by(.name)` preserves the first representative for each unique value in current yq. Use it as a detector here rather than silently deleting duplicates whose conflicting fields might require human resolution.

## Avoid Accidental Wildcard Matches

Mike Farah yq string equality supports `*` and `?` wildcards. If `NAME` is external input, a value such as `api*` can match several existing names in both `select` and `any_c`.

The easiest policy for DNS-like service identities is to reject wildcard characters before the expression. If literal wildcard names are valid, use exact mutual-containment checks. A complete exact-match variant is:

```bash
NAME=$NAME IMAGE=$IMAGE REPLICAS=$REPLICAS yq '
  (.services // []) as $old |
  {
    "name": strenv(NAME),
    "image": strenv(IMAGE),
    "replicas": env(REPLICAS)
  } as $new |
  $new.name as $wanted |
  .services = (
    ($old | map(
      .name as $candidate |
      with(
        select(
          (($candidate | contains($wanted)) and
           ($wanted | contains($candidate)))
        );
        . *= $new
      )
    )) +
    [$new | select(
      ($old | any_c(
        .name as $candidate |
        (($candidate | contains($wanted)) and
         ($wanted | contains($candidate)))
      )) | not
    )]
  )
' config.yml
```

The explicit parentheses around each boolean condition avoid precedence surprises. For most schemas, input validation is shorter and easier to audit.

## A Simpler Bash Branch

For maintainers unfamiliar with the single-expression form, an explicit shell branch is readable:

```bash
present=$(NAME=$NAME yq -r \
  '(.services // []) | any_c(.name == strenv(NAME))' \
  config.yml) || {
  printf '%s\n' 'could not inspect services' >&2
  exit 1
}

if [[ $present == true ]]; then
  NAME=$NAME IMAGE=$IMAGE REPLICAS=$REPLICAS yq -i '
    with(.services[] | select(.name == strenv(NAME));
      .image = strenv(IMAGE) |
      .replicas = env(REPLICAS)
    )
  ' config.yml
elif [[ $present == false ]]; then
  NAME=$NAME IMAGE=$IMAGE REPLICAS=$REPLICAS yq -i '
    .services = (.services // []) |
    .services += [{
      "name": strenv(NAME),
      "image": strenv(IMAGE),
      "replicas": env(REPLICAS)
    }]
  ' config.yml
else
  printf 'unexpected membership result: %s\n' "$present" >&2
  exit 1
fi
```

This reads the file and then writes it in a second process. Another writer can change the file between those operations. The one-expression form avoids that extra check-then-update window, but its read-modify-write cycle is not protected against concurrent writers either; use a lock shared by all writers when concurrent updates are possible.

## Preserve Ordering and Comments Deliberately

The expression preserves the old item order and appends new items at the end. `map` reconstructs the array, and merges may affect node style or comment placement. Mike Farah yq attempts to preserve YAML presentation but documents limitations.

If comments, anchors, aliases, or exact formatting are contractual, test the output on representative fixtures. Prefer a direct selected-path assignment for update-only operations; use reconstruction only because upsert needs to create a missing item.

## Make the Operation Safe in Automation

An upsert can be syntactically successful yet semantically wrong. A robust job should:

1. identify Mike Farah yq v4 and pin its version;
2. validate required environment values and YAML types;
3. reject duplicate identities and unexpected array elements;
4. preview or render to a temporary file;
5. validate the resulting application configuration;
6. replace the target only after all checks succeed.

Do not redirect yq output to its input filename. Use `-i` or a validated temporary-file workflow.

## Conclusion

Model an upsert as a transformed old array plus a zero-or-one append candidate. Use `map` and `with` to merge existing matches, `any_c` and `select(... | not)` to handle absence, and `strenv` or `env` to preserve intended types. Then define the parts generic recipes omit: wrong input types, duplicates, merge versus replacement, wildcard names, order, concurrency, and post-update validation.

## Official Documentation

- [Mike Farah yq: With Operator](https://mikefarah.gitbook.io/yq/operators/with)
- [Mike Farah yq: Boolean Operators and any_c](https://mikefarah.gitbook.io/yq/operators/boolean-operators)
- [Mike Farah yq: Multiply Merge Operator](https://mikefarah.gitbook.io/yq/operators/multiply-merge)
- [Mike Farah yq: Add Operator](https://mikefarah.gitbook.io/yq/operators/add)
- [Mike Farah yq: Unique Operator](https://mikefarah.gitbook.io/yq/operators/unique)
