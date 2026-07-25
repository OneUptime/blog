# A Practical devfile.yaml Walkthrough: Components, Commands, and Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, Kubernetes, Cloud Development, YAML, odo

Description: Build a Devfile 2.3 definition step by step, linking metadata, projects, containers, endpoints, and executable development commands.

---

A `devfile.yaml` describes a reproducible cloud-native development workspace. The specification separates what runs from what developers can do:

- `metadata` describes the stack or workspace.
- `projects` identifies source repositories used in the workspace.
- `components` defines containers, volumes, images, or Kubernetes resources.
- `commands` defines executable actions and their lifecycle groups.

This walkthrough uses Devfile schema 2.3.0. Consumer support is separate from specification validity. The current odo documentation describes its Devfile 2.2.x implementation, so use the schema version and features supported by the exact consumer you deploy.

## Begin with the Schema Version

`schemaVersion` is the only root field required by the Devfile schema:

```yaml
schemaVersion: 2.3.0
```

In practice, tools and registries generally need useful metadata and runtime content. Do not set the version to `latest`; the field is a semantic version string describing the schema used by the document.

## Add Metadata

```yaml
schemaVersion: 2.3.0

metadata:
  name: inventory-api
  displayName: Inventory API Development
  description: Go development environment for the inventory API
  version: 1.0.0
  projectType: Go
  language: Go
  provider: Example Platform Team
  tags:
    - Go
    - REST
    - PostgreSQL
  architectures:
    - amd64
```

`metadata.name` identifies the workspace or registry entry. Component and project names and command IDs follow Kubernetes-compatible lowercase naming rules in Devfile validation: lowercase alphanumeric characters and hyphens, with an alphanumeric first and last character and a maximum of 63 characters.

Registry-facing fields such as `displayName`, description, language, project type, tags, provider, icon, and support URL help discovery but do not install a runtime.

## Define a Project

The `projects` list describes source repositories that a workspace consumer can clone:

```yaml
projects:
  - name: inventory-api-source
    git:
      remotes:
        origin: https://github.com/devfile-samples/devfile-stack-go.git
      checkoutFrom:
        remote: origin
        revision: v2.3.0
```

Every project needs a unique name and one source type. If a Git source has more than one remote, `checkoutFrom.remote` is required so the consumer knows which remote supplies the revision.

An optional `clonePath` is relative to the projects root:

```yaml
projects:
  - name: inventory-api-source
    clonePath: services/inventory-api
    git:
      remotes:
        origin: https://github.com/devfile-samples/devfile-stack-go.git
      checkoutFrom:
        revision: v2.3.0
```

Do not use an absolute path or a path that escapes the projects root.

`projects` differs from `starterProjects`. A starter project is a selectable seed used when bootstrapping new source. A project is source that belongs in the resulting workspace. odo commonly operates on source already present in the current directory, so check how your chosen tool uses these fields.

## Add a Container Component

```yaml
components:
  - name: runtime
    container:
      image: quay.io/devfile/golang:latest
      mountSources: true
      sourceMapping: /projects
      memoryRequest: 512Mi
      memoryLimit: 1Gi
      cpuRequest: 250m
      cpuLimit: 1000m
      env:
        - name: CGO_ENABLED
          value: "0"
        - name: APP_ENV
          value: development
```

The component name is the identifier commands use. A container component requires an image. Pin production templates to a controlled tag or digest; `latest` is convenient for a sample but weak for reproducibility.

Resource requests must not exceed their limits, and values use Kubernetes quantity syntax. Consumers may map these fields to a development pod or another supported runtime.

`mountSources: true` asks the consumer to mount project source into the container. The special variables `${PROJECTS_ROOT}` and `${PROJECT_SOURCE}` represent the mounted projects root and primary source location. They are reserved and cannot be redefined in the component environment.

## Expose a Development Endpoint

```yaml
components:
  - name: runtime
    container:
      image: quay.io/devfile/golang:latest
      mountSources: true
      endpoints:
        - name: http
          targetPort: 8080
          protocol: http
          exposure: public
        - name: debug
          targetPort: 40000
          protocol: tcp
          exposure: none
```

An endpoint gives a port a stable name and describes how a consumer may expose it. `targetPort` is the port used by the process in the component.

Endpoint names use the same lowercase character pattern as other identifiers, but have a maximum of 15 characters and must be unique across components. Two container components cannot use the same `targetPort` unless `dedicatedPod: true` makes the restriction inapplicable; a single container component can define multiple endpoints for the same port.

`exposure: public` is a request to the consuming tool, not a guarantee of internet reachability. Cluster ingress, policy, and tool behavior determine the actual URL.

## Add a Persistent Volume

```yaml
components:
  - name: dependencies
    volume:
      size: 2Gi

  - name: runtime
    container:
      image: quay.io/devfile/golang:latest
      mountSources: true
      volumeMounts:
        - name: dependencies
          path: /go/pkg/mod
```

