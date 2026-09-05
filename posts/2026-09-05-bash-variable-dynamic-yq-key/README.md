# How to Use a Bash Variable as a Dynamic yq Key Without Getting `null`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Bash Scripting, Command Line, Configuration Management

Description: Pass a Bash value into Mike Farah yq v4 as one literal map key, while avoiding shell interpolation, accidental traversal, and silent null results.

---

A dynamic key is a single map-key value chosen at runtime. It is not text to paste into a yq program. That distinction explains the common `null` result when a Bash variable contains dots that yq interprets as path separators. A dash alone, as in `worker-blue`, does not cause that failure.

With Mike Farah yq v4, pass the Bash value through the environment and use it inside brackets with `strenv`:

```bash
KEY=$key yq '.services[strenv(KEY)].image' config.yml
```

This keeps the expression fixed and treats dots, dashes, spaces, and similar punctuation as part of one string key. The later wildcard section covers the exceptional `*` and `?` characters, which yq traversal interprets as patterns.

## Reproduce the Failure

Suppose `config.yml` contains host-like service keys:

```yaml
services:
  api.example.com:
    image: registry.example.com/api:v1
    replicas: 3
  worker-blue:
    image: registry.example.com/worker:v1
    replicas: 2
```

This shell interpolation is wrong:

```bash
key='api.example.com'
yq ".services.$key.image" config.yml
```

Bash expands the command to an expression equivalent to:

```text
.services.api.example.com.image
```

yq consequently looks for `services` → `api` → `example` → `com` → `image`. That path is absent, so the normal result is:

```text
null
```

The quotes protected whitespace from Bash, but they did not preserve the variable as one yq path component.

## Pass the Value Through the Environment

Use an environment name that is easy to distinguish from the shell variable:

```bash
key='api.example.com'

KEY=$key \
  yq '.services[strenv(KEY)].image' config.yml
```

Output:

```text
registry.example.com/api:v1
```

`KEY=$key` is a temporary environment assignment for this command. `strenv(KEY)` reads it and always creates a string value. Brackets allow that value to calculate one key.

The yq expression is enclosed in single quotes. Bash therefore does not expand `$`, backticks, backslashes, or command substitutions inside the program.

You can also export once when several commands need the same value:

```bash
export KEY='worker-blue'
yq '.services[strenv(KEY)].replicas' config.yml
yq '.services[strenv(KEY)].image' config.yml
```

Prefer the command-prefix form for short-lived values because it limits their scope.

## Avoid Three Similar-looking Mistakes

The first mistake is dotted shell interpolation:

```bash
yq ".services.$key.image" config.yml
```

Dots in the expanded value become traversal operators.

The second mistake is referring to an undefined yq variable:

```bash
yq '.services[$key].image' config.yml
```

`$key` here is a yq expression variable, not a Bash variable. It has not been bound with yq's `as` operator, and the outer single quotes correctly stop Bash from replacing it. In yq v4.53.6, this unbound variable yields no values, so the brackets act like `[]` and select every service; it does not reliably produce an undefined-variable error.

The third mistake is assuming a local shell variable is automatically an environment variable:

```bash
key='api.example.com'
yq '.services[strenv(key)].image' config.yml
```

Shell variables are not inherited by child processes unless exported or supplied as prefix assignments. Environment names are also case-sensitive. `key` and `KEY` are different.

## Use Multiple Dynamic Keys

Bracket expressions compose naturally:

```yaml
environments:
  production:
    api.example.com:
      port: 8443
```

Read the port with two values:

```bash
environment=production
service='api.example.com'

ENVIRONMENT=$environment SERVICE=$service \
  yq '.["environments"][strenv(ENVIRONMENT)][strenv(SERVICE)].port' \
  config.yml
```

Output:

```text
8443
```

Every bracket is one traversal step. Literal and dynamic components can be mixed freely.

## Update a Dynamic Key

The same lookup can be used on the left side of an assignment:

```bash
key='api.example.com'
image='registry.example.com/api:v2'

KEY=$key IMAGE=$image \
  yq '(.services[strenv(KEY)].image) = strenv(IMAGE)' config.yml
```

Review that output, then add `-i`:

```bash
KEY=$key IMAGE=$image \
  yq -i '(.services[strenv(KEY)].image) = strenv(IMAGE)' config.yml
```

Parentheses are optional for this direct path, but they make the complete assignment target obvious and become important when the target contains a pipeline or `select`.

For a typed numeric update, use `env` deliberately:

```bash
KEY=$key REPLICAS=5 \
  yq -i '.services[strenv(KEY)].replicas = env(REPLICAS)' config.yml
```

`env(REPLICAS)` parses `5` as YAML and stores an integer. `strenv(REPLICAS)` would store the string `"5"`.

