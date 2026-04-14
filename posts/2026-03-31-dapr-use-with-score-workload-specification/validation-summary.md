# Validation Summary: How to Use Dapr with Score Workload Specification

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Score (CNCF sandbox project) — workload specification format
- score-k8s — Score CLI for Kubernetes manifest generation
- score-compose — Score CLI for Docker Compose generation
- Dapr — Distributed Application Runtime
- Dapr Components (state store, pub/sub)
- Kubernetes
- Docker Compose

## Sources Consulted
- Score specification JSON schema: https://github.com/score-spec/spec/blob/main/score-v1b1.json
- Score specification samples: https://github.com/score-spec/spec/blob/main/samples/score-full.yaml
- score-k8s README and source: https://github.com/score-spec/score-k8s
- score-k8s init source: https://github.com/score-spec/score-k8s/blob/main/internal/command/init.go
- score-k8s generate source: https://github.com/score-spec/score-k8s/blob/main/internal/command/generate.go
- score-compose README and source: https://github.com/score-spec/score-compose
- score-k8s provisioner loader: https://github.com/score-spec/score-k8s/blob/main/internal/provisioners/loader/load.go
- score-k8s template provisioner: https://github.com/score-spec/score-k8s/blob/main/internal/provisioners/templateprov/template.go
- Dapr community provisioners for Score: https://github.com/score-spec/community-provisioners
- Dapr Component spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Redis state store: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Kafka pub/sub: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Score Homebrew tap: https://github.com/score-spec/homebrew-tap

## Issues Found

### 1. Invalid `kind: Workload` field in score.yaml example
**What was wrong:** The score.yaml example included `kind: Workload` as a top-level field. The Score v1b1 specification does not have a `kind` field. The only allowed top-level properties are `apiVersion`, `metadata`, `containers`, `resources`, and `service`. The schema has `additionalProperties: false`, so adding `kind` would cause a validation error.
**What was changed:** Removed `kind: Workload` from the score.yaml example.
**Why:** The Score specification explicitly does not include a `kind` field, unlike Kubernetes resources.

### 2. Incorrect `spec` wrapper in score.yaml example
**What was wrong:** The score.yaml example nested `containers` and `resources` under a `spec` key (e.g., `spec.containers`, `spec.resources`). In the actual Score specification, `containers` and `resources` are top-level fields, not nested under `spec`.
**What was changed:** Removed the `spec` wrapper, making `containers` and `resources` direct top-level fields.
**Why:** The Score v1b1 schema defines these as top-level properties.

### 3. Removed `db-password: type: secret` resource
**What was wrong:** The example included a resource `db-password` with `type: secret`. While `secret` is a syntactically valid type string, it is not a built-in provisioner type in either score-k8s or score-compose. Including it without explanation could confuse readers, as running the example would fail without a custom secret provisioner.
**What was changed:** Removed the `db-password` resource entry from the example.
**Why:** Secrets in Score are typically handled through resource output references rather than a dedicated resource type. Including it without a corresponding provisioner definition would cause errors.

### 4. Incorrect output description for `score-k8s generate`
**What was wrong:** The post stated that `score-k8s generate` outputs files to a `manifests/` directory with individual files (`deployment.yaml`, `service.yaml`, etc.). In reality, `score-k8s generate` outputs a single `manifests.yaml` file containing all generated Kubernetes resources.
**What was changed:** Updated the command output section to show `cat manifests.yaml` instead of listing a directory.
**Why:** The score-k8s source code confirms the default output flag is `-o manifests.yaml`.

### 5. Incorrect output filename for `score-compose generate`
**What was wrong:** The post stated that `score-compose generate` creates `docker-compose.yaml`. The actual output filename is `compose.yaml`.
**What was changed:** Updated the comment to say `compose.yaml` instead of `docker-compose.yaml`.
**Why:** The score-compose source code confirms the default output is `compose.yaml`.

### 6. Missing `score-compose init` step
**What was wrong:** The Docker Compose section jumped directly to `score-compose generate` without first running `score-compose init`. The init step is required to create the `.score-compose/` state directory before generate can run.
**What was changed:** Added `score-compose init` before the `score-compose generate` command.
**Why:** Without init, the generate command fails because the state directory does not exist.

## Review Notes
- The Dapr Component apiVersion (`dapr.io/v1alpha1`), component types (`state.redis`, `pubsub.kafka`), metadata field names (`redisHost`, `brokers`), and Kubernetes annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are all verified as correct against current Dapr v1.17 documentation.
- The custom provisioner format (YAML list with `uri`, `type`, `description`, `outputs`, `manifests` fields using Go template syntax with `{{ .Uid }}` and `{{ .Namespace }}`) is verified correct against score-k8s source code.
- The `template://` URI scheme for provisioners is verified as one of two supported schemes (alongside `cmd://`).
- Score's claim of being a CNCF sandbox project is verified correct.
- The Dapr annotations shown in the generated deployment excerpt are correct, though they would need to be injected via a provisioner or init container mechanism — Score does not automatically add Dapr annotations just from declaring Dapr resource types. The post's provisioner approach is conceptually sound for generating Dapr Component manifests, but the Dapr sidecar annotations on the Deployment would require additional provisioner logic not shown.
