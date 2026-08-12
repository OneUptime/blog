# How to Run Only the Changed Service in a Woodpecker Monorepo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, CI/CD, Monorepo, Path Filters, YAML

Description: Use Woodpecker workflow-level path filters to test only affected monorepo services while handling shared code and dependencies correctly.

---

A monorepo should not rebuild every service for every change, but “changed service” is a dependency question, not merely a directory-name check. Woodpecker provides `when.path` for push and pull-request events. The reliable design is one workflow per independently runnable service, filtered at workflow level, with shared files included wherever they can affect that service.

This guide targets Woodpecker 3.15 or newer. In particular, pull-request path matching considers every file changed by the pull request, and multiple workflow files have separate workspaces, so cross-workflow artifacts must be transferred through external storage.

## Start with the Repository's Impact Map

Suppose the repository looks like this:

~~~text
.
├── .woodpecker/
│   ├── billing.yaml
│   ├── catalog.yaml
│   └── frontend.yaml
├── services/
│   ├── billing/
│   └── catalog/
├── web/
├── packages/
│   └── shared/
├── package-lock.json
└── go.work
~~~

The naïve rule “billing changes when `services/billing/**` changes” misses:

- shared packages imported by billing;
- root dependency locks;
- workspace manifests;
- code-generation inputs;
- the workflow file itself;
- base images or build scripts used by several services.

Write an impact list for each service before writing YAML. A conservative extra build is cheaper than silently passing a change that should have been tested.

## Prefer One Workflow File per Service

Place directly nested YAML files in the configured workflow directory. With the default project setting, `.woodpecker/*.yaml` and `.woodpecker/*.yml` are loaded as separate workflows. Nested folders under `.woodpecker/` are ignored.

`.woodpecker/billing.yaml`:

~~~yaml
when:
  event: [push, pull_request]
  path:
    include:
      - services/billing/**
      - packages/shared/**
      - go.work
      - go.work.sum
      - .woodpecker/billing.yaml
    on_empty: false

steps:
  - name: test-billing
    image: golang:1.26
    directory: services/billing
    commands:
      - go test ./...

  - name: build-billing
    image: golang:1.26
    directory: services/billing
    commands:
      - go build ./cmd/billing
~~~

`.woodpecker/catalog.yaml`:

~~~yaml
when:
  event: [push, pull_request]
  path:
    include:
      - services/catalog/**
      - packages/shared/**
      - go.work
      - go.work.sum
      - .woodpecker/catalog.yaml
    on_empty: false

steps:
  - name: test-catalog
    image: golang:1.26
    directory: services/catalog
    commands:
      - go test ./...
~~~

Global filtering prevents an unaffected workflow from being included. That saves an agent assignment and clone for that workflow, rather than starting it only to skip every service step.

## Understand Path-Filter Scope

Woodpecker documents path conditions for `push` and `pull_request` only. Add an event condition so the policy is unambiguous. A manual or cron pipeline has no normal changed-file set and should have a separate workflow or explicit event rule.

For a pull request, Woodpecker uses all files changed in the pull request, not just files from the latest commit. This is intentional. If the first commit changes billing and a later commit changes only a README, billing still needs validation because the proposed change still contains billing code.

Empty commits make path conditions true by default. Set `on_empty: false` when an empty change should not schedule the service. If your team needs an escape hatch to test everything, configure `ignore_message`:

~~~yaml
when:
  event: [push, pull_request]
  path:
    include:
      - services/billing/**
    ignore_message: '[ALL SERVICES]'
    on_empty: false
~~~

A commit message containing the configured marker bypasses path conditions and `on_empty`. Protect that convention from accidental use in generated or squash commit messages.

## Use Doublestar Patterns Deliberately

Woodpecker path matching uses doublestar glob semantics. Repository paths are relative and use forward slashes.

- `services/billing/**` covers content recursively below the billing directory.
- `services/*/Dockerfile` covers a Dockerfile exactly one service directory deep.
- `**/*.proto` covers Protocol Buffer definitions anywhere.
- A pattern beginning with `*` should be quoted in YAML.

Avoid a pattern such as `services/billing/*` when source files live in deeper directories. Test representative paths against the documented doublestar rules and keep workflow files formatted so reviewers can see the full include set.

Exclusions should narrow known noise, not replace positive ownership:

~~~yaml
path:
  include:
    - services/billing/**
  exclude:
    - services/billing/docs/**
    - services/billing/**/*.md
~~~

If Markdown files drive generated output or examples are compiled, those exclusions are wrong. Path filters encode architecture and deserve the same review as build code.

## Model Shared-Code Fan-Out

When `packages/shared/**` changes, every consumer should run. The simplest safe implementation repeats that shared path in each consumer's include list.

For large graphs, generate workflow include lists from a checked-in ownership manifest, but validate generated YAML in review. Another option is a broad “shared change” workflow that runs an integration suite. Do not assume one shared test replaces consumer builds unless it proves binary and API compatibility for those consumers.

A practical policy has three tiers:

1. service-local change: run that service;
2. shared library or root lock change: run all known consumers;
3. CI infrastructure, base-image, or toolchain change: run all services.

Include global triggers in each workflow:

