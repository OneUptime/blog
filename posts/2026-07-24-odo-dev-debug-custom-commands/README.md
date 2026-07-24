# Debugging a Devfile Application with odo dev --debug and Custom Debug Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, odo, Debugging, Kubernetes, Developer Experience

Description: Configure a Devfile debug command and endpoint, run the archived odo v3 debug workflow, attach an IDE, and separate application logs from tool diagnostics.

---

> **Lifecycle notice:** Red Hat deprecated the odo CLI on October 23, 2025, and ended maintenance, security updates, and technical support on March 31, 2026. The workflow below is for teams maintaining existing odo v3 environments. Use a supported Devfile consumer for new platform investments.

`odo dev --debug` does not transform an ordinary run command into a debugger. It asks odo v3 to use the Devfile command whose group is `debug`, while the Devfile author remains responsible for starting the language runtime in debug mode and declaring the port on which that runtime listens.

A working setup has four connected parts:

1. A container with the source and debugger runtime.
2. An `exec` command in the `debug` group.
3. A container endpoint for the debug port.
4. A local debugger attached to odo's forwarded local port.

If any one is missing, the pod can be healthy while the IDE still cannot attach.

## Define run and debug as different commands

The following Devfile 2.3 excerpt uses Node.js, but the structure also applies to Java, Python, Go, and other runtimes:

```yaml
schemaVersion: 2.3.0
metadata:
  name: orders-api

components:
  - name: runtime
    container:
      image: node:22-bookworm-slim
      mountSources: true
      command: ["tail"]
      args: ["-f", "/dev/null"]
      endpoints:
        - name: http
          targetPort: 3000
        - name: node-debug
          exposure: none
          targetPort: 9229
      env:
        - name: DEBUG_PORT
          value: "9229"

commands:
  - id: install
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
      commandLine: npm start
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: run
        isDefault: true

  - id: debug-node
    exec:
      component: runtime
      commandLine: node --inspect=0.0.0.0:${DEBUG_PORT} server.js
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: debug
        isDefault: true
```

An `exec` command must reference an existing container component. `commandLine` is the process odo executes inside that container, and `workingDir` points it at the synchronized project. `mountSources: true` makes the project sources available to the component.

The long-running container entrypoint is intentional. odo executes the build and debug commands in an already-running development container. If a custom container `command` or `args` exits immediately, the development environment never becomes stable enough for odo to start the debug process.

## Make exactly one debug command the default

Devfile command groups include `build`, `run`, `test`, `debug`, and `deploy`. Validation allows only one default command for each kind. For the normal workflow, mark exactly one debug command with:

```yaml
group:
  kind: debug
  isDefault: true
```

When invoked without `--debug`, odo uses the default `run` command. With `--debug`, odo substitutes the default `debug` command for `run`; an optional default build command still runs first.

You can keep another debugger profile as a non-default command:

```yaml
  - id: debug-node-break
    exec:
      component: runtime
      commandLine: node --inspect-brk=0.0.0.0:${DEBUG_PORT} server.js
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: debug
```

This second command pauses before executing application code, which is useful when a breakpoint must catch startup. Do not mark both debug commands as default.

The archived odo v3 `dev` reference documents alternative `--build-command` and `--run-command` flags, but not a corresponding `--debug-command` selector. Do not build automation around an invented flag. For a stable team default, change which Devfile debug command has `isDefault: true`. For an occasional manual command, start the resources with `odo dev --no-commands` and run a named command from another terminal:

```bash
odo run debug-node-break
```

For an `exec` command, `odo run` requires an active `odo dev` session and executes inside the container created by that session.

## Declare the debug port as an endpoint

The runtime must listen on a known container port, and the container component must declare that port as an endpoint. In the example, the process and endpoint agree on `9229`.

Use `exposure: none` for a debugger unless the consumer requires something else. A debugger port generally needs local forwarding, not a public route. Authentication and transport security vary by debugger, so exposing it to a shared network is an unnecessary risk.

Listening only on `127.0.0.1` inside the container is a common cause of failed attachment. A forwarded connection enters the container's network namespace and often needs the debug server to bind to `0.0.0.0`. Keep the endpoint non-public and let the local forward be the boundary.

The application endpoint and debug endpoint serve different clients:

- `http` carries normal application traffic.
- `node-debug` carries the debugger protocol.

An HTTP response from port 3000 proves nothing about the debugger on port 9229.

## Start odo in debug mode

With an authenticated cluster context and a valid Devfile in the project directory, run:

```bash
odo dev --debug
```

odo reads and validates the Devfile, creates the development resources, synchronizes source, runs the default build command when present, and runs the default debug command instead of the default run command. It also establishes port forwarding for declared endpoints.

