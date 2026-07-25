# Why odo dev Keeps Restarting-and How to Configure Reliable Hot Reload

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: odo, Devfile, Hot Reload, Kubernetes, Developer Experience

Description: Stop unnecessary odo dev process restarts by configuring hotReloadCapable honestly, narrowing synchronization, and separating source from Devfile changes.

---

`odo dev` watches a local project, synchronizes changed files to the development environment, and decides whether to rebuild or restart commands. Frequent restarts are usually not a random cluster problem. They follow two documented rules:

- if a selected build command is not `hotReloadCapable`, `odo` executes it again after source changes;
- if a selected run command is not `hotReloadCapable`, `odo` stops and starts that command again.

Marking a command hot-reload capable transfers responsibility to the application. `odo` continues to synchronize files, but it no longer reruns that command for each source change. Set the flag only when the process running in the container genuinely watches the synchronized paths and applies changes.

## The Default Restart Is Deliberate

This Devfile asks `odo` to manage rebuilding and restarting:

```yaml
schemaVersion: 2.3.0
metadata:
  name: catalog-api
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
      commandLine: npm run build
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: build
        isDefault: true
  - id: run
    exec:
      component: runtime
      commandLine: node dist/server.js
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: run
        isDefault: true
```

`node dist/server.js` does not watch source files. Restarting it after a synchronized change is correct. If that restart is slow, the solution is a real development watcher, not a false flag.

## Configure a Process That Actually Reloads

Use the framework's development mode:

```yaml
commands:
  - id: install
    exec:
      component: runtime
      commandLine: npm ci
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: build
        isDefault: true
  - id: dev-run
    exec:
      component: runtime
      commandLine: npm run dev
      workingDir: ${PROJECT_SOURCE}
      hotReloadCapable: true
      group:
        kind: run
        isDefault: true
```

This works only if `npm run dev` starts a long-lived watcher that observes the same container directory into which `odo` synchronizes files. Test the watcher directly inside its image. Some file-watch libraries need polling on remote, overlay, or networked filesystems:

```json
{
  "scripts": {
    "dev": "nodemon --legacy-watch --watch src --exec node src/server.js"
  }
}
```

That is an application-specific example, not a Devfile requirement. Use the watch settings recommended by the framework and filesystem involved.

## Mark Build and Run Independently

Build and run flags answer different questions. The build command runs before the run command during startup, so it normally must finish. Marking a build command as hot-reload capable does not turn it into a long-lived watcher; it tells `odo` not to rerun that build after later source synchronizations because the application workflow will handle them.

```yaml
commands:
  - id: install
    exec:
      component: runtime
      commandLine: npm ci
      workingDir: ${PROJECT_SOURCE}
      hotReloadCapable: true
      group:
        kind: build
        isDefault: true
  - id: dev-run
    exec:
      component: runtime
      commandLine: npm run dev
      workingDir: ${PROJECT_SOURCE}
      hotReloadCapable: true
      group:
        kind: run
        isDefault: true
```

This design is correct only if `npm run dev` handles all ordinary source changes after the initial install. A change to `package-lock.json` still requires an intentional session restart or another dependency-install mechanism; `odo` will not infer that exception from the file name.

Keep the build command non-hot when it really must run after every relevant synchronization:

```yaml
  - id: compile
    exec:
      component: runtime
      commandLine: npm run build
      workingDir: ${PROJECT_SOURCE}
      hotReloadCapable: false
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
```

Here `odo` recompiles after a change but leaves the hot-reloading server responsible for noticing the rebuilt output. If the server cannot do that, leave its flag false too so `odo` restarts it after the build.

Choose each flag from the behavior needed after synchronization, not from whether the command happens to be a build or run command. A one-shot build may be marked true when later changes are fully delegated; a long-lived run command may be marked false when it does not watch files.

## Devfile Changes Can Recreate Containers

`hotReloadCapable` governs source-change command behavior. It does not promise that the pod survives a change to `devfile.yaml`.

Changing any of these can require resource updates or container recreation:

- the container image;
- environment variables;
- resource requests or limits;
- endpoints;
- volumes or mount paths;
- component membership.