~~~yaml
path:
  include:
    - services/billing/**
    - packages/shared/**
    - build/base-images/**
    - go.work
    - go.work.sum
    - .woodpecker/billing.yaml
~~~

## Split Pull-Request and Publish Responsibilities

The same path rule can select validation and publishing, but the event and branch policy should remain explicit. A safe service workflow can test on pull requests and push only after a merge:

~~~yaml
when:
  event: [push, pull_request]
  path:
    include:
      - services/billing/**
      - packages/shared/**
      - go.work
      - go.work.sum
      - .woodpecker/billing.yaml
    on_empty: false

steps:
  - name: test
    image: golang:1.26
    commands:
      - go test ./services/billing/...

  - name: publish
    image: woodpeckerci/plugin-docker-buildx:6.1.1
    settings:
      context: services/billing
      dockerfile: services/billing/Dockerfile
      repo: registry.example.com/acme/billing
      registry: registry.example.com
      username:
        from_secret: registry_username
      password:
        from_secret: registry_password
    when:
      - event: push
        branch: main
~~~

The global path filter selects affected events. The step condition ensures pull requests never publish. Keep registry secrets unavailable to pull requests unless there is a carefully reviewed need.

The Buildx plugin starts its own Docker daemon and requires privileged execution. Pin the plugin as shown and have the Woodpecker administrator allowlist that exact image with `WOODPECKER_PLUGINS_PRIVILEGED=woodpeckerci/plugin-docker-buildx:6.1.1`.

## Coordinate Multiple Workflows with Optional Dependencies

Multiple Woodpecker workflows run independently, usually in parallel. A downstream integration or deploy workflow may need to wait for service checks that only sometimes exist in a pipeline.

Woodpecker supports optional dependencies starting in 3.15:

~~~yaml
# .woodpecker/deploy.yaml
when:
  event: push
  branch: main

depends_on:
  - name: billing
    optional: true
  - name: catalog
    optional: true
  - name: frontend
    optional: true

steps:
  - name: deploy-affected-images
    image: alpine:3.22
    commands:
      - ./scripts/deploy-affected.sh
~~~

If `billing` is present, deploy waits for it. If its path filter excluded it, that optional dependency is ignored. A required dependency on a filtered-out workflow causes the downstream workflow to be excluded, so choose required versus optional based on the actual release invariant.

The dependency name is the workflow filename without path, leading dots, or YAML extension.

## Workspaces Do Not Cross Workflow Boundaries

Steps within one workflow share a workspace, so a build output written to that workspace by one step is visible to the next. Separate workflow files do not share files. Woodpecker's workflow documentation explicitly calls this out.

If `billing.yaml` builds an archive and `deploy.yaml` needs it, use one of these designs:

- build and deploy in the same workflow;
- publish an immutable image or package in the build workflow and deploy by digest/version;
- upload/download through an object-storage plugin;
- rebuild deterministically in the downstream workflow.

Do not rely on two agents sharing a host path. It breaks on another agent, backend, or Kubernetes node and bypasses Woodpecker's workflow isolation.

## Test the Impact Matrix

Create a small table and verify each case with a pull request:

| Changed path | Billing | Catalog | Frontend |
| --- | ---: | ---: | ---: |
| `services/billing/handler.go` | yes | no | no |
| `services/catalog/main.go` | no | yes | no |
| `packages/shared/auth.go` | yes | yes | as imported |
| `go.work.sum` | yes | yes | no |
| `.woodpecker/billing.yaml` | yes | no | no |
| `docs/architecture.md` | no | no | no |

Also test:

- two services changed in one commit;
- two services changed across different commits in one pull request;
- an empty commit;
- the all-services override marker;
- a push to `main`;
- a manual run, which should use its dedicated policy.

Open each pipeline and confirm the workflow set, not just step logs.

## Operational Guardrails

Keep these checks in code review:

- Every service workflow includes its own workflow file.
- Shared dependencies list all consumers.
- Root lockfiles and toolchain definitions have deliberate ownership.
- Pull-request workflows do not receive publishing secrets.
- Optional dependencies are used only where omission is safe.
- Glob changes include tests demonstrating representative paths.
- Repository Project settings still points to the workflow directory with a trailing slash when a custom directory is used.

As the monorepo grows, review the impact map periodically. Stale path filters are a form of missing test coverage.

## Official Documentation

- [Woodpecker: Path conditions and workflow syntax](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Woodpecker: Multiple workflows and optional dependencies](https://woodpecker-ci.org/docs/usage/workflows)
- [Woodpecker: Project pipeline-path resolution](https://woodpecker-ci.org/docs/usage/project-settings)
- [Woodpecker: Environment variables and changed files](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker: Secret event filters](https://woodpecker-ci.org/docs/usage/secrets)
- [Woodpecker: Docker Buildx plugin](https://woodpecker-ci.org/plugins/docker-buildx)
- [Woodpecker: Server plugin privilege configuration](https://woodpecker-ci.org/docs/administration/configuration/server#plugins_privileged)
- [doublestar pattern documentation](https://github.com/bmatcuk/doublestar)

## Conclusion

Run only affected monorepo services by filtering separate workflows at global level, not by scattering skip logic through one giant workflow. Include shared code, root locks, toolchain inputs, and the workflow file in each service's impact set. Use optional workflow dependencies for conditionally present checks, and move artifacts through an explicit store because separate workflows do not share a workspace.
