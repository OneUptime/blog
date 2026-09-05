# How to Build YAML Arrays and Nested Objects from Bash Data with yq

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Bash Scripting, Configuration Management, Automation

Description: Construct typed YAML arrays, nested maps, and variable-length collections from Bash data with Mike Farah yq v4 and safe environment boundaries.

---

Mike Farah yq v4 can build a complete YAML document without an input file. Use `--null-input` or `-n`, construct maps with `{...}` and arrays with `[...]`, and import Bash values through `strenv` or `env`:

```bash
APP='billing api' PORT=8080 DEBUG=false yq -n '
  {
    "application": {
      "name": strenv(APP),
      "ports": [env(PORT)],
      "debug": env(DEBUG)
    }
  }
'
```

Output:

```yaml
application:
  name: billing api
  ports:
    - 8080
  debug: false
```

The yq expression defines structure; environment values supply data. Keeping those roles separate avoids broken quoting and preserves YAML types.

## Construct Nested Maps in One Expression

Use quoted object keys for clarity:

```bash
NAME=api \
IMAGE='registry.example.com/api:v3' \
REPLICAS=4 \
CPU=500m \
MEMORY=512Mi \
yq -n '
  {
    "service": {
      "name": strenv(NAME),
      "image": strenv(IMAGE),
      "replicas": env(REPLICAS),
      "resources": {
        "limits": {
          "cpu": strenv(CPU),
          "memory": strenv(MEMORY)
        }
      }
    }
  }
'
```

`REPLICAS` becomes an integer. Kubernetes resource quantities such as `500m` and `512Mi` are strings, so `strenv` is deliberate.

The equivalent assignment style is useful when structure is conditional or assembled in stages:

```bash
NAME=api REPLICAS=4 yq -n '
  .service.name = strenv(NAME) |
  .service.replicas = env(REPLICAS) |
  .service.labels.managedBy = "release-script"
'
```

yq creates missing parent maps while assigning paths under a null input.

## Build Arrays of Scalars

For a fixed number of inputs:

```bash
PRIMARY=api.internal \
SECONDARY=api-backup.internal \
yq -n '
  .endpoints = [strenv(PRIMARY), strenv(SECONDARY)]
'
```

Output:

```yaml
endpoints:
  - api.internal
  - api-backup.internal
```

For numeric values, use `env`:

```bash
HTTP=8080 HTTPS=8443 yq -n '
  .ports = [env(HTTP), env(HTTPS)]
'
```

If mixed types are intentional, make each choice visible in the expression.

## Build an Array of Objects

Object constructors nest inside array constructors:

```bash
API_PORT=8080 WORKER_PORT=9090 yq -n '
  {
    "services": [
      {"name": "api", "port": env(API_PORT)},
      {"name": "worker", "port": env(WORKER_PORT)}
    ]
  }
'
```

Output:

```yaml
services:
  - name: api
    port: 8080
  - name: worker
    port: 9090
```

This is preferable to embedding environment values in YAML text. yq handles quoting, escaping, and node types.

## Turn a Bash Array into YAML Safely

Bash arrays cannot be exported directly. For a small variable-length array, initialize a temporary YAML document and append each element through one environment value:

```bash
#!/usr/bin/env bash
set -euo pipefail

targets=(
  'api.example.com'
  'worker blue'
  'literal "quoted" value'
)

temporary=$(mktemp './generated.XXXXXX')
cleanup() {
  rm -f -- "$temporary"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

yq -n '{"targets": []}' >"$temporary"

for target in "${targets[@]}"; do
  TARGET=$target yq -i '.targets += [strenv(TARGET)]' "$temporary"
done

yq -e '
  (.targets | tag == "!!seq") and
  (.targets | all_c(tag == "!!str"))
' "$temporary" >/dev/null

mv -- "$temporary" generated.yml
trap - EXIT HUP INT TERM
```

Each Bash element remains one YAML string even when it contains spaces or quotes. Unix environment strings cannot contain a NUL byte. Newlines are representable, though consumers and diff tools may need special handling.

Repeated yq invocations favor correctness and readability for small arrays. For thousands of entries, serialize the data once as JSON or YAML with a trusted serializer and transform it in one yq process.

## Build Objects from Parallel Bash Arrays

Portable Bash 3-compatible scripts can use parallel indexed arrays rather than associative arrays:

```bash
names=(api worker)
ports=(8080 9090)

if ((${#names[@]} != ${#ports[@]})); then
  printf '%s\n' 'names and ports have different lengths' >&2
  exit 1
fi

temporary=$(mktemp './services.XXXXXX')
cleanup() {
  rm -f -- "$temporary"
}
trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM
yq -n '{"services": []}' >"$temporary"

for index in "${!names[@]}"; do
  NAME=${names[$index]} PORT=${ports[$index]} yq -i '
    .services += [{
      "name": strenv(NAME),
      "port": env(PORT)
    }]
  ' "$temporary"
done
```

macOS ships an older Bash by default, so examples relying on associative arrays may not be portable there. Indexed arrays and `${!array[@]}` work in Bash 3.

Validate `PORT` before construction. Place this check inside the loop, before the command that appends the service:

```bash
PORT=${ports[$index]} yq -e '
  ((env(PORT) | tag) == "!!int") and
  (env(PORT) >= 1) and
  (env(PORT) <= 65535)
' -n >/dev/null
```

