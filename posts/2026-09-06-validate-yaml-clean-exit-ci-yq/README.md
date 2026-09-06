# How to Validate YAML with yq and Return a Clean Exit Code in CI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, CI/CD, Command Line, Automation

Description: Validate YAML syntax and selected structural rules with Mike Farah yq v4 while preserving reliable nonzero failures through CI scripts and pipelines.

---

Mike Farah yq can provide two useful CI gates:

1. Parsing a document proves that yq can decode its YAML syntax.
2. Evaluating a boolean policy with `-e` turns a failed content check into a nonzero process status.

These are different checks. A file can be valid YAML while violating every rule expected by the application.

## Check YAML Syntax

Parse the full document and discard normal output:

```bash
yq eval '.' config.yml >/dev/null
```

Malformed YAML makes yq print a parser error to standard error and return nonzero. In Bash:

```bash
if ! yq eval '.' config.yml >/dev/null; then
  printf '%s\n' 'config.yml is not parseable YAML' >&2
  exit 1
fi
```

Do not redirect standard error unless another system captures it. The parser's line and column information is the most useful diagnostic in a failed CI job.

## Validate Several Files Independently

Use a loop so the filename is available in the failure message:

```bash
for file in config/*.yaml; do
  if ! yq eval '.' "$file" >/dev/null; then
    printf 'invalid YAML: %s\n' "$file" >&2
    exit 1
  fi
done
```

Quote each filename. Also configure the shell so an unmatched glob cannot be mistaken for a real input, or build the input list with a repository-specific file discovery step.

A minimal GitHub Actions step can rely on the command's status directly:

```yaml
- name: Validate YAML syntax
  shell: bash
  run: |
    set -euo pipefail
    for file in config/*.yaml; do
      yq eval '.' "$file" >/dev/null
    done
```

## Use `-e` for a Boolean Policy

The `--exit-status` flag, shortened to `-e`, returns failure when there are no matches or the result is null or false.

Require a non-empty string service name and a positive integer port:

```bash
yq -e '
  (tag == "!!map") and
  ((.service | tag) == "!!map") and
  ((.service.name | tag) == "!!str") and
  ((.service.name | length) > 0) and
  ((.service.port | tag) == "!!int") and
  (.service.port >= 1) and
  (.service.port <= 65535)
' config.yml >/dev/null
```

The expression emits one boolean. A true result exits successfully; false produces a nonzero status under `-e`.

Checking tags avoids coercion assumptions. The textual value `"8080"` is a string, while `8080` is an integer.

## Distinguish Presence from Truthiness

This lookup fails under `-e` when the value is missing, null, or false:

```bash
yq -e '.service.enabled' config.yml >/dev/null
```

That is wrong if `enabled: false` is a valid configuration state. Test membership on the parent map instead:

```bash
yq -e '.service | has("enabled")' config.yml >/dev/null
```

Then validate the type separately:

```bash
yq -e '
  (.service | has("enabled")) and
  ((.service.enabled | tag) == "!!bool")
' config.yml >/dev/null
```

Choose whether null and false are valid values as part of the schema. Do not use truthiness as a substitute for presence.

## Validate Every Document in a YAML Stream

Normal evaluation produces one result per input document. With `-e`, one truthy result can make a stream look successful even when other results are false, because the command has printed a qualifying match.

Use `eval-all` to collect all documents and reduce them to one boolean:

```bash
yq eval-all -e '
  [.] |
  ((length > 0) and
   all_c(
     (tag == "!!map") and
     ((.apiVersion | tag) == "!!str") and
     ((.kind | tag) == "!!str") and
     ((.metadata | tag) == "!!map") and
     ((.metadata.name | tag) == "!!str")
   ))
' bundle.yaml >/dev/null
```

`[.]` creates one array from the document stream. `length > 0` rejects an empty array, and `all_c` applies the structural predicate to every document. In v4.53.6, an empty input file produces a synthetic null node, so the map predicate rejects it. The command emits exactly one true or false value for `-e` to interpret.

