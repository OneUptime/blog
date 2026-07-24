# PROJECT_SOURCE and workingDir: Understanding Devfile Source Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, odo, Source Synchronization, Containers, Kubernetes

Description: Understand PROJECT_SOURCE, PROJECTS_ROOT, sourceMapping, and workingDir so Devfile commands run against the intended synchronized source tree.

---

Many Devfile command failures that look like missing dependencies or broken build scripts are path failures. The source may be synchronized successfully, but the command starts in a directory that does not contain the expected `package.json`, `pom.xml`, `go.mod`, or Makefile.

Devfile provides two special source-path variables:

- `${PROJECTS_ROOT}` is the directory under which project sources are mounted.
- `${PROJECT_SOURCE}` points to one project source. With multiple projects, the specification defines it as the first project's source directory.

A command's `workingDir` is a path inside the selected component's container. It is not a host path and is not relative to the directory from which the developer launched `odo`.

## Start with a Portable Command

For a single-project repository, this is the portable pattern:

```yaml
schemaVersion: 2.3.0
metadata:
  name: catalog-api
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
  - id: start
    exec:
      component: runtime
      commandLine: npm run dev
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: run
        isDefault: true
```

The consuming tool expands `${PROJECT_SOURCE}` before running the command. The image does not need to define that variable itself, although the tool can also inject it into the container environment.

Use the brace form in YAML because it makes the boundary clear when a suffix follows:

```yaml
workingDir: ${PROJECT_SOURCE}/services/catalog
```

Both `$PROJECT_SOURCE` and `${PROJECT_SOURCE}` appear in official examples. Consistency within a Devfile helps reviewers distinguish special variables from literal paths.

## How `mountSources` and `sourceMapping` Relate

A container component controls whether the project source is available:

```yaml
components:
  - name: runtime
    container:
      image: golang:1.24
      mountSources: true
      sourceMapping: /workspace
```

`mountSources: true` asks the consumer to mount or synchronize project sources into this component. `sourceMapping` optionally selects the container path used as the projects root. The Devfile schema's default is `/projects` when `sourceMapping` is omitted.

For current `odo` behavior, a component with the example above receives values equivalent to:

```text
PROJECTS_ROOT=/workspace
PROJECT_SOURCE=/workspace
```

for a single local source tree. `odo` synchronizes the current directory into that location. This is one-way synchronization from the developer machine into the development pod. Files excluded by `.odoignore`, or by `.gitignore` when `.odoignore` is absent, are not copied.

Do not hardcode `/projects` and also set `sourceMapping: /workspace`:

```yaml
# Fragile: this ignores sourceMapping.
workingDir: /projects
```

Use `${PROJECT_SOURCE}` for commands that belong to the main project and `${PROJECTS_ROOT}` when the command intentionally operates across the projects root.

## `workingDir` Selects a Directory, Not a Source

Setting `workingDir` does not copy source code and does not mount a volume. These are separate concerns:

```yaml
components:
  - name: runtime
    container:
      image: python:3.13
      mountSources: false
commands:
  - id: run
    exec:
      component: runtime
      commandLine: python app.py
      workingDir: ${PROJECT_SOURCE}
```

This is internally contradictory for tools such as `odo`: the command expects a project path in a component where sources are not mounted. `odo` requires at least one container component with source mounting enabled to synchronize project files, and a command must target a component that can actually see the files it uses.

For a database sidecar, disabling source mounts is appropriate:

```yaml
components:
  - name: runtime
    container:
      image: node:22
      mountSources: true
  - name: database
    container:
      image: postgres:17
      mountSources: false
```

Application build and run commands should target `runtime`, not `database`.

## Monorepositories Need an Explicit Subdirectory

If `devfile.yaml` lives at the monorepository root, `${PROJECT_SOURCE}` normally identifies the synchronized repository root. Point commands at the service directory:

