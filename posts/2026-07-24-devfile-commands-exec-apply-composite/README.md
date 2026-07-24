# Devfile Commands: exec, apply, composite, Groups, and Execution Order

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, odo, Kubernetes, Automation, Developer Experience

Description: Design Devfile exec, apply, and composite commands with clear groups, defaults, dependencies, and consumer-aware execution order.

---

Devfile commands describe operations a development tool can expose or automate. A command has a unique `id` and exactly one command kind:

- `exec` runs a command line in a container component;
- `apply` applies a component definition;
- `composite` invokes other command IDs sequentially or concurrently.

Commands can also belong to a group: `build`, `run`, `test`, `debug`, or `deploy`. The group expresses intent; the consuming tool decides when to select it. For example, current `odo dev` uses development groups, while `odo deploy` searches for the default command in the `deploy` group.

## `exec`: Run in a Named Container

An `exec` command needs a `component` and `commandLine`:

```yaml
schemaVersion: 2.3.0
metadata:
  name: inventory-api
components:
  - name: runtime
    container:
      image: node:22
      mountSources: true
commands:
  - id: install
    exec:
      component: runtime
      commandLine: npm ci
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: build
        isDefault: true
```

The component reference must name a container component that exists in the effective Devfile. `workingDir` is inside that container. Optional `env` entries apply while running the command, and `hotReloadCapable` tells a supporting consumer whether the process can react to synchronized source changes without being restarted.

Keep shell behavior explicit. `commandLine` is a string, so chaining and error propagation are properties of the shell used by the consumer and image. For a multi-step operation, prefer a checked script in the repository:

```yaml
commandLine: ./scripts/dev-build.sh
```

That makes `set -eu`, platform-specific tooling, and tests reviewable outside a long YAML scalar.

## `apply`: Materialize a Component

An `apply` command points to a component:

```yaml
components:
  - name: app-manifest
    kubernetes:
      uri: deploy/app.yaml
commands:
  - id: apply-app
    apply:
      component: app-manifest
```

The exact effect follows the component type and consumer. Applying a Kubernetes component creates the declared Kubernetes resources. Applying an image component asks a supporting tool to build and push the image. An apply command bound to a lifecycle event can also control when a container is initialized.

`apply` does not contain an arbitrary shell line. Use `exec` for Helm, Kustomize, database migration clients, or other executables, and ensure their binary exists in the referenced container image.

Be deliberate about automatic application. Current odo documentation distinguishes component types: image components use `autoBuild`, while Kubernetes and OpenShift components use `deployByDefault`. When either setting is omitted and no apply command references that component, odo applies it automatically; an explicit `false` leaves an unreferenced component unapplied. Once an apply command references the component, that command provides its execution path. Other consumers can behave differently, so verify the exact tool and version used by the team.

## `composite`: Build a Command Graph

A composite references command IDs:

```yaml
commands:
  - id: install
    exec:
      component: runtime
      commandLine: npm ci
      workingDir: ${PROJECT_SOURCE}
  - id: generate
    exec:
      component: runtime
      commandLine: npm run generate
      workingDir: ${PROJECT_SOURCE}
  - id: build
    composite:
      commands:
        - install
        - generate
      parallel: false
      group:
        kind: build
        isDefault: true
```

With `parallel: false` or when `parallel` is omitted, the command list is ordered. `generate` starts after `install` completes. Use sequential execution whenever a step consumes output from an earlier one.

Set `parallel: true` only for independent operations:

```yaml
  - id: verify
    composite:
      commands:
        - unit-test
        - lint
      parallel: true
      group:
        kind: test
        isDefault: true
```

Parallel subcommands must not mutate the same cache, build directory, database, or Kubernetes object without coordination. Completion order is then intentionally unspecified.

Keep composites acyclic. A composite that references itself, directly or through another composite, cannot produce a meaningful execution order. Every referenced ID must exist after parent inheritance and overrides are resolved.

## Groups Select Workflow Entrypoints

Groups are metadata on the command kind:

```yaml
commands:
  - id: run-development
    exec:
      component: runtime
      commandLine: npm run dev
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: run
        isDefault: true
```

There should be at most one default command for each group kind in the effective Devfile. Multiple non-default alternatives are useful:

```yaml
  - id: run-with-postgres
    exec:
      component: runtime
      commandLine: npm run dev -- --profile=postgres
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: run
        isDefault: false
```

With current `odo`, the default run command is selected by `odo dev`, while an alternative can be selected with:

```bash
odo dev --run-command run-with-postgres
```

Do not rely on array position to choose the default. Express it with `isDefault`.

## Understand `odo dev` Ordering

For its documented development flow, `odo` synchronizes source, then executes the selected default build command, and then starts the selected run command. Debug mode selects a debug command when `odo dev --debug` is used. Support for every schema feature is tool- and version-specific, so treat the Devfile specification and the selected consumer documentation as two required contracts.

A practical inner-loop definition is:

```yaml
schemaVersion: 2.3.0
metadata:
  name: inventory-api
components:
  - name: runtime
    container:
      image: node:22
      mountSources: true
      endpoints:
        - name: http
          targetPort: 3000
commands:
  - id: build
    exec:
      component: runtime
      commandLine: npm ci
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: build
        isDefault: true
  - id: run
    exec:
      component: runtime
      commandLine: npm run dev
      workingDir: ${PROJECT_SOURCE}
      hotReloadCapable: true
      group:
        kind: run
        isDefault: true
  - id: debug
    exec:
      component: runtime
      commandLine: npm run debug
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: debug
        isDefault: true
```

The order comes from `odo`'s workflow and group selection. It is not a general specification promise that every consumer will execute all group kinds identically.

## Build a Deterministic Deploy Command

Devfile 2.2 and later support the `deploy` group. A common `odo deploy` graph builds an image and then applies its manifest:

```yaml
variables:
  CONTAINER_IMAGE: registry.example.com/inventory-api
components:
  - name: production-image
    image:
      imageName: "{{CONTAINER_IMAGE}}"
      dockerfile:
        uri: ./Dockerfile
        buildContext: ${PROJECT_SOURCE}
  - name: production-manifest
    kubernetes:
      uri: deploy/app.yaml
commands:
  - id: build-image
    apply:
      component: production-image
  - id: apply-manifest
    apply:
      component: production-manifest
  - id: deploy
    composite:
      commands:
        - build-image
        - apply-manifest
      parallel: false
      group:
        kind: deploy
        isDefault: true
```

Sequential order is essential: the image must be available before the workload can pull it. If a manifest uses `{{CONTAINER_IMAGE}}`, confirm the consumer performs variable substitution in Kubernetes content.

## Separate Lifecycle Events from Group Selection

The `events` object binds command IDs to workspace lifecycle stages such as `preStart`, `postStart`, and `preStop`. An event binding is not the same as assigning a command to `build` or `run`.

```yaml
events:
  postStart:
    - warm-cache
```

Use events for environment lifecycle work and groups for user-facing build, run, test, debug, and deployment workflows. Reusing one command in both paths can execute it twice if the consumer selects the group and fires the event.

## Review the Effective Graph

Before publishing:

1. Validate the YAML against the declared schema version.
2. Resolve parent overrides and inspect the flattened Devfile.
3. Ensure every `exec.component` and `apply.component` exists.
4. Ensure every composite and event command ID exists.
5. Detect composite cycles.
6. Confirm one default per group kind.
7. Verify sequential dependencies are not marked parallel.
8. Test with the exact consumer version used by developers.

Devfile command design becomes predictable when IDs define the graph, groups define entrypoints, and ordering is made explicit only where dependencies require it.

## Official Documentation

- [Devfile 2.3 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile 2.3: Creating Devfiles](https://devfile.io/docs/2.3.0/create-devfiles)
- [odo Devfile reference](https://odo.dev/docs/development/devfile/)
- [odo dev command reference](https://odo.dev/docs/command-reference/dev/)
- [odo deploy command reference](https://odo.dev/docs/command-reference/deploy/)
