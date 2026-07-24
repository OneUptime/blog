# How to Inspect the Fully Resolved Devfile After Parent Inheritance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, Inheritance, Troubleshooting, YAML, odo

Description: Resolve Devfile parents, variables, and referenced content so you can audit the effective components, commands, endpoints, and overrides.

---

A child Devfile is not the complete configuration when it has a `parent`. The consuming tool fetches the parent, merges child content and overrides, substitutes variables, and validates the flattened result. It may also inline referenced Kubernetes manifests.

That effective document is what you need to inspect when:

- a command uses an unexpected image or component
- an override appears to do nothing
- two default commands conflict
- a parent upgrade changes resource limits
- validation reports a duplicate that is absent from the child
- a workspace works for one developer but not another

Do not debug inheritance by reading the child alone.

## Start with a Concrete Parent and Child

Imagine a registry parent:

```yaml
schemaVersion: 2.2.0

metadata:
  name: go-platform
  version: 1.4.0

components:
  - name: runtime
    container:
      image: registry.example.com/dev/go:1.22
      mountSources: true
      memoryLimit: 1Gi
      endpoints:
        - name: http
          targetPort: 8080

commands:
  - id: build
    exec:
      component: runtime
      workingDir: ${PROJECT_SOURCE}
      commandLine: go build ./...
      group:
        kind: build
        isDefault: true

  - id: run
    exec:
      component: runtime
      workingDir: ${PROJECT_SOURCE}
      commandLine: go run ./cmd/server
      group:
        kind: run
        isDefault: true
```

The application child is shorter:

```yaml
schemaVersion: 2.2.0

metadata:
  name: inventory-api

parent:
  id: go-platform
  registryUrl: https://devfiles.example.com/
  version: 1.4.0

commands:
  - id: test
    exec:
      component: runtime
      workingDir: ${PROJECT_SOURCE}
      commandLine: go test ./...
      group:
        kind: test
        isDefault: true
```

The child never defines `runtime`, `build`, or `run`, yet all three should exist after resolution.

## Inspect odo's Effective Devfile

From the directory containing `devfile.yaml`, ask odo to describe the local component as JSON:

```bash
odo describe component -o json
```

Extract the Devfile:

```bash
odo describe component -o json \
  | jq '.devfileData.devfile'
```

Create a stable key order for review:

```bash
odo describe component -o json \
  | jq -S '.devfileData.devfile' \
  > /tmp/inventory-api-resolved.json
```

The current odo implementation parses an “effective Devfile” for local commands. Its source enables parent flattening and conversion of referenced Kubernetes content before `odo describe component` builds the JSON response.

This is a consumer-effective view, not a universal canonical format. odo can apply consumer-specific variable and image processing. Pin the odo version in CI and interpret the output as what that version plans to use.

If the command fails before producing JSON, the first useful error often identifies parent retrieval, merge, variable, or semantic validation rather than a problem with `jq`.

## Confirm That Inherited Content Is Present

Query components:

```bash
jq '
  .components[]
  | {
      name,
      image: .container.image,
      memoryLimit: .container.memoryLimit
    }
' /tmp/inventory-api-resolved.json
```

Query commands and their references:

```bash
jq '
  .commands[]
  | {
      id,
      type: (
        if .exec then "exec"
        elif .apply then "apply"
        elif .composite then "composite"
        else "unknown"
        end
      ),
      component: .exec.component,
      commandLine: .exec.commandLine,
      group: (.exec.group // .composite.group // .apply.group)
    }
' /tmp/inventory-api-resolved.json
```

Expected effective content includes:

- component `runtime`
- inherited build command `build`
- inherited run command `run`
- child test command `test`
- metadata and any merged attributes

If a child command references `runtime` but the component is absent, either the wrong parent version was fetched or resolution failed.

## Use the Devfile Library for Tool-Neutral Resolution

The official Go library exposes `ParseDevfileAndValidate`. Set `FlattenedDevfile` to true:

```go
package main

import (
	"fmt"
	"os"

	devfile "github.com/devfile/library/v2/pkg/devfile"
	"github.com/devfile/library/v2/pkg/devfile/parser"
	"sigs.k8s.io/yaml"
)

func main() {
	path := "devfile.yaml"
	if len(os.Args) > 1 {
		path = os.Args[1]
	}

	flattened := true
	inlineKubernetes := true
	resolved, warnings, err := devfile.ParseDevfileAndValidate(
		parser.ParserArgs{
			Path:                          path,
			FlattenedDevfile:              &flattened,
			ConvertKubernetesContentInUri: &inlineKubernetes,
		},
	)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if warnings != nil {
		fmt.Fprintln(os.Stderr, warnings)
	}

	content, err := yaml.Marshal(resolved.Data)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	_, _ = os.Stdout.Write(content)
}
```

Create a small module and pin a tested library version:

```bash
go mod init example.com/devfile-resolve
go get github.com/devfile/library/v2@v2.3.0
go get sigs.k8s.io/yaml
go run . ./devfile.yaml > /tmp/resolved-devfile.yaml
```

Use a library release compatible with the schema versions you support. A Kubernetes-resource parent also needs the parser context and Kubernetes client needed to retrieve that resource. Registry and URI parents need network access, certificate trust, and supported authentication.

The library can add provenance attributes describing imported or overridden elements. Preserve them during diagnosis; they help explain where effective content came from.

## Compare a Parent Upgrade Before Merging It

Resolve the current child:

```bash
odo describe component -o json \
  | jq -S '.devfileData.devfile' \
  > /tmp/resolved-before.json
```

Change only the pinned parent version in a branch:

```yaml
parent:
  id: go-platform
  registryUrl: https://devfiles.example.com/
  version: 1.5.0
```

Resolve again:

```bash
odo describe component -o json \
  | jq -S '.devfileData.devfile' \
  > /tmp/resolved-after.json

diff -u /tmp/resolved-before.json /tmp/resolved-after.json
```

Review more than the image tag:

- component image and architecture
- command line and working directory
- default group selection
- endpoint name, port, protocol, and exposure
- resource request and limit
- volume and source mount
- environment variables
- lifecycle events
- Kubernetes or OpenShift content
- top-level and component attributes

A parent release can be schema-valid while changing application behavior.

## Understand Identifier-Based Overrides

Devfile collections use identifiers such as component `name` and command `id`. Overrides of inherited collection entries belong inside the `parent` object; a matching identifier there participates in parent override and merge behavior.

For example, a child may try to raise the inherited runtime limit:

```yaml
parent:
  id: go-platform
  registryUrl: https://devfiles.example.com/
  version: 1.4.0
  components:
    - name: runtime
      container:
        memoryLimit: 2Gi
```

A partial `runtime` entry in the child's top-level `components` list would add child content rather than express this parent-scoped patch.

After resolution, inspect the whole component:

```bash
jq '
  .components[]
  | select(.name == "runtime")
' /tmp/inventory-api-resolved.json
```

Confirm that:

- the inherited image remains present
- `memoryLimit` is now `2Gi`
- inherited endpoints and mounts have the intended result
- no second `runtime` component exists

Do not infer nested-list behavior from YAML syntax. Devfile merge rules are implemented by the resolver, and different schema or library versions can refine behavior. The flattened output is the evidence.

## Find Duplicate Defaults Introduced by Inheritance

A parent may define the default test command while the child adds another:

```yaml
commands:
  - id: application-test
    exec:
      component: runtime
      commandLine: go test ./...
      group:
        kind: test
        isDefault: true
```

If the parent already has a different default test command, flattened validation fails because each command group kind permits only one default.

List effective defaults:

```bash
jq '
  .commands[]
  | select(
      (.exec.group.isDefault // false)
      or (.composite.group.isDefault // false)
      or (.apply.group.isDefault // false)
    )
  | {
      id,
      kind: (
        .exec.group.kind
        // .composite.group.kind
        // .apply.group.kind
      )
    }
' /tmp/inventory-api-resolved.json
```

Either override the intended inherited command according to supported merge rules or make the child command non-default.

## Inspect Variable Substitution

Top-level Devfile variables can replace supported string fields:

```yaml
variables:
  RUNTIME_IMAGE: registry.example.com/dev/go:1.22

components:
  - name: runtime
    container:
      image: "{{RUNTIME_IMAGE}}"
```

They cannot replace:

- `schemaVersion`
- metadata
- parent source
- element identifiers
- references to identifiers
- enum fields

The resolved view should contain the substituted image. If a variable remains literal, check spelling, allowed substitution locations, and whether the consumer was given an external override.

Do not use variable substitution to disguise parent identity or command IDs. Those fields are deliberately excluded.

## Diagnose Source and Network Differences

Resolution can differ by machine when one environment:

- reaches a different registry mirror
- follows a proxy
- trusts a private CA
- has credentials for a private URI
- resolves a Kubernetes parent in a different namespace
- caches an older parent version

Record the parent source and exact version. Test from the same container and network used by CI or the workspace controller:

```bash
curl -fsS https://devfiles.example.com/index/all
odo describe component -o json > /dev/null
```

Install the correct CA trust rather than disabling TLS verification. A parent can define executable commands and images, so resolution is part of the development supply chain.

## Separate Raw, Flattened, and Runtime Views

There are three useful artifacts:

1. **Raw child**: what the application repository owns.
2. **Flattened Devfile**: parent and child after spec/library resolution.
3. **Consumer-effective view**: flattened content after odo or another tool applies its supported processing.

Do not expect byte-for-byte equality between the library output and odo JSON. Normalize and compare the fields that affect behavior.

At runtime, inspect the generated pod, deployment, services, or forwarded ports too. A resolved Devfile explains intent; cluster policy, defaults, and consumer generation determine actual resources.

## Do Not Edit Generated Output

The resolved file is a diagnostic or review artifact. Make changes in:

- the child Devfile
- the versioned parent
- the registry release
- consumer configuration

Editing `/tmp/resolved-devfile.yaml` does not change what the next workspace creation resolves. Committing generated output beside the child can also create two conflicting sources of truth unless CI owns and refreshes it.

## A Resolution Checklist

For every parent update or inheritance bug:

1. Pin the parent source and version.
2. Resolve from the actual consumer environment.
3. Preserve resolver warnings.
4. Inspect all effective components and commands.
5. Check identifier-based overrides.
6. Check one default per command group.
7. Review endpoints, volumes, resources, and events.
8. Compare before and after normalized output.
9. Run build, test, run, debug, and cleanup in a disposable environment.
10. Change the source, not the generated result.

Once the flattened configuration is visible, parent inheritance stops being hidden behavior and becomes a reviewable dependency change.

## Official Documentation

- [Referring to a parent Devfile](https://devfile.io/docs/2.3.0/referring-to-a-parent-devfile)
- [Devfile Go library and FlattenedDevfile](https://devfile.io/docs/2.3.0/library)
- [Devfile validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Devfile 2.3.0 schema](https://devfile.io/docs/2.3.0/devfile-schema)
- [odo describe component](https://odo.dev/docs/command-reference/describe-component/)
- [odo JSON output](https://odo.dev/docs/command-reference/json-output/)