This proves only the listed shape. It does not validate Kubernetes OpenAPI schemas, API compatibility, or admission policy.

## Decide Whether an Empty File Is Valid

In yq v4.53.6, parsing an empty file with this command succeeds because there is no malformed document:

```bash
yq eval '.' empty.yml >/dev/null
```

Adding `-e` makes this fail because yq evaluates `.` against a synthetic null node when no documents are read:

```bash
yq -e '.' empty.yml >/dev/null
```

For the multi-document policy above, `[.]` contains that synthetic null node for an empty file, so its length is 1. The `tag == "!!map"` check inside `all_c` rejects it; `length > 0` alone would not.

## Preserve Failure Through Pipelines

Without `pipefail`, Bash normally reports the status of the final command in a pipeline. This can hide a yq failure:

```bash
yq -e '.service.port' config.yml | sed 's/^/port=/'
```

Enable pipeline failure propagation:

```bash
set -o pipefail

if ! yq -e '.service.port' config.yml |
  sed 's/^/port=/'; then
  printf '%s\n' 'required port validation failed' >&2
  exit 1
fi
```

An even clearer CI pattern validates first and formats output only after success. Do not append `|| true` to a validation command, because that deliberately converts its failure to success.

## Capture Values Without Losing Status

Place command substitution directly in an `if` condition:

```bash
if port=$(yq -e -r '.service.port' config.yml); then
  printf 'validated port: %s\n' "$port"
else
  printf '%s\n' 'service.port is missing, null, or false' >&2
  exit 1
fi
```

For an integer port, follow the lookup with the tag and range policy shown earlier. `-r` controls scalar output formatting; it does not perform type validation.

## Know What a Parse Check Does Not Prove

A successful `yq eval '.'` does not prove that:

- Required application fields exist.
- Values have the types or ranges the consumer expects.
- A Kubernetes object conforms to its API schema.
- Custom tags are understood by the consumer.
- Mapping keys are unique.

In v4.53.6, yq accepts and emits a mapping with duplicate keys such as:

```yaml
service: api
service: worker
```

If duplicate keys are forbidden by your policy, add a validator that detects them before semantic processing. Once another parser chooses one duplicate value, the ambiguity may be impossible to recover safely.

Use yq for focused structural invariants and pair it with the authoritative schema validator for the target application.

## Keep Diagnostics Actionable

A boolean-only yq expression gives a clean status but not always a clear reason. Split complex policies into named CI checks when maintainers need precise failures:

```bash
yq -e '(.service | tag) == "!!map"' config.yml >/dev/null || {
  printf '%s\n' 'service must be a map' >&2
  exit 1
}

yq -e '(.service.port | tag) == "!!int"' config.yml >/dev/null || {
  printf '%s\n' 'service.port must be an integer' >&2
  exit 1
}
```

The extra commands trade a small amount of runtime for failure messages that identify the broken contract.

## Conclusion

Use `yq eval '.'` as a YAML parse gate and `yq -e` with one explicit boolean as a content gate. Collect multi-document streams before applying `all_c`, test key membership separately from truthiness, preserve nonzero statuses through Bash pipelines, and use an application-specific schema validator for guarantees beyond yq expressions.

## Official Documentation

- [Mike Farah yq: Evaluate Command and Exit Status](https://mikefarah.gitbook.io/yq/commands/evaluate)
- [Mike Farah yq: Evaluate All Command](https://mikefarah.gitbook.io/yq/commands/evaluate-all)
- [Mike Farah yq: Boolean Operators](https://mikefarah.gitbook.io/yq/operators/boolean-operators)
- [Mike Farah yq: Has Operator](https://mikefarah.gitbook.io/yq/operators/has)
- [Mike Farah yq: Tag Operator](https://mikefarah.gitbook.io/yq/operators/tag)
- [YAML 1.2.2 Specification](https://yaml.org/spec/1.2.2/)
- [Mike Farah yq v4.53.6 Release](https://github.com/mikefarah/yq/releases/tag/v4.53.6)