By default, odo can assign available local ports. Read the forwarding lines printed in the terminal rather than assuming the local and container ports match. The archived state file under `.odo/` also records forwarded-port information.

For predictable IDE configuration, request explicit local mappings:

```bash
odo dev --debug \
  --port-forward 3000:runtime:3000 \
  --port-forward 9229:runtime:9229
```

The three-part format is:

```text
LOCAL_PORT:CONTAINER_NAME:CONTAINER_PORT
```

It is especially useful when several containers use the same internal port. The `--port-forward` option can be repeated. odo's `--random-ports` option cannot be combined with explicit mappings.

Keep the session terminal open. The v3 workflow is tied to the running `odo dev` process. Pressing Ctrl-C stops the session and removes the resources that odo created for it.

## Attach the IDE to the forwarded port

After the output confirms a mapping such as:

```text
Forwarding from 127.0.0.1:9229 -> 9229
```

configure the IDE for a remote attach:

- Host: `127.0.0.1`
- Port: `9229`
- Debugger type: the protocol started by `commandLine`
- Local source root: the project directory on the workstation
- Remote source root: the location represented by `${PROJECT_SOURCE}` in the container

The debugger type must match the runtime flags. A Java debugger cannot attach to a Node inspector, and a debug adapter expecting "listen" mode cannot connect when both sides are waiting to accept a connection.

If breakpoints appear unbound even though the port connects, compare the source path reported by the runtime with the path in the IDE. Source maps, compiled output, and a mismatched local-to-remote path mapping are more likely causes than Kubernetes networking at that point.

## Separate application logs from odo diagnostics

The terminal running `odo dev --debug` primarily reports orchestration: resource creation, file synchronization, command selection, restarts, and port forwarding. It is the first place to look for a missing default command or failed sync.

Application output belongs to the containers. In another terminal, use:

```bash
odo logs --dev --follow
```

The archived `odo logs` command prefixes output with container names and can follow all containers created by the development session. This is where to look for a syntax error, an occupied debug port, a missing package, or a runtime that exits just after startup.

If the application looks healthy but odo itself behaves unexpectedly, increase the CLI's diagnostic logging:

```bash
ODO_LOG_LEVEL=3 odo dev --debug
```

`ODO_LOG_LEVEL` controls odo's own log level and takes precedence over its verbosity flag. Do not confuse those tool diagnostics with the application's stdout and stderr.

## Troubleshoot in dependency order

Debug failures are faster to isolate from the inside out:

1. **Validate selection.** Confirm there is one default command with `kind: debug`, and that it is an `exec` command pointing to the intended container.
2. **Check the process.** Use `odo logs --dev --follow` to verify the debugger starts and remains running.
3. **Check the bind address.** Confirm the debug server listens on the container port and an address reachable through forwarding.
4. **Check the endpoint.** Confirm its `targetPort` exactly matches the runtime flag or `DEBUG_PORT`.
5. **Check the mapping.** Read odo's output or use `odo describe component` to inspect forwarded ports.
6. **Check the local socket.** Make sure another process is not occupying the chosen local port.
7. **Check the protocol.** Confirm the IDE uses the correct debugger type and attach mode.
8. **Check source paths.** Fix local and remote path mapping when attachment succeeds but breakpoints do not bind.

Also inspect resource limits when the debugger exits under load. Debug runtimes can use more memory than normal run mode. Devfile's `memoryRequest`, `memoryLimit`, `cpuRequest`, and `cpuLimit` belong on the container component, with every request less than or equal to its corresponding limit.

## Plan beyond odo

The Devfile concepts in this article remain useful: a debug command, a container endpoint, a stable source path, and an attach client. The odo-specific orchestration is now historical. Red Hat's end-of-life notice recommends moving new inner-loop workflows to supported alternatives, including OpenShift Dev Spaces for standardized development environments and Podman or Podman Desktop for local container work.

Preserve the portable Devfile command and endpoint intent, but test how the replacement consumer chooses commands, forwards ports, mounts source, exposes logs, and manages lifecycle. Those behaviors are consumer responsibilities, not guarantees made solely by the Devfile schema.

## Official Documentation

- [Devfile 2.3 schema](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile 2.3 validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Devfile 2.3: Adding an exec command](https://devfile.io/docs/2.3.0/adding-an-exec-command)
- [Archived odo v3 `odo dev` reference](https://odo.dev/docs/command-reference/dev/)
- [Archived odo v3 `odo run` reference](https://odo.dev/docs/command-reference/run/)
- [Archived odo v3 `odo logs` reference](https://odo.dev/docs/command-reference/logs/)
- [Archived odo v3 migration guide for debugging](https://odo.dev/docs/user-guides/v3-migration-guide/)
- [Red Hat's odo deprecation and end-of-life notice](https://developers.redhat.com/products/odo)