A volume mount must reference a valid volume component. Persistence semantics are consumer-specific, but the mount makes caches or workspace data independent from the container filesystem.

Use volumes for data that should survive a container restart, not for secrets that should be supplied through the platform's secret mechanism.

## Define Build, Run, and Test Commands

An `exec` command needs an ID, a command line, and the component in which it runs:

```yaml
commands:
  - id: build
    exec:
      component: runtime
      workingDir: ${PROJECT_SOURCE}
      commandLine: mkdir -p bin && go build -o bin/inventory-api .
      group:
        kind: build
        isDefault: true

  - id: run
    exec:
      component: runtime
      workingDir: ${PROJECT_SOURCE}
      commandLine: ./bin/inventory-api
      hotReloadCapable: false
      group:
        kind: run
        isDefault: true

  - id: test
    exec:
      component: runtime
      workingDir: ${PROJECT_SOURCE}
      commandLine: go test ./...
      group:
        kind: test
        isDefault: true
```

Command IDs must be unique. The `component` value must match a container component for an exec command.

Groups express command intent. Devfile supports build, run, test, debug, and deploy group kinds. Only one command in each kind can be the default. Consumers decide which groups they execute automatically. odo uses default build and run commands for its development loop and a default debug command when launched in debug mode.

For a default run or debug command, `hotReloadCapable: true` tells a supporting consumer that the process handles source changes itself and should not be restarted. For a default build command, it means the build should execute only once. Do not enable it for a process that must be restarted after a rebuild.

## Compose Commands

```yaml
commands:
  - id: format
    exec:
      component: runtime
      workingDir: ${PROJECT_SOURCE}
      commandLine: gofmt -w .

  - id: unit-test
    exec:
      component: runtime
      workingDir: ${PROJECT_SOURCE}
      commandLine: go test ./...

  - id: verify
    composite:
      commands:
        - format
        - unit-test
      parallel: false
      group:
        kind: test
        isDefault: true
```

A composite command references other command IDs and runs them sequentially or in parallel. It cannot reference itself directly or through a cycle. Use sequential execution when one action changes input consumed by the next.

Do not assign two default test commands after adding the composite. Remove `isDefault` from the individual unit test if `verify` is the default.

## The Complete Development Devfile

```yaml
schemaVersion: 2.3.0

metadata:
  name: inventory-api
  displayName: Inventory API Development
  description: Go development environment for the inventory API
  version: 1.0.0
  projectType: Go
  language: Go
  provider: Example Platform Team
  tags:
    - Go
    - REST
  architectures:
    - amd64

projects:
  - name: inventory-api-source
    git:
      remotes:
        origin: https://github.com/devfile-samples/devfile-stack-go.git
      checkoutFrom:
        remote: origin
        revision: v2.3.0

components:
  - name: dependencies
    volume:
      size: 2Gi

  - name: runtime
    container:
      image: quay.io/devfile/golang:latest
      mountSources: true
      memoryRequest: 512Mi
      memoryLimit: 1Gi
      cpuRequest: 250m
      cpuLimit: 1000m
      env:
        - name: CGO_ENABLED
          value: "0"
        - name: APP_ENV
          value: development
      endpoints:
        - name: http
          targetPort: 8080
          protocol: http
          exposure: public
      volumeMounts:
        - name: dependencies
          path: /go/pkg/mod

commands:
  - id: build
    exec:
      component: runtime
      workingDir: ${PROJECT_SOURCE}
      commandLine: mkdir -p bin && go build -o bin/inventory-api .
      group:
        kind: build
        isDefault: true

  - id: run
    exec:
      component: runtime
      workingDir: ${PROJECT_SOURCE}
      commandLine: ./bin/inventory-api
      group:
        kind: run
        isDefault: true

  - id: test
    exec:
      component: runtime
      workingDir: ${PROJECT_SOURCE}
      commandLine: go test ./...
      group:
        kind: test
        isDefault: true
```

## Validate Spec and Consumer Behavior

Configure the YAML Language Server with the official schema:

```json
{
  "yaml.schemas": {
    "https://raw.githubusercontent.com/devfile/api/v2.3.0/schemas/latest/devfile.json": "devfile.yaml"
  }
}
```

For released content, prefer the schema corresponding to the declared version rather than silently following `latest`.

Then test with the actual consumer. odo commands that read a local Devfile parse and validate it:

```bash
odo describe component -o json
```

If targeting odo, use the schema version it supports and test `odo dev` in a disposable namespace or local Podman environment. A file can be valid Devfile 2.3.0 but use a feature that a 2.2.x consumer does not implement.

## Official Documentation

- [Devfile 2.3.0 schema](https://devfile.io/docs/2.3.0/devfile-schema)
- [Creating devfiles](https://devfile.io/docs/2.3.0/create-devfiles)
- [Authoring overview](https://devfile.io/docs/2.3.0/authoring-overview)
- [Devfile validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [odo Devfile reference](https://odo.dev/docs/development/devfile/)
- [odo describe component](https://odo.dev/docs/command-reference/describe-component/)
