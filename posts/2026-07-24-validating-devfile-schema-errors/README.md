# How to Validate a Devfile and Decode Common Schema Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, Validation, YAML, Troubleshooting, odo

Description: Validate Devfiles at YAML, schema, semantic, inheritance, and consumer layers, then turn common error paths into focused fixes.

---

A Devfile can fail at several different layers:

1. YAML parsing
2. JSON Schema validation
3. Devfile semantic validation
4. parent or URI resolution
5. consumer compatibility
6. runtime behavior

Running only a generic YAML linter catches indentation and syntax, but not a command that references a missing component. Validating only against the latest schema can accept features that an older odo or workspace implementation does not support.

Use a layered workflow and preserve the first meaningful error.

## Confirm the Declared Schema

```yaml
schemaVersion: 2.3.0

metadata:
  name: inventory-api
```

`schemaVersion` is required and must be a semantic version matching the Devfile schema pattern. It is not an application version. `metadata.version` describes the Devfile or stack version:

```yaml
metadata:
  name: inventory-api
  version: 1.0.0
```

Validate against the schema matching the declaration. The official latest schema is useful during development:

```text
https://raw.githubusercontent.com/devfile/api/main/schemas/latest/devfile.json
```

For a released Devfile, pin the versioned schema in CI so a future schema update does not silently change the result.

## Add Editor Validation

The Devfile documentation recommends the YAML Language Server. Configure VS Code or another compatible editor:

```json
{
  "yaml.schemas": {
    "https://raw.githubusercontent.com/devfile/api/main/schemas/latest/devfile.json": "devfile.yaml"
  }
}
```

This provides completion, hover documentation, document structure, and schema errors while editing.

Editor validation is schema-only. It may not fetch a parent, merge inherited content, or apply all semantic rules implemented by the Devfile library.

## Validate with the Actual Consumer

Current odo commands parse and validate the local Devfile before using it. A convenient read-only check is:

```bash
odo describe component -o json > /dev/null
```

Run it from the directory containing `devfile.yaml`. It resolves the effective content used by odo and fails nonzero when parsing or validation fails.

The current odo command reference does not document a standalone `odo validate` command. Do not copy an old or third-party command into CI without checking `odo --help` for the installed version.

Consumer validation matters because the Devfile specification and odo implementation can support different schema versions. The current odo Devfile reference describes its 2.2.x support, while Devfile.io publishes schema 2.3.0 documentation. A 2.3.0 file can be valid to the specification yet incompatible with that consumer.

## Use the Official Go Library in CI

For a tool-neutral validation utility, use the Devfile library's `ParseDevfileAndValidate` API:

```go
package main

import (
	"fmt"
	"os"

	devfile "github.com/devfile/library/v2/pkg/devfile"
	"github.com/devfile/library/v2/pkg/devfile/parser"
)

func main() {
	path := "devfile.yaml"
	if len(os.Args) > 1 {
		path = os.Args[1]
	}

	flattened := true
	inlineKubernetes := true
	_, warnings, err := devfile.ParseDevfileAndValidate(parser.ParserArgs{
		Path:                          path,
		FlattenedDevfile:              &flattened,
		ConvertKubernetesContentInUri: &inlineKubernetes,
	})
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if len(warnings.Commands) > 0 ||
		len(warnings.Components) > 0 ||
		len(warnings.Projects) > 0 ||
		len(warnings.StarterProjects) > 0 ||
		len(warnings.DependentProjects) > 0 {
		fmt.Fprintln(os.Stderr, warnings)
	}
}
```

Pin a tested library version in `go.mod`. `FlattenedDevfile: true` resolves parent content before final validation. URI and registry parents require network access, certificate trust, and any authentication supported by the library.

The parser returns variable warnings separately from fatal errors. Treat warnings according to an explicit CI policy rather than discarding them.

## Read Schema Error Paths from the Outside In

A typical schema error identifies a path, a violated keyword, and an expected shape. Reduce it to:

```text
document location -> actual type/value -> schema expectation
```

For example:

```text
components.0.container.env: expected array, got object
```

Incorrect:

```yaml
env:
  APP_ENV: development
```

Correct for the Devfile schema:

```yaml
env:
  - name: APP_ENV
    value: development
```

Fix the earliest structural error first. A malformed component can cause many secondary “required property” and reference errors.

## Common Error: Invalid Name or ID

Devfile names and IDs use a Kubernetes-compatible pattern:

```text
^[a-z0-9]([-a-z0-9]*[a-z0-9])?$
```

They must be lowercase, at most 63 characters, use only alphanumeric characters and hyphens, and begin and end with an alphanumeric character.

Incorrect:

```yaml
metadata:
  name: Inventory_API

commands:
  - id: Run App!
```

Correct:

```yaml
metadata:
  name: inventory-api

commands:
  - id: run-app
```

