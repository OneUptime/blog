# Where Should devfile.yaml Live, and Which Filenames Do Devfile Tools Recognize?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, odo, Developer Experience, YAML, Kubernetes

Description: Place and name a Devfile predictably, understand library discovery order, and avoid tools silently selecting the wrong workspace definition.

---

A Devfile is most portable when it is named `devfile.yaml` and stored at the root of the source repository that it describes. That convention lets a developer clone the repository, change into it, and run a Devfile-aware tool without supplying another path.

There is a subtle complication: the Devfile library can discover four filenames, while individual tools can expose a narrower convention or a command-specific path option. A file that a library consumer accepts is not automatically a portable filename for every Devfile tool.

## The Safe Default

Use this layout unless a tool's current documentation gives you a reason not to:

```text
payments-api/
├── devfile.yaml
├── go.mod
├── go.sum
├── cmd/
└── internal/
```

Run project commands from that directory:

```bash
cd payments-api
odo dev
```

The repository root is the useful default because relative paths in the Devfile can then be reviewed alongside the files they address:

```yaml
schemaVersion: 2.3.0
metadata:
  name: payments-api
components:
  - name: runtime
    container:
      image: golang:1.24
      mountSources: true
commands:
  - id: build
    exec:
      component: runtime
      workingDir: ${PROJECT_SOURCE}
      commandLine: go build ./...
      group:
        kind: build
        isDefault: true
```

`workingDir` is a path inside the workspace container, not a host path. The source tree represented by the repository is synchronized or mounted below `${PROJECT_SOURCE}` by the consuming tool.

## The Four Names Recognized by the Devfile Library

When the official Go library is asked to parse a directory instead of a specific file, its documented discovery priority is:

1. `devfile.yaml`
2. `.devfile.yaml`
3. `devfile.yml`
4. `.devfile.yml`

This is priority order, not a set of files to maintain in parallel. If a directory contains both `devfile.yaml` and `.devfile.yaml`, a library consumer using standard directory discovery selects `devfile.yaml`. Editing only the hidden file can therefore appear to have no effect.

Check for competing definitions explicitly:

```bash
find . -maxdepth 1 -type f \
  \( -name 'devfile.yaml' -o -name '.devfile.yaml' \
     -o -name 'devfile.yml' -o -name '.devfile.yml' \) \
  -print
```

Do not infer that every application embedding the library enables the same directory-discovery behavior. An application can pass a specific path, implement its own search, or document only one supported name.

## What odo Expects

The current `odo dev` documentation describes `odo` looking for `devfile.yaml`, and `odo init` writes a downloaded or selected stack to the working project as `devfile.yaml`. For an `odo` project, treat that spelling and location as the interface.

Initialize in the directory that should become the project root:

```bash
mkdir payments-api
cd payments-api
odo init
```

Then inspect what was created:

```bash
odo describe component -o json
```

The JSON form includes `devfilePath`, which is much better evidence than guessing which file a command selected.

`odo init --devfile-path` solves a different problem. It lets initialization fetch a Devfile from a URL or local filesystem path:

```bash
odo init \
  --name payments-api \
  --devfile-path ../platform-templates/go-service/devfile.yaml
```

That input is used to initialize the component. It does not establish a general promise that every later `odo` command accepts an arbitrarily named project Devfile in place. After initialization, keep the resulting project definition at the documented `devfile.yaml` location.

## Monorepositories Need One Deliberate Boundary per Component

A monorepository often has several independently runnable services. Placing one Devfile at the repository root can make `${PROJECT_SOURCE}` include far more source than a service needs and can make relative Dockerfile or manifest paths confusing.

Prefer a Devfile beside each independently operated component:

```text
commerce/
├── README.md
├── services/
│   ├── catalog/
│   │   ├── devfile.yaml
│   │   ├── Dockerfile
│   │   └── src/
│   └── checkout/
│       ├── devfile.yaml
│       ├── Dockerfile
│       └── src/
└── deploy/
```

Start the desired component from its root:

```bash
cd services/catalog
odo dev
```

This gives each component its own metadata name, endpoints, source synchronization boundary, and command defaults. It also makes relative paths such as `./Dockerfile` unsurprising.

If the team deliberately runs a tool from the monorepository root, confirm that tool's explicit Devfile-path support rather than relying on upward or recursive discovery. The Devfile specification defines document contents; it does not require every tool to crawl a repository looking for documents.

## Relative Paths Follow Parser and Tool Context

Several Devfile fields can refer to other content, including a parent by URI and Kubernetes or image components whose content comes from a local `uri`. Moving only `devfile.yaml` can break those references even though the YAML remains valid.

For example:

```yaml
schemaVersion: 2.3.0
metadata:
  name: payments-api
components:
  - name: production-image
    image:
      imageName: registry.example.com/payments-api
      dockerfile:
        uri: ./Dockerfile
        buildContext: .
```

Keep the Devfile, `Dockerfile`, and source context relationship stable in version control. Before moving a Devfile into a `.devfile/` or `deploy/` subdirectory, verify how the consuming tool resolves every relative URI and build context. A different working directory can also change which local files `odo dev` watches and synchronizes.

## Avoid Generated Copies That Drift

Do not keep several independently edited Devfiles for the same component:

```text
devfile.yaml
.devfile.yaml
deploy/devfile.yml
```

If environment variants are required, use one of these explicit models:

- Keep one canonical Devfile and override supported variables at invocation time.
- Use separate component directories when the workflows are genuinely independent.
- Publish a versioned parent stack and keep small child Devfiles in each repository.
- Generate a derived file in CI, but make the generated path and source of truth explicit and do not commit two files that tools can discover ambiguously.

The important property is not that every environment has identical YAML. It is that a developer and CI job can determine which document is authoritative without knowing an undocumented search rule.

## Diagnose “My Changes Are Ignored”

When a Devfile edit appears to do nothing, use this sequence:

1. Print the current directory with `pwd`.
2. List all four discoverable filenames in that exact directory.
3. Ask the tool for structured component information and inspect `devfilePath`.
4. Check for a still-running development session that must be restarted after a definition change.
5. Validate the selected file, not merely a similarly named copy elsewhere.
6. Inspect relative `uri`, `buildContext`, and source paths after any move.

For `odo`, a concise check is:

```bash
pwd
ls -la devfile.yaml .devfile.yaml devfile.yml .devfile.yml 2>/dev/null
odo describe component -o json
```

Do not “fix” selection problems by copying the same YAML into all four names. That removes the symptom temporarily while creating four sources that will diverge later.

## Repository Policy That Scales

A practical team policy can be short:

- The committed project definition is `<component-root>/devfile.yaml`.
- Devfile commands are run from `<component-root>`.
- Alternative filenames are not committed for the same component.
- Each pull request validates the canonical file using the same tool version as CI.
- A monorepository documents each component root in its top-level README.
- Parent stacks are pinned to a reviewed version instead of silently following `latest`.

This policy uses the most widely documented convention while leaving room for tools that intentionally accept explicit paths. The result is predictable discovery for people, editors, local CLIs, and CI.

## Official Documentation

- [Devfile library parsing and filename discovery](https://devfile.io/docs/2.3.0/library)
- [Devfile schema 2.3.0](https://devfile.io/docs/2.3.0/devfile-schema)
- [odo dev command reference](https://odo.dev/docs/command-reference/dev/)
- [odo init command reference](https://odo.dev/docs/command-reference/init/)
- [odo JSON output and devfilePath](https://odo.dev/docs/command-reference/json-output/)
