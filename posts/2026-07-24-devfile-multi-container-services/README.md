# Designing Multi-Container and Multi-Service Devfiles Without Component Conflicts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Devfile, Containers, Kubernetes, Microservices, Developer Environments

Description: Structure multi-container Devfile 2.3 environments with unique identities, valid endpoints, explicit commands, shared storage, and realistic resource limits.

---

A multi-container Devfile can place an API, worker, test utility, database proxy, or mock service in one reproducible development environment. The YAML is easy to expand, but every added component joins global namespaces for component names, command IDs, endpoint names, ports, and volume references.

The safest design starts with explicit ownership:

- A component owns a runtime image, source mount, endpoints, environment, and resources.
- An `exec` command names the one container in which it runs.
- A volume component owns shared storage; containers only mount it.
- A default composite command can coordinate several service processes.
- Networking assumptions are recorded separately from the portable Devfile structure.

This approach avoids a Devfile that validates as isolated snippets but fails when flattened and consumed as one environment.

## Build a conflict-free component inventory

Before writing YAML, sketch the environment:

| Component | Purpose | Source | Endpoint | Resources |
| --- | --- | --- | --- | --- |
| `api` | HTTP application | Mounted | `api-http:8080` | 250m/1 CPU, 256Mi/768Mi |
| `worker` | Background jobs | Mounted | None | 100m/500m CPU, 128Mi/512Mi |
| `payments-mock` | Local dependency | Mounted | `payments-http:9090` | 100m/500m CPU, 128Mi/384Mi |
| `npm-cache` | Shared dependency cache | Not applicable | None | 1Gi volume |

Names and IDs in Devfile 2.3 follow Kubernetes-style lowercase naming rules. More importantly, component names must be unique across the whole resolved Devfile. A container named `api` conflicts with a volume, image, or inherited component also named `api`.

Use names that describe ownership, not generic sequence numbers. `payments-mock` is easier to trace from an endpoint or command error than `container-2`.

## A complete multi-container example

The following example gives every runtime a distinct port and coordinates two application processes plus one mock service:

```yaml
schemaVersion: 2.3.0
metadata:
  name: orders-development

variables:
  PAYMENTS_URL: http://127.0.0.1:9090

components:
  - name: api
    container:
      image: node:22-bookworm-slim
      mountSources: true
      command: ["tail"]
      args: ["-f", "/dev/null"]
      cpuRequest: 250m
      cpuLimit: "1"
      memoryRequest: 256Mi
      memoryLimit: 768Mi
      endpoints:
        - name: api-http
          targetPort: 8080
      env:
        - name: PORT
          value: "8080"
        - name: PAYMENTS_URL
          value: "{{PAYMENTS_URL}}"
      volumeMounts:
        - name: npm-cache
          path: /home/node/.npm

  - name: worker
    container:
      image: node:22-bookworm-slim
      mountSources: true
      command: ["tail"]
      args: ["-f", "/dev/null"]
      cpuRequest: 100m
      cpuLimit: 500m
      memoryRequest: 128Mi
      memoryLimit: 512Mi
      env:
        - name: PAYMENTS_URL
          value: "{{PAYMENTS_URL}}"
      volumeMounts:
        - name: npm-cache
          path: /home/node/.npm

  - name: payments-mock
    container:
      image: node:22-bookworm-slim
      mountSources: true
      command: ["tail"]
      args: ["-f", "/dev/null"]
      cpuRequest: 100m
      cpuLimit: 500m
      memoryRequest: 128Mi
      memoryLimit: 384Mi
      endpoints:
        - name: payments-http
          targetPort: 9090
      env:
        - name: PORT
          value: "9090"

  - name: npm-cache
    volume:
      size: 1Gi

commands:
  - id: install-api
    exec:
      component: api
      commandLine: npm ci
      workingDir: ${PROJECT_SOURCE}/services/api

  - id: install-worker
    exec:
      component: worker
      commandLine: npm ci
      workingDir: ${PROJECT_SOURCE}/services/worker

  - id: build-all
    composite:
      commands:
        - install-api
        - install-worker
      parallel: true
      group:
        kind: build
        isDefault: true

  - id: start-api
    exec:
      component: api
      commandLine: npm run dev
      workingDir: ${PROJECT_SOURCE}/services/api

  - id: start-worker
    exec:
      component: worker
      commandLine: npm run dev
      workingDir: ${PROJECT_SOURCE}/services/worker

  - id: start-payments-mock
    exec:
      component: payments-mock
      commandLine: node server.js
      workingDir: ${PROJECT_SOURCE}/tools/payments-mock

  - id: run-services
    composite:
      commands:
        - start-api
        - start-worker
        - start-payments-mock
      parallel: true
      group:
        kind: run
        isDefault: true
```