Do not use top-level variables to construct identifiers. Devfile variable substitution is not supported for element identifiers such as component names, command IDs, endpoint names, or project names.

## Common Error: Wrong Union Shape

Each component entry has a `name` and one component type:

```yaml
components:
  - name: runtime
    container:
      image: quay.io/devfile/golang:latest
```

Putting `image` beside `container`, or defining both `container` and `volume` in one entry, violates the union schema.

Commands have the same pattern:

```yaml
commands:
  - id: run
    exec:
      component: runtime
      commandLine: go run .
```

Do not put `commandLine` directly beside `id`; it belongs under `exec`.

## Common Error: Duplicate Identifiers

Component names and command IDs must be unique:

```yaml
# Invalid
components:
  - name: runtime
    container:
      image: image-a
  - name: runtime
    container:
      image: image-b
```

Duplicates can appear only after parent inheritance. Validate the flattened Devfile, not just the child file.

An intended parent override should use the identifier and shape supported by the Devfile merge rules. Inspect resolved output to confirm whether the child merged, replaced, or added content.

## Common Error: Missing Component Reference

An exec command must reference a valid container component:

```yaml
commands:
  - id: run
    exec:
      component: tools
      commandLine: npm start
```

If the only component is named `runtime`, validation fails. Rename the reference or component:

```yaml
exec:
  component: runtime
```

An apply command must reference a compatible container, image, Kubernetes, or OpenShift component. Event and composite references must point to valid commands.

## Common Error: Multiple Default Commands

Only one default command is allowed for each group kind:

```yaml
# Invalid: two default run commands
commands:
  - id: run-api
    exec:
      component: runtime
      commandLine: npm run api
      group:
        kind: run
        isDefault: true

  - id: run-worker
    exec:
      component: runtime
      commandLine: npm run worker
      group:
        kind: run
        isDefault: true
```

Choose one default. Keep the other callable without `isDefault`, or define a composite if the consumer supports the desired lifecycle.

## Common Error: Composite Command Cycle

Invalid:

```yaml
commands:
  - id: verify
    composite:
      commands:
        - unit-test
        - verify
```

A composite cannot reference itself directly or indirectly. Draw the command graph and ensure it is acyclic.

## Common Error: Endpoint Conflicts

Endpoint names must be unique across components. Target ports must also follow cross-container uniqueness rules unless components use supported dedicated-pod behavior.

Invalid:

```yaml
components:
  - name: api
    container:
      image: example/api
      endpoints:
        - name: http
          targetPort: 8080

  - name: admin
    container:
      image: example/admin
      endpoints:
        - name: http
          targetPort: 8080
```

Give endpoints unique names and nonconflicting ports, or deliberately model separate pods if the consumer supports that feature.

## Common Error: Resource Quantity or Ordering

Resource values use Kubernetes quantities:

```yaml
container:
  image: example/runtime
  cpuRequest: 250m
  cpuLimit: 1
  memoryRequest: 512Mi
  memoryLimit: 1Gi
```

The request must not exceed the limit. `512MB` and arbitrary strings are not equivalent to supported Kubernetes quantity formats.

## Common Error: Reserved Environment Variables

Do not redefine `PROJECT_SOURCE` or `PROJECTS_ROOT`:

```yaml
# Invalid
env:
  - name: PROJECT_SOURCE
    value: /custom/path
```

They are supplied by the Devfile consumer. Use `sourceMapping`, project clone paths, and `workingDir` to control source layout.

## Common Error: Parent Resolution

Parent failures often come before schema validation of the flattened content:

- registry unavailable
- stack ID or version absent
- URI returns HTML instead of YAML
- certificate not trusted
- authentication missing
- parent cycle
- inherited and child identifiers conflict

Pin the parent version, test the URL from the same CI network, and inspect the fetched content. Do not convert a TLS failure into `--insecure` by default; install the correct CA trust.

## Finish with Runtime Validation

A schema-valid Devfile can still fail because:

- the image cannot be pulled
- its architecture is unsupported
- the command executable is missing
- the working directory does not exist
- an endpoint targets the wrong port
- resource quotas reject the workspace
- a command exits immediately

After static validation, run the consumer in a disposable environment:

```bash
odo dev
```

Exercise build, run, test, debug, file synchronization, endpoint access, restart behavior, and cleanup. Schema validation proves structure; only the consumer proves implementation compatibility and runtime behavior.

## Official Documentation

- [Devfile 2.3.0 schema](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Editor integration and schema mapping](https://devfile.io/docs/2.3.0/integrate-with-editors)
- [Devfile Go library](https://devfile.io/docs/2.3.0/library)
- [odo Devfile reference](https://odo.dev/docs/development/devfile/)
- [odo describe component](https://odo.dev/docs/command-reference/describe-component/)
