# How to Inject Environment Variables with yq While Preserving String, Number, and Boolean Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: YAML, Bash, Configuration Management, CI/CD, Command Line

Description: Use env and strenv in Mike Farah yq v4 to inject environment values with deliberate YAML string, integer, boolean, array, and map types.

---

Every Unix environment variable is transported as text, but the target YAML node may need to be a string, number, boolean, array, or map. Mike Farah yq v4 makes that conversion explicit:

- `strenv(NAME)` always produces a string node.
- `env(NAME)` parses the variable's contents as a YAML value.
- `envsubst` replaces `${NAME}` placeholders inside an existing string.

Choosing the operator deliberately prevents a replica count from becoming `"3"`, an identifier such as `00123` from becoming numeric, or a boolean from becoming the string `"false"`.

## Build a Typed Document

Create a new document with `--null-input` or `-n`:

```bash
APP_NAME='billing api' \
REPLICAS=3 \
ENABLED=true \
PORT=8080 \
yq -n '
  {
    "application": {
      "name": strenv(APP_NAME),
      "replicas": env(REPLICAS),
      "enabled": env(ENABLED),
      "ports": [env(PORT)]
    }
  }
'
```

Output:

```yaml
application:
  name: billing api
  replicas: 3
  enabled: true
  ports:
    - 8080
```

The quotes around the shell assignment do not determine the YAML type. `REPLICAS='3'` is still parsed as an integer by `env(REPLICAS)`. The yq operator makes the decision.

## Prove the Types with YAML Tags

Visual YAML can be misleading. Ask yq for each node's tag:

```bash
REPLICAS=3 ENABLED=true HOST=api.internal yq -n '
  {
    "replicas": (env(REPLICAS) | tag),
    "enabled": (env(ENABLED) | tag),
    "host": (strenv(HOST) | tag)
  }
'
```

Output:

```yaml
replicas: '!!int'
enabled: '!!bool'
host: '!!str'
```

Use tag checks in tests when downstream software distinguishes these types.

## Use `strenv` for Identifiers and Free Text

Values such as account IDs, ZIP codes, image tags, semantic versions, and user-entered text are strings even when they look numeric or boolean:

```bash
ACCOUNT_ID=001234 \
IMAGE_TAG=true \
MESSAGE='deploy at 09:00 # blue' \
yq -n '
  {
    "accountId": strenv(ACCOUNT_ID),
    "imageTag": strenv(IMAGE_TAG),
    "message": strenv(MESSAGE)
  }
'
```

Output:

```yaml
accountId: "001234"
imageTag: "true"
message: 'deploy at 09:00 # blue'
```

yq chooses the necessary output quoting. Do not add YAML quotes by putting literal quote characters into the environment value; that changes the data itself when used with `strenv`.

`strenv` also avoids expression injection. This is safe even when `MESSAGE` contains quotes, pipes, brackets, or yq-looking text:

```bash
MESSAGE=$message yq '.notification.text = strenv(MESSAGE)' config.yml
```

By contrast, embedding `$message` inside a double-quoted yq expression asks Bash to manufacture program text and is fragile.

## Use `env` for Numbers and Booleans

For schema fields that require typed scalars:

```bash
REPLICAS=${REPLICAS:?REPLICAS is required}
ENABLED=${ENABLED:?ENABLED is required}

REPLICAS=$REPLICAS ENABLED=$ENABLED yq '
  .deployment.replicas = env(REPLICAS) |
  .deployment.enabled = env(ENABLED)
' deployment.yml
```

If `REPLICAS=three`, `env` parses it as a valid YAML string rather than rejecting it merely because the schema expects an integer. Type conversion is not schema validation. Add explicit checks:

```bash
REPLICAS=$REPLICAS ENABLED=$ENABLED yq -e '
  (env(REPLICAS) | tag) == "!!int" and
  (env(REPLICAS) >= 1) and
  (env(ENABLED) | tag) == "!!bool"
' -n >/dev/null
```

Only after that succeeds should an automation update the file with `-i`.

Bash's `${NAME:?message}` form fails when a required variable is unset or empty. That is useful before invoking yq and produces a clearer boundary between missing configuration and invalid YAML types.

## Inject Arrays and Maps

`env` parses complete YAML or JSON structures as nodes:

```bash
PORTS='[8080, 8443]' \
LIMITS='{cpu: 500m, memory: 512Mi}' \
yq -n '
  {
    "service": {"ports": env(PORTS)},
    "resources": {"limits": env(LIMITS)}
  }
'
```

Output:

```yaml
service:
  ports: [8080, 8443]
resources:
  limits:
    cpu: 500m
    memory: 512Mi
```