The leaf `exec` commands deliberately have no groups. The composite commands own the default `build` and `run` behavior. This avoids three competing default run commands and gives the consumer one clear entry point for the environment.

Composite command IDs and their referenced command IDs must be unique. A composite cannot reference itself, directly or through another composite, and every referenced command must exist.

## Treat endpoint names and ports as global constraints

Devfile 2.3 validation requires endpoint names to be unique across components. These two endpoints conflict even though their containers differ:

```yaml
# Invalid: duplicate endpoint name
components:
  - name: api
    container:
      image: example/api
      endpoints:
        - name: http
          targetPort: 8080

  - name: payments
    container:
      image: example/payments
      endpoints:
        - name: http
          targetPort: 9090
```

Prefix endpoint names with the owning service, such as `api-http` and `payments-http`.

Target ports also have a cross-container rule. Two normal container components cannot declare the same `targetPort`. It is not enough that they have different endpoint names:

```yaml
# Invalid for ordinary container components
- name: frontend
  container:
    image: example/frontend
    endpoints:
      - name: frontend-http
        targetPort: 8080

- name: backend
  container:
    image: example/backend
    endpoints:
      - name: backend-http
        targetPort: 8080
```

Change one service's listen port. The Devfile 2.3 schema also defines `dedicatedPod: true` to request a separate pod, and the published validation rules describe an exemption from the cross-component target-port restriction for such containers. However, the Devfile API v2.3.0 reference validator still compares target ports for every container without checking `dedicatedPod`, and the companion Devfile library did not implement dedicated-pod generation. For a portable 2.3 Devfile, keep target ports unique unless the selected consumer explicitly documents and tests support for the exemption.

Where a consumer implements `dedicatedPod`, do not use it only to avoid renumbering. It changes scheduling, networking, storage, startup, and resource behavior. Make that architectural choice deliberately.

The uniqueness rule is more nuanced within one container: Devfile validation permits two endpoints in the same container to use the same target port. That can represent multiple ways of exposing one listener, although consumer behavior must still be tested.

## Mount source only where it is needed

`mountSources: true` gives a container access to project sources and makes `PROJECTS_ROOT` and `PROJECT_SOURCE` useful to its commands. Set it explicitly on each component that builds or runs source. The 2.3 schema defaults it to `true` for ordinary containers but to `false` for `dedicatedPod` containers, so an explicit value keeps a later topology change from silently removing source access. A database or prebuilt utility that never reads the repository normally does not need it.

Avoid assuming that mounting source into several containers creates independent copies. Consumers typically map the same source tree into each selected container. Two commands writing generated files into that tree can race. Give each service a separate build directory, serialize conflicting build steps, or move safe shared artifacts to a volume.

An `exec` command must point to a valid container component. A typo such as `component: payments_mock` will not resolve to `payments-mock`.

## Share volumes by reference

A volume is a component with its own unique name. Every `volumeMounts[].name` must reference that component. Multiple containers can mount the same volume, which is useful for dependency caches or data intentionally exchanged between processes.