```yaml
commands:
  - id: build-catalog
    exec:
      component: runtime
      commandLine: npm ci && npm run build
      workingDir: ${PROJECT_SOURCE}/services/catalog
      group:
        kind: build
        isDefault: true
```

Keep the path relative to the repository boundary represented by the Devfile. Avoid a command such as `cd /workspace/catalog && ...`; putting the location in `workingDir` lets tools and reviewers understand the command's execution context.

If each service has its own Devfile, place it at the service root and return to `workingDir: ${PROJECT_SOURCE}`. This reduces the source synchronization set and makes `.odoignore` simpler.

## Multiple Projects Change the Meaning

The schema supports `projects` and `dependentProjects`. Their Git definitions can include a remote, checkout revision, and clone directory. With multiple projects, `${PROJECT_SOURCE}` points to the first project rather than serving as a stable alias for every repository.

For a workspace with explicit projects:

```yaml
projects:
  - name: storefront
    git:
      remotes:
        origin: https://github.com/example/storefront.git
  - name: shared-ui
    git:
      remotes:
        origin: https://github.com/example/shared-ui.git
commands:
  - id: test-shared-ui
    exec:
      component: runtime
      commandLine: npm test
      workingDir: ${PROJECTS_ROOT}/shared-ui
```

Use `${PROJECTS_ROOT}/<project-directory>` when addressing a non-first project. Confirm how the selected consumer chooses clone directories, especially if a project sets `clonePath`. Do not assume array reordering is harmless: it can change what `${PROJECT_SOURCE}` denotes.

## Build Context Paths Are a Different Layer

An image component also has paths:

```yaml
components:
  - name: production-image
    image:
      imageName: registry.example.com/catalog-api
      dockerfile:
        uri: ./Containerfile
        buildContext: ${PROJECT_SOURCE}
```

Here, `buildContext` tells the image builder which source context to send. It is not an `exec.workingDir`. Likewise, `dockerfile.uri` locates the Dockerfile or Containerfile. Keep the three concepts separate:

- source mounting determines where project files appear in a development container;
- `exec.workingDir` selects where an in-container command starts;
- image `buildContext` and Dockerfile URI configure an image build.

## Diagnose a Path Failure from Inside the Component

First describe the effective component:

```bash
odo describe component
odo describe component -o json
```

Then run a diagnostic command defined in the Devfile:

```yaml
commands:
  - id: inspect-source
    exec:
      component: runtime
      commandLine: >-
        printf 'root=%s\nsource=%s\n' "$PROJECTS_ROOT" "$PROJECT_SOURCE";
        pwd;
        find "$PROJECT_SOURCE" -maxdepth 2 -type f | head -50
      workingDir: ${PROJECT_SOURCE}
```

Run it with the tool's explicit command facility, for example:

```bash
odo run inspect-source
```

If the path exists but files are absent, inspect `.odoignore` and `.gitignore`. If the path is wrong, compare `sourceMapping`, `mountSources`, and the command's target component. If only a monorepo service is missing, verify the relative service path and the directory from which `odo dev` was started.

## Keep Paths Portable

Before merging a Devfile:

- use the current schema version supported by the consumer;
- enable source mounting only on components that need it;
- use `${PROJECT_SOURCE}` rather than a consumer's default literal path;
- use `${PROJECTS_ROOT}/name` for deliberately selected secondary projects;
- make monorepo subdirectories explicit;
- keep image build contexts distinct from command working directories;
- test from a clean clone so an untracked local directory cannot hide a mistake.

Path portability comes from declaring relationships, not from guessing where a particular cluster implementation happens to mount a volume.

## Official Documentation

- [Devfile 2.3 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile 2.3: Creating Devfiles](https://devfile.io/docs/2.3.0/create-devfiles)
- [odo Devfile reference and special variables](https://odo.dev/docs/development/devfile/)
- [odo architecture: project source synchronization](https://odo.dev/docs/development/architecture/how-odo-works/)
- [odo: Pushing specific source files](https://odo.dev/docs/user-guides/advanced/pushing-specific-files/)