If an editor or generator rewrites `devfile.yaml` continuously, `odo` sees genuine configuration changes. Keep generated timestamps and unstable formatting out of that file. Commit it and edit it only when the environment definition changes.

Use Git to distinguish source from Devfile churn:

```bash
git diff -- devfile.yaml
```

If restarts happen immediately after a Devfile save, inspect that diff before changing hot-reload flags.

## Stop Generated Files from Triggering the Loop

By default, `odo` watches the project and excludes entries in `.odoignore`, falling back to `.gitignore` when `.odoignore` is absent. Build outputs written back into the watched local tree can trigger another synchronization cycle.

Create a focused `.odoignore`:

```text
.git/
.odo/
node_modules/
dist/
coverage/
*.log
.cache/
```

Do not blindly copy this list. If the container needs locally built `dist/`, excluding it breaks the workflow. Decide whether the host or the container owns each generated directory.

Current `odo` also supports command attributes that push selected paths rather than the entire project. For example:

```yaml
commands:
  - id: run
    attributes:
      "dev.odo.push.path:src": "src"
      "dev.odo.push.path:package.json": "package.json"
    exec:
      component: runtime
      commandLine: npm run dev
      workingDir: ${PROJECT_SOURCE}
      hotReloadCapable: true
      group:
        kind: run
        isDefault: true
```

These `dev.odo.*` attributes are odo-specific, not portable Devfile semantics. Pin and test the odo version that consumes them.

## Use Manual Push to Isolate Watch Problems

Run:

```bash
odo dev --no-watch
```

Then press `p` to synchronize a known change. If a single manual push behaves correctly but automatic mode loops, inspect ignored paths and generated files. If it still restarts, inspect the selected commands and their `hotReloadCapable` fields.

This is a diagnostic mode as well as a workflow option. It separates “the watcher detected too much” from “the command response to one legitimate change is wrong.”

## Confirm the Selected Commands

Only one default command should exist per group. A carefully configured `dev-run` has no effect if another inherited run command remains the effective default.

Inspect the component:

```bash
odo describe component
odo describe component -o json
```

You can also select an alternative command explicitly:

```bash
odo dev --run-command dev-run
```

For a build alternative:

```bash
odo dev --build-command incremental-build
```

If an explicit selection fixes the restart pattern, repair group defaults or parent overrides instead of requiring every developer to remember a flag.

## Watch the Correct Directory

Three paths must agree:

1. `sourceMapping` determines where project sources are synchronized.
2. `workingDir` determines where the command starts.
3. the framework watcher determines which paths it observes.

For example:

```yaml
components:
  - name: runtime
    container:
      image: node:22
      mountSources: true
      sourceMapping: /workspace
commands:
  - id: run
    exec:
      component: runtime
      commandLine: npm run dev
      workingDir: ${PROJECT_SOURCE}/services/catalog
      hotReloadCapable: true
```

If the watcher observes `/app/src` while files arrive below `/workspace/services/catalog`, no Devfile flag can make it reload. Print `pwd`, `$PROJECT_SOURCE`, and the framework's watched paths during diagnosis.

## A Reliable Troubleshooting Sequence

1. Run `odo dev --no-watch`.
2. Change one source file and press `p`.
3. Observe whether build or run is restarted.
4. Inspect the effective default commands.
5. Confirm each hot-reload-capable command is long-lived and watches files.
6. Compare `sourceMapping`, `workingDir`, and watcher configuration.
7. Add generated directories to `.odoignore`.
8. Check whether `devfile.yaml` itself changes.
9. Increase odo verbosity and inspect application logs.

Use:

```bash
odo dev -v 4
odo logs --dev --follow
```

Check installed command help because verbosity details can vary by release.

The stable configuration is the honest one: let `odo` restart one-shot processes, and claim hot reload only when the application owns the complete change-detection loop.

## Official Documentation

- [odo dev command reference](https://odo.dev/docs/command-reference/dev/)
- [odo architecture: How the development loop works](https://odo.dev/docs/development/architecture/how-odo-works/)
- [odo Devfile reference: Hot reloading](https://odo.dev/docs/development/devfile/#hot-reloading)
- [odo: Pushing specific source files](https://odo.dev/docs/user-guides/advanced/pushing-specific-files/)
- [Devfile 2.3 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