This is convenient when the variable comes from a trusted, properly serialized source. Do not hand-build JSON or YAML by concatenating arbitrary Bash strings. Quotes, backslashes, newlines, and comment characters can change the parse tree. Use a serializer, or pass individual values through `strenv` and construct the array or object in the yq expression.

Validate a structured environment value before using it:

```bash
PORTS=$PORTS yq -e '
  (env(PORTS) | tag) == "!!seq" and
  (env(PORTS) | all_c(tag == "!!int"))
' -n >/dev/null
```

This verifies that the root is an array and every element is an integer.

## Update an Existing File in Place

Review a non-mutating run first:

```bash
IMAGE='registry.example.com/api:v4' \
REPLICAS=4 \
ENABLED=false \
yq '
  .deployment.image = strenv(IMAGE) |
  .deployment.replicas = env(REPLICAS) |
  .deployment.enabled = env(ENABLED)
' deployment.yml
```

Then use the same expression with `-i`:

```bash
IMAGE='registry.example.com/api:v4' \
REPLICAS=4 \
ENABLED=false \
yq -i '
  .deployment.image = strenv(IMAGE) |
  .deployment.replicas = env(REPLICAS) |
  .deployment.enabled = env(ENABLED)
' deployment.yml
```

The input filename is required for in-place operation. Piping the file on standard input does not give yq a target to replace.

## Understand Empty and Unset Variables

An empty string passed to `strenv` is an empty YAML string. An unset variable is a different operational condition and should usually be rejected in Bash:

```bash
: "${IMAGE:?IMAGE must be set and non-empty}"
IMAGE=$IMAGE yq -i '.deployment.image = strenv(IMAGE)' deployment.yml
```

The colon is Bash's no-op command; parameter expansion performs the check.

For optional variables, define the policy explicitly:

```bash
IMAGE=${IMAGE-default/image:latest}
```

`${IMAGE-default}` uses the default only when the variable is unset. `${IMAGE:-default}` also uses it when the value is empty. That distinction belongs to Bash before yq is invoked.

## Use `envsubst` for Placeholders Inside Strings

`envsubst` does interpolation within an existing string node:

```yaml
url: https://${HOST}:${PORT}/health
```

Update it with:

```bash
HOST=api.internal PORT=8443 \
yq '.url |= envsubst(nu, ne, ff)' template.yml
```

The result remains a string:

```yaml
url: https://api.internal:8443/health
```

The official options mean:

- `nu`: reject an unset referenced variable unless the placeholder supplies a default;
- `ne`: reject a referenced variable that is set but empty;
- `ff`: stop at the first substitution failure.

`envsubst` does not turn the resulting text into an integer, boolean, map, or array. Use `env` when the entire environment variable represents a typed YAML node.

To substitute placeholders in every string value node of a document (excluding map keys):

```bash
yq '(.. | select(tag == "!!str")) |= envsubst(nu, ff)' template.yml
```

Review the scope carefully: secrets or literal `${...}` text elsewhere in the document may be substituted too.

## Security and Portability Boundaries

Environment variables are visible to the child process and may be exposed through CI logs or process-inspection facilities. Do not print a generated document containing secrets. Prefer a secret store's file or descriptor integration when exposure through the environment is unacceptable.

Current Mike Farah yq provides `--security-disable-env-ops`. When that flag is enabled, `env`, `strenv`, and `envsubst` fail. This is intentional for environments that must prevent expressions from reading process environment data.

Unix environment values cannot contain a NUL byte. Bash command substitution also strips trailing newlines, so avoid using it to transport text where those bytes matter. Pass file content through yq's documented file operators or a serialized input rather than flattening it into a shell variable.

## Conclusion

Typed injection is an explicit modeling decision. Use `strenv` for identifiers and text, `env` for trusted serialized YAML values, and `envsubst` for placeholders inside strings. Check required variables in Bash, validate tags and ranges in yq, keep the expression single-quoted, and never create yq code by interpolating arbitrary environment text.

## Official Documentation

- [Mike Farah yq: Environment Variable Operators](https://mikefarah.gitbook.io/yq/operators/env-variable-operators)
- [Mike Farah yq: Tag Operator](https://mikefarah.gitbook.io/yq/operators/tag)
- [Mike Farah yq: Boolean Operators](https://mikefarah.gitbook.io/yq/operators/boolean-operators)
- [Mike Farah yq: Assign Update Operator](https://mikefarah.gitbook.io/yq/operators/assign-update)
- [GNU Bash Manual: Shell Parameter Expansion](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html)
