# How to Run Buildkite Setup and Teardown Once per Build

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Kubernetes, Automation, DevOps

Description: Use explicit Buildkite setup and cleanup steps for shared resources, with idempotent provisioning and recovery for retries and cancellations.

---

Putting shared environment provisioning in a `pre-command` hook runs it for every command job. A build with ten jobs can provision the environment ten times, potentially on ten different agents. A corresponding cleanup hook can also destroy the environment while another job still needs it.

Use explicit setup and cleanup steps to model one logical resource lifecycle per build. Then make the operations idempotent, because retries and lost agents mean a distributed CI system cannot promise that an external action executes exactly once.

## Distinguish job hooks from build orchestration

Buildkite's [hook documentation](https://buildkite.com/docs/agent/hooks) states that command jobs run independently and their job hooks execute per job. Agent startup and shutdown hooks belong to an agent process, which may serve many builds; they are not build-wide setup and teardown hooks either.

Hooks are appropriate for preparing or cleaning a job's own local state. A shared test namespace, database, or preview environment needs an owner represented in the pipeline graph.

Start with a setup job, make all consumers depend on it, and make cleanup depend on every consumer. The dependency list is the lifecycle contract.

## Define one setup and one cleanup step

For a build that shares a Kubernetes namespace between two test suites:

```yaml
steps:
  - label: "Prepare shared test namespace"
    key: prepare-tests
    command: "bash .buildkite/scripts/prepare-tests.sh"

  - label: "API integration tests"
    key: api-integration
    depends_on: prepare-tests
    command: "bash .buildkite/scripts/api-integration.sh"

  - label: "Worker integration tests"
    key: worker-integration
    depends_on: prepare-tests
    command: "bash .buildkite/scripts/worker-integration.sh"

  - label: "Remove shared test namespace"
    key: cleanup-tests
    depends_on:
      - prepare-tests
      - api-integration
      - worker-integration
    allow_dependency_failure: true
    command: "bash .buildkite/scripts/cleanup-tests.sh"
```

All relevant agents need an approved Kubernetes context and permissions scoped to the intended test cluster. They do not need a shared local disk, because the resource lives in the cluster.

Including setup in the cleanup dependency list makes the ordering explicit even when setup fails and its consumers never run. The cleanup code must tolerate partial or absent provisioning.

## Make resource identity deterministic

Create `.buildkite/scripts/prepare-tests.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${BUILDKITE_BUILD_ID:?Missing build ID}"
namespace="ci-${BUILDKITE_BUILD_ID}"

kubectl create namespace "$namespace" --dry-run=client -o yaml |
  kubectl apply -f -
kubectl label namespace "$namespace" \
  ci.example.com/managed-by=buildkite \
  "ci.example.com/build-id=${BUILDKITE_BUILD_ID}" --overwrite
buildkite-agent meta-data set tests/namespace "$namespace"
```

The build UUID gives retries the same logical namespace rather than creating a new one each time. `kubectl create --dry-run=client -o yaml` generates the object, and `kubectl apply` reconciles it. Add your application installation and readiness checks after namespace creation.

The setup job should publish usable state only after the relevant readiness checks succeed. If you record the namespace before installing workloads, consumers still remain protected by the setup dependency, but metadata alone does not indicate readiness.

Do not use metadata existence as a distributed lock. Two concurrent jobs can both observe an absent key and provision resources. The explicit single producer and the external system's idempotent operations provide the useful guarantees here.

## Consume the shared environment deliberately

Each integration script can retrieve the namespace:

```bash
#!/usr/bin/env bash
set -euo pipefail

export TEST_NAMESPACE
TEST_NAMESPACE=$(buildkite-agent meta-data get tests/namespace)
kubectl get namespace "$TEST_NAMESPACE"
./scripts/run-integration-tests.sh
```

The final command is the repository's test runner, configured to use `TEST_NAMESPACE`. Give parallel suites separate database names, service instances, or test data when they would otherwise interfere. Sharing one namespace does not make application state safe for concurrent mutation.

Add new consumers to the cleanup dependencies when the workflow expands. A missing dependency can let cleanup begin while a late-added suite is still running.

## Make cleanup safe to repeat

Create `.buildkite/scripts/cleanup-tests.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${BUILDKITE_BUILD_ID:?Missing build ID}"
namespace="ci-${BUILDKITE_BUILD_ID}"
kubectl delete namespace "$namespace" --ignore-not-found --wait=false
```

Deriving the name from the build ID allows cleanup to find a partially created namespace even when setup failed before publishing metadata. `--ignore-not-found` makes an already removed namespace harmless.

The asynchronous delete request does not prove every resource has disappeared. Inspect terminating namespaces and finalizers through a separate operational check. If your workflow requires confirmed deletion before completion, wait with an appropriate timeout and report a timeout distinctly.

## Account for cancellation and lost workers

`allow_dependency_failure` supports cleanup after failures, but Buildkite documents that canceled dependencies prevent the dependent step from running. A canceled build can therefore leave this namespace behind.

Add an external cleanup process that identifies managed resources by labels, checks the associated build state or an explicit expiration policy, and removes abandoned environments. Give it narrow permissions and avoid treating every old-looking namespace as safe to delete.

A retry of setup after cleanup also needs an intentional policy. Recreating the same namespace may be useful for rerunning tests, but a namespace still terminating cannot immediately be reused. Wait for deletion or start a new build when that provides a clearer lifecycle.

## Verify the lifecycle

Exercise successful tests, a failing test, setup failing after namespace creation, and a canceled build. Confirm which cleanup path runs in each case, and verify the external recovery path for cancellation.

Repeat cleanup and setup in a disposable test cluster to prove their idempotent behavior. Pipeline syntax checks alone cannot validate Kubernetes access, application readiness, or resource deletion.

## Conclusion

Model one logical setup and teardown in the build graph, and make external operations safe to retry. Job hooks cannot provide build-wide ownership, and cancellation still requires an independent recovery path.

## Official Documentation

- [Buildkite hook lifecycle](https://buildkite.com/docs/agent/hooks)
- [Dependency failure and cancellation behavior](https://buildkite.com/docs/pipelines/configure/depends-on)
- [kubectl create namespace](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/)
- [kubectl delete](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/)
