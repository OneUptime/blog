# How Do Files Persist Between Woodpecker Steps? Workspace, Volumes, and Artifacts Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, CI/CD, Workspace, Volumes, Artifacts

Description: Choose the correct Woodpecker storage boundary for files shared between steps, workflows, pipelines, and agents.

---

Woodpecker gives each workflow a shared workspace. On the Docker and Kubernetes backends, that workspace is a volume mounted into all of the workflow's steps. A file written there by one step is visible to later steps. Files elsewhere in a step container usually disappear with that container. Separate workflows do not share a workspace, and a new pipeline gets a new workspace.

Volumes and artifacts solve different problems. A host volume or Kubernetes PVC can persist data outside one workflow but expands the trust and portability boundary. An artifact or storage plugin deliberately uploads outputs so another workflow, pipeline, or person can retrieve them. Start by identifying how long the file must live and who must read it.

## The Four Storage Lifetimes

Use this model:

| Requirement | Mechanism |
| --- | --- |
| Later step in the same workflow | workspace |
| Repeated pipelines on a trusted agent | persistent volume or cache |
| Another workflow or agent | storage/artifact plugin |
| Human or deployment system after CI | versioned artifact repository, registry, or object store |

Using a longer-lived mechanism than necessary creates cleanup and security work. Using a shorter-lived mechanism creates mysterious missing files.

## Workspace: Shared Within One Workflow

By default, Woodpecker clones the selected commit into the workspace before normal steps. The workspace is used as each step's default working directory; on container backends, the same volume is mounted into each step.

~~~yaml
steps:
  - name: build
    image: golang:1.26
    commands:
      - mkdir -p dist
      - go build -o dist/api ./cmd/api
      - sha256sum dist/api > dist/api.sha256

  - name: verify
    image: alpine:3.22
    commands:
      - sha256sum -c dist/api.sha256
      - test -x dist/api

  - name: package
    image: alpine:3.22
    commands:
      - tar -czf dist/api.tar.gz -C dist api api.sha256
~~~

`dist/api` persists because it is under the workspace. File changes are incremental: later steps see modifications and generated output from earlier steps.

The environment variable `CI_WORKSPACE` contains the current workspace path. Use it when a tool changes directories:

~~~sh
cp /tmp/report.xml "$CI_WORKSPACE/dist/report.xml"
~~~

The temporary file itself would disappear with the container; the copy under the workspace persists.

## What Does Not Persist Automatically

On the Docker and Kubernetes backends, each step uses a separate container or Pod. These are not shared by default:

- exported shell environment variables;
- processes started in a normal, non-detached step;
- files under `/tmp`;
- a tool cache under `/root/.cache`;
- packages installed into the container image filesystem;
- changes to an image layer;
- a container's home directory.

If a later step needs a computed environment value, write a non-secret environment file or JSON document in the workspace and load it. If it needs a service during several steps, configure a Woodpecker service or detached step rather than backgrounding a process and assuming its container remains.

## Workspace Customization

On container backends, the default workspace base is `/woodpecker`, with a repository-derived path under it. It can be customized:

~~~yaml
workspace:
  base: /go
  path: src/github.com/acme/api

steps:
  - name: test
    image: golang:1.26
    commands:
      - pwd
      - go test ./...
~~~

`base` is the shared volume mount, and `path` is the relative working directory where the code is cloned. The path must be relative. The official syntax documentation also notes that containerized plugins always see the workspace base at `/woodpecker`, so unnecessary customization can break assumptions when a normal step and a plugin refer to different absolute paths.

Prefer paths relative to the working directory. Use custom workspace settings only for tools that require a specific layout.

## One Workflow Versus Multiple Workflows

Steps in one workflow share files. Workflows defined in separate files run independently, often on separate agents, and share nothing.

This does not work:

~~~text
.woodpecker/build.yaml writes dist/api.tar.gz
.woodpecker/deploy.yaml depends_on: [build]
.woodpecker/deploy.yaml reads dist/api.tar.gz
~~~

Workflow-level `depends_on` controls ordering and, by default, requires dependencies to finish successfully; it does not provide a shared filesystem. The deploy workflow gets its own clone and workspace.

Choose one of these fixes:

1. Put build and deploy steps in one workflow when sharing a workspace is appropriate.
2. Upload the build output with a storage plugin and download it in the dependent workflow.
3. Publish an immutable container image or package and pass its digest/version.
4. Rebuild deterministically in the later workflow.

For deployments, an immutable registry artifact is usually stronger than an anonymous file because it can be checksummed, retained, and promoted.

## Volumes: Persistent but Trusted and Agent-Coupled

Woodpecker lets trusted repositories mount host directories or named Docker volumes:

~~~yaml
steps:
  - name: build
    image: node:24-alpine
    volumes:
      - /var/lib/woodpecker/npm-cache:/cache/npm
    environment:
      npm_config_cache: /cache/npm
    commands:
      - npm ci
~~~

For the Docker backend, host paths must be absolute. Named volumes are also supported. The same mount can survive across pipeline workspaces, which is useful for dependency caches.

The cost is substantial:

- volumes are allowed only for trusted repositories;
- a writable host mount can expose or damage host data;
- another agent may not have the same directory;
- parallel pipelines can race;
- old data needs cleanup;
- a compromised workflow can poison shared state.

Use a dedicated cache directory, never a broad host path such as the Docker data root. Mount read-only where possible. Do not use a host volume as an undeclared artifact transport between agents.

## Kubernetes Volumes