## Distinguish a Key from a Complete Path

Sometimes a trusted deployment script genuinely needs to supply `.services["api.example.com"].image` as a complete yq path. Mike Farah yq provides `eval` for that separate use case:

```bash
path='.services["api.example.com"].image'
value='registry.example.com/api:v2'

PATH_EXPRESSION=$path VALUE=$value \
  yq 'eval(strenv(PATH_EXPRESSION)) = strenv(VALUE)' config.yml
```

Do not use `eval` merely to solve quoting. It executes any valid yq expression in the variable, so it creates an expression-injection boundary. Only a trusted, validated source should supply `PATH_EXPRESSION`. For a user-provided key, use bracket lookup.

## Make a Missing Key Fail Instead of Printing `null`

Mike Farah yq normally exits zero when an ordinary traversal returns null. Use `--exit-status` or `-e` when absence must stop CI:

```bash
if ! KEY=$key yq -e \
  '.services[strenv(KEY)].image' config.yml >/dev/null; then
  printf 'service key not found: %s\n' "$key" >&2
  exit 1
fi
```

The `-e` flag also fails when the final result is `false`. If false or null is a legitimate stored value, test the map membership with `has`:

```bash
if ! KEY=$key yq -e \
  '.services | has(strenv(KEY))' config.yml >/dev/null; then
  printf 'service key not found: %s\n' "$key" >&2
  exit 1
fi
```

Then read the possibly false or null value separately.

## Validate the Parent Type

Bracket lookup assumes `services` is a map. For automation that consumes untrusted configuration, validate the shape before updating:

```bash
yq -e '.services | tag == "!!map"' config.yml >/dev/null
```

This rejects a missing value, scalar, or array. Without validation, an update can create missing path components, which is useful for construction but can conceal a misspelled parent key.

A stricter preflight combines type and membership while keeping each value bound explicitly:

```bash
KEY=$key yq -e '
  (.services | tag == "!!map") and
  (.services | has(strenv(KEY)))
' config.yml >/dev/null
```

After the check, apply the update to a file that other processes are not modifying concurrently.

## Be Aware of Wildcard Semantics

Mike Farah yq string equality and traversal support glob-like `*` and `?` matching. Most service identifiers do not contain those characters. If they can, reject them at the input boundary or use an exact comparison over `to_entries`; otherwise a value intended as one name can match several keys.

A simple schema guard in Bash is:

```bash
case $key in
  *'*'*|*'?'*)
    printf 'wildcards are not allowed in service keys: %s\n' "$key" >&2
    exit 2
    ;;
esac
```

This is a policy choice, not an escaping technique. When literal wildcard keys are valid data, compare complete entry keys with type-aware mutual containment instead of traversal or yq's glob-aware equality:

```bash
KEY=$key yq '
  strenv(KEY) as $wanted |
  .services |
  to_entries[] |
  .key as $candidate |
  select(
    (($candidate | contains($wanted)) and
     ($wanted | contains($candidate)))
  ) |
  .value.image
' config.yml
```

Count the matches if exactly one entry is required. For mutations, rejecting wildcard-bearing keys is usually simpler than reconstructing the map with `with_entries`.

## Handle Shell Output Correctly

Capture a scalar with `-r` for intent, although unwrapped scalar output is already the YAML default in current Mike Farah v4:

```bash
if image=$(KEY=$key yq -e -r \
  '.services[strenv(KEY)].image' config.yml); then
  printf 'selected image: %s\n' "$image"
else
  printf 'missing image for %s\n' "$key" >&2
  exit 1
fi
```

Bash command substitution removes trailing newlines. That is harmless for an image name but unsuitable when trailing newlines are meaningful data. It also cannot store NUL bytes. For structured values, keep them as YAML or emit compact JSON per item rather than flattening them into a shell scalar.

## Conclusion

The cure for a dynamic-key `null` is not more shell escaping. Pass the Bash value as an environment variable, read it with `strenv`, and put it in brackets so ordinary punctuation remains one path component. Reject or exactly handle `*` and `?`, use `env` only when YAML type inference is wanted, reserve `eval` for trusted complete expressions, validate the parent structure, and turn on `-e` when a missing result must fail automation.

## Official Documentation

- [Mike Farah yq: Environment Variable Operators](https://mikefarah.gitbook.io/yq/operators/env-variable-operators)
- [Mike Farah yq: Traverse Read Operator](https://mikefarah.gitbook.io/yq/operators/traverse-read)
- [Mike Farah yq: Eval Operator](https://mikefarah.gitbook.io/yq/operators/eval)
- [Mike Farah yq: Has Operator](https://mikefarah.gitbook.io/yq/operators/has)
- [GNU Bash Manual: Environment](https://www.gnu.org/software/bash/manual/html_node/Environment.html)