Shared does not mean synchronized or concurrency-safe. The applications must tolerate simultaneous access. Package caches are often better candidates than mutable databases or compiled output. Mount paths are container-local, so the same volume may appear at different paths in different components, but using consistent paths reduces surprises.

The `ephemeral` field defaults to `false`; setting it to `true` means the volume is not stored persistently across restarts. The consumer and platform still determine how a non-ephemeral volume, its requested size, and its eventual lifecycle are realized. Never use a development volume as the only copy of important data.

## Keep networking assumptions consumer-aware

The Devfile endpoint schema describes a listener and exposure intent. It does not give every consumer one universal service-discovery contract.

The example defaults `PAYMENTS_URL` to `127.0.0.1` because it assumes the three ordinary containers share the main development pod's network namespace. That assumption must be tested with the selected consumer. If a consumer runs `payments-mock` in a dedicated pod, localhost is wrong; the URL must use a Service or another address created by the platform workflow.

Likewise, an endpoint name is not automatically a portable DNS hostname. odo may create Services and local forwards differently from an IDE-backed DevWorkspace. Parameterizing the URL with a Devfile variable keeps the topology visible and overrideable. In an archived odo v3 environment, the override looked like this:

```bash
odo dev --var PAYMENTS_URL=http://payments-service:9090
```

For a supported consumer, use its current variable and networking mechanism. Do not embed a cluster-specific Service name and then describe the Devfile as universally portable.

## Budget resources for the whole environment

Each container can declare `cpuRequest`, `cpuLimit`, `memoryRequest`, and `memoryLimit`. Requests must not exceed their corresponding limits, and values must use valid Kubernetes quantity syntax.

Resource planning is cumulative. Three modest containers can create a pod that no developer namespace can schedule. Start with measured runtime and debugger usage, include build spikes, and add all requests before publishing the Devfile.

Where supported, dedicated pods change the scheduling calculation: each pod must fit independently, while ordinary co-located containers contribute to one pod's total. Missing values may be inferred by the consumer or platform, which makes explicit, realistic values preferable for shared stacks.

## Review the flattened environment

Before publishing:

- Confirm component names, command IDs, and endpoint names are globally unique.
- Confirm container endpoint target ports are unique unless the chosen consumer demonstrably supports the documented `dedicatedPod` exemption.
- Confirm every `exec.component`, composite subcommand, and volume mount resolves.
- Confirm no group kind has more than one default command; if multiple commands share a group kind, select exactly one default.
- Use a default composite when several processes must start together.
- Confirm source-writing commands cannot corrupt shared mounts.
- Verify resource requests are valid, do not exceed limits, and are schedulable in aggregate.
- Test service addresses with the actual Devfile consumer.
- Recheck conflicts after parent inheritance and overrides are flattened.

A multi-container Devfile works best as an explicit process graph, not a pile of container snippets. Unique identities make it valid, composite commands make it operable, and consumer-aware networking and storage assumptions make it dependable.

## Official Documentation

- [Devfile 2.3 validation rules](https://devfile.io/docs/2.3.0/devfile-validation-rules)
- [Devfile 2.3 schema](https://devfile.io/docs/2.3.0/devfile-schema)
- [Devfile 2.3: Adding a container component](https://devfile.io/docs/2.3.0/adding-a-container-component)
- [Devfile 2.3: Defining endpoints](https://devfile.io/docs/2.3.0/defining-endpoints)
- [Devfile 2.3: Adding a volume component](https://devfile.io/docs/2.3.0/adding-a-volume-component)
- [Devfile 2.3: Limiting resource usage](https://devfile.io/docs/2.3.0/limiting-resources-usage)
- [Devfile 2.3: Adding an exec command](https://devfile.io/docs/2.3.0/adding-an-exec-command)
- [Devfile 2.3: Adding a composite command](https://devfile.io/docs/2.3.0/adding-a-composite-command)
- [Archived odo v3 `odo dev` reference](https://odo.dev/docs/command-reference/dev/)