The Kubernetes backend creates a temporary PVC for each workflow's workspace. Its size, storage class, and access mode are controlled by agent settings such as `WOODPECKER_BACKEND_K8S_VOLUME_SIZE`, `WOODPECKER_BACKEND_K8S_STORAGE_CLASS`, and `WOODPECKER_BACKEND_K8S_STORAGE_RWX`.

For an additional persistent volume, create a PVC separately, with either a pre-created or dynamically provisioned backing PV, and reference the claim by name:

~~~yaml
steps:
  - name: use-cache
    image: alpine:3.22
    volumes:
      - woodpecker-cache:/cache
    commands:
      - ls -la /cache
~~~

The official backend documentation warns that concurrent workflow use requires storage that supports `ReadWriteMany`. A node-local or `ReadWriteOnce` claim can require affinity so every relevant Pod reaches the correct node. Persistent-volume scheduling, access modes, quotas, and reclaim policy all belong to the cluster storage layer, not Woodpecker YAML alone.

When a Kubernetes step Pod is pending, inspect its PVC and StorageClass before blaming the step command.

## Artifacts: Explicit Cross-Boundary Handoff

Woodpecker does not make arbitrary workspace files available to another workflow automatically. Its workflow documentation recommends a storage plugin, such as one that writes to an S3-compatible bucket.

A robust artifact flow has:

1. a build step that writes output under the workspace;
2. a manifest containing commit SHA, size, and cryptographic checksum;
3. an upload step using a narrowly scoped secret;
4. an object key that cannot be confused across repositories, commits, or platforms;
5. a downstream download and checksum verification;
6. a retention policy.

Illustrative upload structure:

~~~yaml
steps:
  - name: package
    image: alpine:3.22
    commands:
      - mkdir -p dist
      - tar -czf dist/api.tar.gz bin/api
      - sha256sum dist/api.tar.gz > dist/api.tar.gz.sha256

  - name: upload
    image: woodpeckerci/plugin-s3:1.5.4
    settings:
      source: dist/**
      target: releases/${CI_REPO}/${CI_COMMIT_SHA}
      bucket: ci-artifacts
      access_key:
        from_secret: artifact_access_key
      secret_key:
        from_secret: artifact_secret_key
~~~

Plugin settings vary by plugin version; verify them against that plugin's official page and pin the image. The architecture—not this version-specific example—is the important part.

Do not upload `.git`, environment dumps, secret files, or an entire workspace without an allowlist.

## Persistence Across Pipelines

A new pipeline is a new execution. Workspace files from pipeline 41 should not be assumed to exist in pipeline 42, even on the same agent.

For cross-pipeline needs:

- dependency acceleration: use a cache with a content-aware key;
- release output: use a package, image, or artifact registry;
- deployment state: use the deployment system or a database, not a workspace file;
- test history: send reports to a test-results or observability service;
- generated state that belongs in source: commit it through a controlled bot workflow.

Never make correctness depend on a cache. A cold pipeline on a fresh agent must still succeed.

## Permissions and Ownership

The clone step prepares a workspace accessible to rootless step containers, but images can still create files with different owners. Symptoms include a later step failing to overwrite an earlier output.

Diagnose with:

~~~sh
id
pwd
find . -maxdepth 2 -exec stat -c '%u:%g %a %n' {} + | head -n 100
~~~

Prefer consistent non-root UIDs, use step backend user settings where appropriate, and create shared directories with intentional permissions. Avoid recursive `chmod 777` because it hides the ownership model and can expose executable content.

With `skip_clone: true`, the official syntax documentation warns that users of rootless step containers must ensure the configured workspace directory is writable by the unprivileged user, for example by locating it under `/tmp`.

## Cleanup and Integrity

For every persistent mechanism, define:

- maximum size;
- retention period;
- namespace/key format;
- concurrency behavior;
- owner;
- cleanup job;
- checksum or signature verification;
- secret exclusion rules.

Temporary workspaces are scoped to a workflow, but Docker agents can still accumulate dangling Woodpecker volumes that require host cleanup. Persistent host volumes, PVCs, buckets, and registries need their own lifecycle policies. Monitor usage so an unbounded cache does not fill the agent disk or cluster storage.

## Diagnostic Checklist

When a file is missing:

1. Confirm producer and consumer are in the same workflow.
2. Print `CI_WORKSPACE` and `pwd` in both steps.
3. Confirm the producer wrote under that workspace.
4. Check `depends_on` if DAG mode can run the consumer early.
5. Check file owner and mode.
6. For separate workflows, inspect upload and download logs.
7. For a volume, verify the exact mount and agent/node.
8. For Kubernetes, inspect PVC binding and access mode.
9. Verify artifact object key and checksum.

## Official Documentation

- [Woodpecker: Workspace and incremental file changes](https://woodpecker-ci.org/docs/usage/workflow-syntax#workspace)
- [Woodpecker: Workflow file-sharing boundary](https://woodpecker-ci.org/docs/usage/workflows)
- [Woodpecker: Volumes](https://woodpecker-ci.org/docs/usage/volumes)
- [Woodpecker: Kubernetes backend storage](https://woodpecker-ci.org/docs/administration/configuration/backends/kubernetes)
- [Woodpecker: Plugin overview](https://woodpecker-ci.org/docs/usage/plugins/overview)
- [Woodpecker: Environment variables](https://woodpecker-ci.org/docs/usage/environment)

## Conclusion

Use the workspace for files shared by steps in one workflow. Use trusted volumes only for intentional persistent state such as caches, with strict paths and cleanup. Use a versioned artifact or storage plugin when data must cross workflows, agents, or pipeline runs. Once those boundaries are explicit, missing files become a concrete path, ordering, mount, or upload problem rather than a mysterious CI behavior.