## Build a Map with Dynamic Keys

Sometimes the desired output is keyed by service name:

```yaml
services:
  api:
    port: 8080
  worker:
    port: 9090
```

Initialize an empty map and assign one dynamic key per iteration:

```bash
yq -n '{"services": {}}' >"$temporary"

for index in "${!names[@]}"; do
  NAME=${names[$index]} PORT=${ports[$index]} yq -i '
    .services[strenv(NAME)] = {
      "port": env(PORT)
    }
  ' "$temporary"
done
```

Bracket lookup treats dots, dashes, and spaces in `NAME` as part of one key. Mike Farah yq traversal also supports wildcard characters, so reject `*` and `?` when your service-name schema does not allow them.

Duplicate dynamic names overwrite the earlier map entry. Detect duplicates in Bash or build an array first and compare its length with `unique_by(.name)` before converting identities into map keys.

## Import a Trusted Serialized Array

When an upstream tool already supplies valid JSON or YAML, `env` can parse the whole node:

```bash
TARGETS_JSON='["api.example.com", "worker blue"]'
TARGETS_JSON=$TARGETS_JSON yq -n '
  .targets = env(TARGETS_JSON)
'
```

Validate its shape:

```bash
TARGETS_JSON=$TARGETS_JSON yq -e '
  (env(TARGETS_JSON) | tag == "!!seq") and
  (env(TARGETS_JSON) | all_c(tag == "!!str"))
' -n >/dev/null
```

Do not construct `TARGETS_JSON` like this:

```bash
TARGETS_JSON="[\"${targets[*]}\"]"
```

Array boundaries disappear, the first character of `IFS` joins elements, and embedded quotes or backslashes corrupt the serialization. Use a real serializer or the per-element loop.

## Transform Existing Bash-friendly Text

Line-delimited text can be split inside yq when the data contract forbids embedded newlines:

```bash
TARGETS=$'api.example.com\nworker.example.com' yq -n '
  .targets = (strenv(TARGETS) | split("\n"))
'
```

This is concise but not general: one newline can mean either an element boundary or part of a value. State and enforce the restriction. Avoid clever delimiter protocols for arbitrary data; serialization exists to preserve boundaries.

Bash command substitution removes trailing newline characters, which can also change the last value. The official yq string documentation calls out this behavior. Use direct file input or explicit environment assignments when trailing newlines are meaningful.

## Merge Static Structure with Dynamic Data

Bindings keep a larger constructor readable:

```bash
NAME=api PORTS='[8080, 8443]' ENABLED=true yq -n '
  strenv(NAME) as $name |
  env(PORTS) as $ports |
  env(ENABLED) as $enabled |
  {
    "version": 1,
    "application": {
      "name": $name,
      "network": {
        "ports": $ports,
        "enabled": $enabled
      }
    }
  }
'
```

Bindings are yq values, not shell substitution. Validate structured variables before using them in the final document.

## Publish Generated YAML Safely

Writing `yq -n ... > generated.yml` is safe when `generated.yml` is a new output and no valid old version must survive a failed generation. When replacing an authoritative file, render to a same-directory temporary path, validate it, and rename it only after success.

Useful checks include:

```bash
yq -e '
  (tag == "!!map") and
  (.services | tag == "!!seq") and
  (.services | all_c(
    (tag == "!!map") and
    ((.name | tag) == "!!str") and
    ((.port | tag) == "!!int")
  ))
' "$temporary" >/dev/null
```

Then run the consuming application's official validator where available. YAML syntax and node tags do not enforce its full schema.

## Security and Operational Caveats

Environment variables can leak through CI diagnostics or process inspection. Do not print generated documents containing secrets. Current yq can disable all environment operators with `--security-disable-env-ops`; expressions using `env`, `strenv`, or `envsubst` intentionally fail under that policy.

Pin the Mike Farah yq v4 version in automation. Another project also installs a `yq` executable with a different interface. Finally, review formatting and comments when generating from an existing document: yq tries to preserve presentation, but a from-scratch constructor creates fresh style and comments by definition.

## Conclusion

Let the yq expression own YAML structure and let Bash supply values through environment variables. Use `-n` for a fresh document, `{}` for maps, `[]` for arrays, `strenv` for text, and `env` for deliberately parsed YAML nodes. For variable-length Bash arrays, either append each element safely or serialize once with a real encoder. Validate types and invariants before atomically publishing the generated file.

## Official Documentation

- [Mike Farah yq: Create and Collect into Object](https://mikefarah.gitbook.io/yq/operators/create-collect-into-object)
- [Mike Farah yq: Collect into Array](https://mikefarah.gitbook.io/yq/operators/collect-into-array)
- [Mike Farah yq: Environment Variable Operators](https://mikefarah.gitbook.io/yq/operators/env-variable-operators)
- [Mike Farah yq: Add Operator](https://mikefarah.gitbook.io/yq/operators/add)
- [Mike Farah yq: String Operators and Bash Newlines](https://mikefarah.gitbook.io/yq/operators/string-operators)
- [GNU Bash Manual: Arrays](https://www.gnu.org/software/bash/manual/html_node/Arrays.html)
- [GNU Bash Manual: Signals](https://www.gnu.org/software/bash/manual/html_node/Signals.html)
