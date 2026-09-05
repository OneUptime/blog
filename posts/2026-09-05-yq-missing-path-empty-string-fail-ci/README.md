# How to Return an Empty String—or Fail CI—When a yq Path Is Missing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, CI/CD, Command Line, Automation

Description: Choose an explicit missing-path policy in Mike Farah yq v4 by returning a blank string, testing map membership, or failing CI with exit status.

---

Mike Farah yq v4 normally prints `null` and exits successfully when a traversed path is absent. That default is useful for exploration but ambiguous in scripts. An optional value may need a blank string; a required value should fail the job; and an existing key whose value is false or null may need to remain distinguishable from a missing key.

Choose that policy explicitly rather than post-processing the word `null`.

## Observe the Default

Given `config.yml`:

```yaml
service:
  endpoint: https://api.example.com
  label: ""
  enabled: false
  optional: null
```

Reading an absent key:

```bash
yq '.service.timeout' config.yml
printf 'status=%s\n' "$?"
```

Produces:

```text
null
status=0
```

The successful status is why a simple `set -e` does not catch the missing path.

## Return a Blank for an Optional String

Use the alternative operator `//`:

```bash
yq -r '.service.timeout // ""' config.yml
```

The output is an empty line. In Bash command substitution, the trailing newline is removed, leaving an empty shell value:

```bash
timeout=$(yq -r '.service.timeout // ""' config.yml)
printf 'timeout=<%s>\n' "$timeout"
```

Output:

```text
timeout=<>
```

Current yq unwraps YAML scalars by default, but `-r` makes the intended scalar output explicit.

The `//` operator uses its right side when the left side is null, missing, **or false**. Therefore:

```bash
yq -r '.service.enabled // ""' config.yml
```

also prints a blank line even though `enabled` exists and is false. Use this shortcut only when the field is expected to be an optional string or when false intentionally means use the default.

## Fail for a Missing, Null, or False Result

Use `--exit-status` or `-e`:

```bash
yq -e '.service.endpoint' config.yml >/dev/null
```

The evaluate command documents `-e` as setting failure status when there are no matches or the result is null or false. A missing path now fails:

```bash
if ! yq -e '.service.timeout' config.yml >/dev/null; then
  printf '%s\n' 'service.timeout is required' >&2
  exit 1
fi
```

To capture a required scalar and preserve the exit status, place the assignment directly in an `if` condition:

```bash
if endpoint=$(yq -e -r '.service.endpoint' config.yml); then
  printf 'endpoint=%s\n' "$endpoint"
else
  printf '%s\n' 'service.endpoint is missing, null, or false' >&2
  exit 1
fi
```

Do not append `|| true` to a required lookup. It converts the deliberately useful nonzero status back into success.

## Require a Non-empty String

An empty string is truthy in yq, so `-e '.service.label'` succeeds for `label: ""`. If CI requires a non-empty string, validate both type and length:

```bash
yq -e '
  .service.endpoint as $value |
  ((($value | tag) == "!!str") and
   (($value | length) > 0))
' config.yml >/dev/null
```

Bind the value first, then parenthesize the entire `and` expression. This keeps both checks inside the binding's pipeline and aimed at the same node.

For a whitespace-only value, add a schema policy. yq's string operators include trimming functions in current releases, but applications differ on whether surrounding spaces are meaningful. Do not silently trim credentials or identifiers unless the schema authorizes it.

## Distinguish Missing from Present-but-null

Use `has` on the parent map:

```bash
yq '.service | has("optional")' config.yml
yq '.service | has("timeout")' config.yml
```

Output:

```text
true
false
```

`has` tests map membership, independent of the stored value. It is the right choice when false and null are valid states:

```bash
if yq -e '.service | has("enabled")' config.yml >/dev/null; then
  enabled=$(yq -r '.service.enabled' config.yml)
else
  printf '%s\n' 'enabled key is absent' >&2
  exit 1
fi
```

For a dynamic key, use `strenv`:

```bash
KEY=$key yq -e '.service | has(strenv(KEY))' config.yml >/dev/null
```

This avoids pasting a shell value into the yq program.

## Define Four Common Policies

The same input can support different contracts:

