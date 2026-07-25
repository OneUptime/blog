# Devfile Lifecycle Events Explained: preStart, postStart, and postStop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, Lifecycle Events, Kubernetes, Automation, Developer Environments

Description: Use Devfile preStart, postStart, preStop, and postStop with the command types allowed by schema 2.3 and consumer-aware cleanup design.

---

Devfile 2.3 defines four lifecycle event bindings:

- `preStart` runs before the workspace starts;
- `postStart` runs after it starts;
- `preStop` runs before it stops;
- `postStop` runs after it stops.

Each event contains command IDs, but the command type is not arbitrary. The official Devfile 2.3 validation rules divide the events into two pairs:

| Event | Allowed command |
| --- | --- |
| `preStart` | `apply` |
| `postStart` | `exec` |
| `preStop` | `exec` |
| `postStop` | `apply` |

A composite follows the same rule for its directly listed commands. Every member of a composite used by `preStart` or `postStop` must be an apply command. Every member used by `postStart` or `preStop` must be an exec command. Because a nested composite is itself a composite rather than an apply or exec command, do not nest composites bound to lifecycle events.

This distinction prevents a common mistake: putting a shell command directly in `preStart` or `postStop`. It may resemble examples for an older tool version, but it is invalid under the Devfile 2.3 validation rules.

## A Valid Four-Phase Example

The following structure uses Kubernetes components for apply-stage work and a tools container for exec-stage work:

```yaml
schemaVersion: 2.3.0
metadata:
  name: payments-api
components:
  - name: tools
    container:
      image: registry.example.com/dev/payment-tools:1.8
      mountSources: true
  - name: bootstrap-resources
    kubernetes:
      uri: dev/bootstrap.yaml
      deployByDefault: false
  - name: cleanup-job
    kubernetes:
      uri: dev/cleanup-job.yaml
      deployByDefault: false
commands:
  - id: apply-bootstrap
    apply:
      component: bootstrap-resources
  - id: initialize-running-workspace
    exec:
      component: tools
      commandLine: ./scripts/initialize-dev-workspace.sh
      workingDir: ${PROJECT_SOURCE}
  - id: unregister-running-workspace
    exec:
      component: tools
      commandLine: ./scripts/unregister-dev-workspace.sh
      workingDir: ${PROJECT_SOURCE}
  - id: apply-cleanup-job
    apply:
      component: cleanup-job
events:
  preStart:
    - apply-bootstrap
  postStart:
    - initialize-running-workspace
  preStop:
    - unregister-running-workspace
  postStop:
    - apply-cleanup-job
```

`deployByDefault: false` makes the lifecycle command the deliberate application path for each Kubernetes component. Exact component lifecycle behavior still depends on the consumer, so test the same tool and version developers use.

## `preStart` Is for Apply Commands

An apply command references a valid container, Kubernetes, OpenShift, or image component:

```yaml
components:
  - name: bootstrap-resources
    kubernetes:
      uri: dev/bootstrap.yaml
      deployByDefault: false
commands:
  - id: apply-bootstrap
    apply:
      component: bootstrap-resources
events:
  preStart:
    - apply-bootstrap
```

This is suitable for resources the environment needs before normal startup. Keep the applied content deterministic and retry-safe. A previous interrupted start may have created some or all of it, so Kubernetes manifests should support declarative re-application.

This version is invalid:

```yaml
commands:
  - id: initialize-cache
    exec:
      component: tools
      commandLine: mkdir -p /cache
events:
  preStart:
    - initialize-cache
```

The command ID exists, but its type does not satisfy the `preStart` event rule. Move shell initialization to `postStart`, or model the pre-start operation as an apply component supported by the consumer.

Devfile's apply-command schema notes that applying a container from a pre-start event can run it as an init container in a Kubernetes workspace pod, unless `dedicatedPod` changes that arrangement. This is consumer-sensitive; do not infer identical implementation from every Devfile tool.

## `postStart` Is for Exec Commands

After the workspace exists, an exec command can run in a named container:

```yaml
commands:
  - id: initialize-running-workspace
    exec:
      component: tools
      commandLine: ./scripts/initialize-dev-workspace.sh
      workingDir: ${PROJECT_SOURCE}
events:
  postStart:
    - initialize-running-workspace
```

Good post-start work includes:

- seeding disposable development data;
- warming a development cache;
- registering a temporary callback;
- generating workspace-local configuration from non-secret inputs.

“Post-start” does not necessarily mean every application dependency is healthy. If a script needs a service, use a bounded readiness loop and return a useful nonzero exit code:

```bash
#!/usr/bin/env sh
set -eu

attempt=0
until curl --fail --silent http://database-proxy:8080/ready >/dev/null; do
  attempt=$((attempt + 1))
  [ "$attempt" -lt 30 ] || {
    echo "database proxy did not become ready" >&2
    exit 1
  }
  sleep 2
done

./scripts/seed-dev-data.sh
```

