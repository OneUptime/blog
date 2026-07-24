# Speeding Up odo dev for Projects with Large Dependency Trees

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: odo, Devfile, Performance, Kubernetes, Developer Experience

Description: Reduce odo dev sync and rebuild latency by trimming watched files, narrowing pushes, caching dependencies, and designing honest hot reloads.

---

`odo dev` can provide a tight edit-run-debug loop against Kubernetes, but its defaults become expensive when a repository contains hundreds of thousands of dependency, build, or generated files. The delay is rarely caused by one thing. File discovery, synchronization, dependency installation, compilation, container restarts, and cluster scheduling can all contribute.

There is also an important lifecycle caveat. Red Hat announced odo's deprecation effective October 23, 2025, and the official GitHub repository was archived on April 1, 2026. The guidance below is for teams maintaining pinned, existing odo v3 workflows. Treat performance work as a way to stabilize those workflows while evaluating a migration path, not as evidence that odo is still actively maintained.

odo v3 documents support for Devfile 2.2.0, while the current Devfile documentation is version 2.3. Use `schemaVersion: 2.2.0` in Devfiles that must remain compatible with odo and consult the 2.3 specification for the continuing Devfile model. Do not silently raise the schema version without testing the exact consumer that will read it.

## Understand the work behind one edit

When `odo dev` starts, it reads and validates the Devfile, creates development resources, synchronizes the project, executes the default build and run or debug commands, and establishes port forwarding. It then watches the local filesystem. A changed file may trigger another sync, a build command, and a restart of a command that is not hot-reload capable.

That sequence suggests a useful measurement model:

1. Time startup until resources are ready.
2. Time the initial source transfer.
3. Time dependency restoration and the initial build.
4. Time a small source-only edit.
5. Time an intentional dependency-manifest edit.

Measure those cases independently. For example, run `odo dev --no-watch`, record the startup timing printed by odo, then press `p` to push a controlled batch of changes. `--no-watch` is also a practical working mode when a generator rewrites many files at once. Set `ODO_LOG_LEVEL=3` when additional diagnostic output is needed; this environment variable takes precedence over the `-v` flag.

Do not optimize only the first launch. Developers usually experience the source-only edit path hundreds of times more often.

## Keep dependency trees out of source synchronization

By default, odo recursively synchronizes the current directory into the container. It excludes paths listed in `.odoignore`; when that file is absent, it falls back to `.gitignore`. A project that accidentally sends `node_modules`, `.venv`, `vendor`, Maven build output, or compiler caches pays for file scanning and transfer on nearly every change.

A Node.js repository might begin with:

```text
# .odoignore
.git
.odo
node_modules
coverage
dist
.cache
*.log
```

The `.odoignore` file replaces `.gitignore`; the two lists are not merged. Copy all relevant `.gitignore` entries into it. Include `.odo` explicitly because odo writes local state there, and watching that directory can create a synchronization loop. odo excludes `.git` by default. Avoid `--sync-git-dir` in a large repository unless the process inside the container genuinely needs Git metadata.

The same principle applies outside JavaScript:

- Python environments and wheel caches should be created in the container, not copied from the workstation.
- Java dependency caches belong in a mounted Maven or Gradle cache, while `target` and `build` stay excluded.
- Go module and build caches should be container-side; a locally vendored tree should be synchronized only when it is deliberately part of the source contract.

This is not only a speed improvement. Host-built dependencies can contain native binaries for the wrong operating system or architecture.

## Allowlist the source that a command needs

Ignore files remove known noise. For a monorepo, an allowlist can be more reliable. odo supports implementation-specific command attributes named `dev.odo.push.path:<local-path>`. Each attribute maps a path relative to the local project root to a path relative to the remote project directory:

```yaml
schemaVersion: 2.2.0
metadata:
  name: checkout-api
components:
  - name: tools
    container:
      image: registry.example.com/dev/node:20
      mountSources: true
      endpoints:
        - name: http
          targetPort: 3000
commands:
  - id: run-api
    attributes:
      "dev.odo.push.path:apps/checkout-api": "apps/checkout-api"
      "dev.odo.push.path:packages/shared": "packages/shared"
      "dev.odo.push.path:package-lock.json": "package-lock.json"
      "dev.odo.push.path:package.json": "package.json"
    exec:
      component: tools
      commandLine: npm run --workspace apps/checkout-api dev -- --host 0.0.0.0
      workingDir: ${PROJECT_SOURCE}
      hotReloadCapable: true
      group:
        kind: run
        isDefault: true
```