| Desired policy | Expression or pattern |
| --- | --- |
| Missing or null optional string becomes blank | `.path // ""` |
| Missing, null, or false fails | `yq -e '.path'` |
| Key must exist, but null or false is allowed | `yq -e '.parent | has("key")'` |
| Value must be a non-empty string | bind value, then test tag and length with `-e` |

Write the chosen policy beside the command. Otherwise a future maintainer may replace `has` with `-e` and accidentally reject valid false values, or add `// ""` and hide a required field.

## Preserve Failure Through Pipelines

Without `pipefail`, Bash normally reports the status of the last command in a pipeline:

```bash
yq -e '.service.timeout' config.yml | sed 's/^/timeout=/'
```

If `sed` succeeds, the pipeline can appear successful even when yq failed. In a Bash CI script:

```bash
set -o pipefail

if ! yq -e '.service.timeout' config.yml |
  sed 's/^/timeout=/'; then
  printf '%s\n' 'required timeout lookup failed' >&2
  exit 1
fi
```

An even clearer pattern captures or validates the yq result before sending it to another program.

`set -e` has nuanced exceptions around conditionals, lists, functions, and pipelines. Do not rely on it as the only expression of business logic. Test required lookups explicitly with `if` or `!`.

## Avoid String-based `null` Detection

This is fragile:

```bash
value=$(yq -r '.service.timeout' config.yml)
if [[ $value == null ]]; then
  value=
fi
```

A real YAML string whose value is `null` can be confused with a null node after scalar unwrapping. The output representation is not a reliable type test.

Use yq operators while the type information still exists:

```bash
yq '.service.timeout | tag' config.yml
```

A YAML null node has tag `!!null`; a string has tag `!!str`. Usually `//`, `has`, or `-e` expresses the policy without manually inspecting tags.

## Validate the Parent Structure

Missing data and malformed structure should not be conflated. If `service` must be a map:

```bash
yq -e '.service | tag == "!!map"' config.yml >/dev/null
```

Then apply the field rule:

```bash
yq -e '
  (.service | tag == "!!map") and
  (.service | has("endpoint")) and
  (.service.endpoint as $value |
    ((($value | tag) == "!!str") and
     (($value | length) > 0)))
' config.yml >/dev/null
```

This rejects a misspelled parent, an array in place of a map, an absent key, null, and an empty or non-string endpoint.

## Consider Multiple Documents and Multiple Matches

By default, v4 evaluates the expression against each YAML document. A file containing several resources can produce several results. A successful value from one document should not necessarily compensate for a missing value in another.

First select the intended document:

```bash
yq -e '
  select(.kind == "Deployment" and .metadata.name == "api") |
  .spec.template.spec.serviceAccountName
' resources.yml >/dev/null
```

If uniqueness matters, collect the selected results and check their length with an expression designed for the file's document structure. Do not take the first output line and assume resource identity.

## Emit Machine-readable Results When Useful

Blank output is convenient for a shell default but ambiguous in logs. For an API or CI artifact, emit an object that carries presence explicitly:

```bash
yq '
  {
    "present": (.service | has("timeout")),
    "value": .service.timeout
  }
' config.yml
```

Output for the example:

```yaml
present: false
value: null
```

Structured output retains the distinction without relying on an exit status alone.

## Conclusion

Make missing-path behavior part of the script's contract. Use `// ""` for a genuinely optional string, knowing it also replaces false. Use `-e` to fail on missing, null, or false. Use `has` when key presence matters independently of value, and bind the node to validate a non-empty string. Finally, preserve yq's status through Bash pipelines so CI cannot turn a failed lookup into a green build.

## Official Documentation

- [Mike Farah yq: Alternative Default Value Operator](https://mikefarah.gitbook.io/yq/operators/alternative-default-value)
- [Mike Farah yq: Evaluate Command and Exit Status](https://mikefarah.gitbook.io/yq/commands/evaluate)
- [Mike Farah yq: Has Operator](https://mikefarah.gitbook.io/yq/operators/has)
- [Mike Farah yq: Tag Operator](https://mikefarah.gitbook.io/yq/operators/tag)
- [GNU Bash Manual: Pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)