Make the action idempotent. A consumer can recreate or restart an environment, and developers can interrupt an operation after only some side effects complete.

## `postStop` Is an Apply Stage

`postStop` occurs after the workspace stops and accepts apply commands:

```yaml
components:
  - name: cleanup-job
    kubernetes:
      uri: dev/cleanup-job.yaml
      deployByDefault: false
commands:
  - id: apply-cleanup-job
    apply:
      component: cleanup-job
events:
  postStop:
    - apply-cleanup-job
```

One practical model is a Kubernetes Job manifest that performs bounded, independently authenticated cleanup after the workspace containers are gone. Do not point `postStop` at an exec command in the stopped tools container; schema 2.3 prohibits that command type, and the container is no longer a sound execution target.

Post-stop processing must tolerate absence. A machine can lose power, a cluster can become unavailable, or an administrator can delete resources outside the normal consumer workflow. Critical cleanup needs another control, such as:

- expiring leases;
- owner references and Kubernetes garbage collection;
- a controller that reconciles orphaned external resources;
- TTLs on cleanup Jobs;
- periodic namespace cleanup.

Treat `postStop` as a useful lifecycle action, not the sole guarantee that sensitive or costly resources disappear.

## `preStop` Is the Shell-Cleanup Stage

When cleanup must run inside the still-running workspace, use an exec command under `preStop`:

```yaml
commands:
  - id: unregister-running-workspace
    exec:
      component: tools
      commandLine: ./scripts/unregister-dev-workspace.sh
      workingDir: ${PROJECT_SOURCE}
events:
  preStop:
    - unregister-running-workspace
```

This is the right place to flush a buffer, deregister a callback, or release a lease using tools available in the development container. It remains best-effort for the same interruption reasons. The script should succeed when the registration is already absent and must never print credentials.

Use `preStop` and `postStop` for different dependencies:

- `preStop` can access the running workspace container and its mounted state;
- `postStop` must be modeled as apply work after that environment is stopped.

## Composites Must Be Type-Homogeneous for Events

A pre-start apply pipeline is valid:

```yaml
commands:
  - id: apply-config
    apply:
      component: bootstrap-config
  - id: apply-database
    apply:
      component: development-database
  - id: apply-prerequisites
    composite:
      commands:
        - apply-config
        - apply-database
      parallel: false
events:
  preStart:
    - apply-prerequisites
```

A post-start exec pipeline is also valid:

```yaml
commands:
  - id: migrate
    exec:
      component: tools
      commandLine: ./scripts/migrate-dev-db.sh
      workingDir: ${PROJECT_SOURCE}
  - id: seed
    exec:
      component: tools
      commandLine: ./scripts/seed-dev-db.sh
      workingDir: ${PROJECT_SOURCE}
  - id: prepare-data
    composite:
      commands:
        - migrate
        - seed
      parallel: false
events:
  postStart:
    - prepare-data
```

Do not mix `apply-config` and `migrate` in one event-bound composite. Even if their ordering seems useful, the flattened Devfile fails the event rule because the composite contains different command types.

Use `parallel: true` only when all members are independent. Parallel cleanup that modifies the same external object or shared volume can introduce races.

## Events and Command Groups Are Different

Groups classify build, run, test, debug, and deploy commands. `isDefault: true` identifies the default entrypoint for a group:

```yaml
commands:
  - id: run
    exec:
      component: tools
      commandLine: npm run dev
      workingDir: ${PROJECT_SOURCE}
      group:
        kind: run
        isDefault: true
```

Events bind commands to environment lifecycle. Putting the same side-effecting command in a default group and an event can run it twice when a consumer handles both paths.

Keep the roles clear:

- groups describe user or tool workflows;
- events describe environment startup and shutdown transitions.

## Validate the Flattened Devfile

Parent inheritance can change command definitions and event references. Devfile validation occurs after parent overrides are merged, so review the effective document.

Check:

1. every event ID names a real command;
2. `preStart` and `postStop` resolve only to apply commands;
3. `postStart` and `preStop` resolve only to exec commands;
4. event-bound composites contain only the allowed command type;
5. every apply command references a valid component;
6. every exec command references a valid container;
7. scripts are retry-safe and have bounded waits;
8. the chosen consumer implements the event being used.

Schema support and consumer support are separate. A Devfile can be valid 2.3 while a particular tool implements only part of the lifecycle surface. Record the tested consumer version and avoid relying on unsupported hooks for correctness.

## Official Documentation

- [Devfile 2.3 validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Devfile 2.3 schema reference](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile 2.3: Adding an apply command](https://devfile.io/docs/2.3.0/adding-an-apply-command)
- [Devfile 2.3: Adding event bindings](https://devfile.io/docs/2.3.0/adding-event-bindings)