This keeps unrelated applications and artifacts out of the transfer. If the team also uses debug mode, put the relevant push attributes on the debug command too. They are command-specific, so a carefully constrained run path does not automatically constrain a different command.

Allowlisting introduces a maintenance responsibility. When the application begins importing another workspace package, add it to the mapping and verify it in CI or a documented smoke test. A fast sync that omits required source is not a correct optimization.

At least one container must have `mountSources: true` for source synchronization. Confirm that the command's `workingDir` agrees with the mapped remote layout rather than compensating with fragile shell copies.

## Cache downloads without synchronizing installed dependencies

Devfile volume components can persist package-manager downloads independently of the project source. Mount the cache where the package manager expects it:

```yaml
components:
  - name: tools
    container:
      image: registry.example.com/dev/node:20
      mountSources: true
      memoryLimit: 2Gi
      volumeMounts:
        - name: npm-cache
          path: /home/user/.npm
  - name: npm-cache
    volume:
      size: 1Gi
```

The corresponding run command can restore dependencies from the lockfile before starting the long-running watcher:

```yaml
commands:
  - id: run
    exec:
      component: tools
      commandLine: npm ci --cache /home/user/.npm && npm run dev -- --host 0.0.0.0
      workingDir: ${PROJECT_SOURCE}
      hotReloadCapable: true
      group:
        kind: run
        isDefault: true
```

Here, `npm ci` runs once when the command starts, not after every source edit. The cache avoids downloading every package again. A lockfile change still needs an intentional dependency refresh, such as restarting the session or exposing a separate install command and invoking it with `odo run`.

Devfile volumes are non-ephemeral by default, whereas odo's `Ephemeral` preference changes the project-sources volume between persistent and ephemeral storage. Do not assume either setting is a backup. A cache can survive a Pod replacement while its owning resources still exist, but cleanup and component deletion can remove it. Lockfiles and reproducible package sources remain authoritative.

## Make the command contract match reality

`hotReloadCapable: true` tells odo not to rerun the command after changes. It does not add hot reload to the application. A long-running run or debug command should use it only when its process watches the synchronized files and rebuilds or reloads them itself.

A build command normally completes before the run command starts. Marking that one-shot build as hot-reload capable can still be valid, but only when the later application process handles every relevant source change; the flag delegates subsequent change handling instead of turning the build command into a watcher. Otherwise, odo can leave stale output. Conversely, leaving a genuine watcher unmarked causes unnecessary restarts.

If the Devfile has a default build command, inspect what it does on every edit. A command such as `rm -rf build && npm ci && npm run build` defeats incremental tooling. Separate dependency restoration from ordinary compilation, preserve compiler caches, and let the run process handle source-only changes when it can. Keep the slower dependency-manifest path explicit instead of forcing every edit through it.

Container resources matter as well. Large TypeScript, Java, or Rust graphs can look like synchronization problems when the actual bottleneck is CPU throttling or memory pressure. Set realistic requests and limits in the container component, observe Pod events and usage, and compare results before increasing them broadly.

## Use a repeatable performance check

After each change, run the same small experiment:

```bash
ODO_LOG_LEVEL=3 odo dev --no-watch
```

Then edit one leaf source file, press `p`, and record the time until the application reports that it is ready. Repeat with a shared-library edit and a lockfile edit. Confirm that ignored output is absent from the remote project directory and that every required package is present.

If local container execution is relevant to the team, `odo dev --platform podman` can help separate Kubernetes scheduling and network costs from sync and command costs. It is not inherently faster, and it does not replace testing on the target cluster, but the comparison can identify which portion of the loop deserves attention.

Finally, commit the Devfile, ignore rules, and benchmark procedure together. The best-performing configuration is one whose source contract is understandable and reproducible by the next developer—not one that relies on an undocumented cache left behind by a previous session.

## Official Documentation

- [odo deprecation announcement](https://odo.dev/blog/odo-deprecation-announcement/)
- [odo dev command reference](https://odo.dev/docs/command-reference/dev/)
- [How odo works](https://odo.dev/docs/development/architecture/how-odo-works/)
- [Pushing specific files with odo](https://odo.dev/docs/user-guides/advanced/pushing-specific-files/)
- [Configuring odo preferences](https://odo.dev/docs/overview/configure/)
- [Devfile 2.3 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
- [Archived odo GitHub repository](https://github.com/redhat-developer/odo)
