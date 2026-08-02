# How to Preserve and Retrieve Argo Workflow Logs After Pods Are Deleted

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, Logging, Pod Garbage Collection, Workflow Archive, Artifact Repository, Observability

Description: Preserve Argo Workflow logs beyond Pod deletion with a Kubernetes log backend or Argo archive logs, then retrieve them through indexed queries, the UI, or artifact APIs.

---

`kubectl logs` reads a Pod's container log through the Kubernetes API and kubelet. Once that Pod is deleted, Kubernetes no longer provides that log. Argo can retain Workflow status and node metadata, but status is not a copy of every container's standard output.

The important consequence is simple: **log preservation must be configured before Pod deletion**. If the Pod is already gone and no external collector or Argo log artifact captured its output, the log cannot be reconstructed from the Workflow object.

There are two supported operational patterns:

- send Pod logs to a Kubernetes-aware logging system, which Argo's documentation recommends for production;
- enable Argo's `archiveLogs` convenience feature, which stores container logs in the configured artifact repository and lets the Argo UI display logs for garbage-collected Pods.

You can use both. A dedicated backend provides search, retention, access controls, and aggregation, while Argo log artifacts give operators a convenient workflow-centric fallback.

## Know What Each Retention Feature Keeps

Several settings sound similar but preserve different objects:

| Feature | What it retains | Does it retain container log text? |
| --- | --- | --- |
| `podGC` | Controls when completed Workflow Pods are deleted | No |
| `podGC.deleteDelayDuration` | Delays a Pod after it becomes eligible for deletion | No, but gives collectors more time |
| `ttlStrategy` | Deletes completed Workflow custom resources after a delay | No |
| Workflow archive | Persists Workflow status and node history in a database | No |
| `archiveLogs` | Saves container logs as artifacts | Yes |
| External log backend | Collects and indexes Pod/container logs | Yes |

The official Workflow Archive documentation is explicit that archived Workflow records do not include job logs. Enabling database persistence alone solves audit and history retention, not log retention.

## Recommended Pattern: Ship Logs Before Pod GC

Run a cluster log collector that watches container log files and attaches Kubernetes metadata before sending records to durable storage. Argo's archive-log documentation suggests facilities such as Fluentd with ELK or Promtail with Loki and Grafana; the same design applies to other Kubernetes-aware collectors and backends.

Preserve at least these fields as indexed labels or searchable attributes:

- Kubernetes namespace;
- Pod name and container name;
- `workflows.argoproj.io/workflow` label;
- Workflow UID if your enrichment pipeline records owner references or labels it explicitly;
- template or node display name where available;
- cluster identifier;
- event timestamp.

The Workflow label makes a durable query possible even after the Pod object disappears. For example, a Loki-style query might conceptually filter by namespace and Workflow label:

```text
{namespace="workflows", workflows_argoproj_io_workflow="daily-report-x7m4p"}
```

The exact normalized label name depends on the collector's Kubernetes metadata mapping. Confirm it from an actual record instead of assuming dots and slashes are transformed in one particular way.

### Give the collector time to finish

Aggressive Pod deletion can race with log collection, especially for short tasks. Delay deletion without retaining Pods indefinitely:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: retained-logs-
spec:
  entrypoint: main
  podGC:
    strategy: OnPodCompletion
    deleteDelayDuration: 10m
  templates:
    - name: main
      container:
        image: alpine:3.23
        command: [sh, -c]
        args:
          - |
            echo "starting report"
            echo "report complete"
```

`OnPodCompletion` makes each completed Pod eligible for garbage collection, while `deleteDelayDuration` keeps it for ten additional minutes. This is a delivery buffer, not a log-retention policy. The external backend's retention settings determine how long the copied records survive.

If the collector is routinely ten minutes behind, investigate its health and backpressure rather than continually increasing the delay. Monitor for missing tail records and compare the last application timestamp with the Pod's completion time.

### Add log-backend links to the Argo UI

Argo Server supports custom `workflow` and `pod-logs` links. A controller configuration can direct users from a Workflow or node to a pre-filtered logging view:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: workflow-controller-configmap
  namespace: argo
data:
  config: |
    links:
      - name: Workflow Logs
        scope: workflow
        target: _blank
        url: >-
          https://logs.example.com/workflow
          ?namespace=${metadata.namespace}
          &workflow=${metadata.name}
          &from=${status.startedAtEpoch}
          &to=${status.finishedAtEpoch}
      - name: Pod Logs
        scope: pod-logs
        target: _blank
        url: >-
          https://logs.example.com/pod
          ?namespace=${metadata.namespace}
          &pod=${metadata.name}
          &from=${status.startedAtEpoch}
          &to=${status.finishedAtEpoch}
```

The URL above is illustrative; adapt its query syntax and URL encoding to the logging product. Argo documents the metadata and epoch timestamp placeholders used to build these links.

## Convenience Pattern: Enable Argo Archive Logs

Argo can ask its executor to save each container's log as an artifact. This requires two things:

1. a working artifact repository;
2. `archiveLogs` enabled at controller, Workflow, or template level.

For example, enable it for one Workflow:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: archived-logs-
  namespace: workflows
spec:
  archiveLogs: true
  artifactRepositoryRef:
    configMap: artifact-repositories
    key: workflow-logs
  entrypoint: main
  podGC:
    strategy: OnWorkflowCompletion
    deleteDelayDuration: 5m
  templates:
    - name: main
      container:
        image: alpine:3.23
        command: [sh, -c]
        args:
          - |
            echo "workflow={{workflow.name}}"
            echo "finished"
```

The selected repository might be an S3 entry in the Workflow namespace:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: artifact-repositories
  namespace: workflows
data:
  workflow-logs: |
    archiveLogs: true
    s3:
      bucket: company-argo-logs
      endpoint: s3.amazonaws.com
      region: eu-west-1
      keyFormat: logs/{{workflow.uid}}/{{pod.name}}
      useSDKCreds: true
```

The Workflow Pod's identity needs permission to write log artifacts. The Argo Server's identity needs permission to read them if users retrieve logs through the UI or artifact service. With namespace-scoped static credentials, the referenced Secrets must exist in the Workflow namespace.

Archive behavior follows a documented precedence rule. A controller-level `archiveLogs: true` forces archiving even if the Workflow or template says false. When the controller setting is false, a Workflow-level true enables it for the Workflow, while a template-level `archiveLocation.archiveLogs` can enable or disable individual templates according to the precedence table in the official documentation.

Template-only configuration looks like this:

```yaml
- name: auditable-step
  archiveLocation:
    archiveLogs: true
  container:
    image: alpine:3.23
    command: [sh, -c]
    args: ['echo "retain this step"']
```

Use controller-wide enablement only after considering artifact volume, storage cost, sensitive data, and retention requirements.

## Retrieve Logs After the Pod Is Gone

### From the external logging backend

Search by the immutable context you retained:

1. cluster and namespace;
2. Workflow name or UID;
3. Pod/node name and container;
4. the Workflow start and finish timestamps.

The Workflow object still provides useful query inputs while it exists:

```bash
kubectl get workflow -n workflows <workflow-name> \
  -o jsonpath='{.metadata.uid}{"\n"}{.status.startedAt}{"\n"}{.status.finishedAt}{"\n"}'

kubectl get workflow -n workflows <workflow-name> -o json \
  | jq -r '.status.nodes[] | [.id, .displayName, .phase, .startedAt, .finishedAt] | @tsv'
```

If the Workflow custom resource has also been removed, obtain the same metadata from the Workflow archive:

```bash
argo archive get <workflow-name> -n workflows -o json > archived-workflow.json
jq -r '.metadata.uid, .status.startedAt, .status.finishedAt' archived-workflow.json
```

Again, the database record locates the run; the external log backend contains the log text.

### From Argo's archived log artifact

When `archiveLogs` succeeded, open the Workflow in the Argo UI and select the node's logs. Argo documents this feature specifically as a convenience for viewing logs of garbage-collected Pods.

For automation, Argo Server exposes artifact endpoints. Retrieve the Workflow UID and the node ID from the archived record, then request the container log artifact. The executor names the main-container log artifact `main-logs`:

```bash
ARGO_TOKEN="$(argo auth token)"
WORKFLOW_UID="$(jq -r '.metadata.uid' archived-workflow.json)"
NODE_ID="$(jq -r '
  .status.nodes[]
  | select(.displayName == "main")
  | .id
' archived-workflow.json)"

curl --fail --show-error --location \
  -H "Authorization: Bearer ${ARGO_TOKEN}" \
  "https://argo.example.com/artifacts-by-uid/${WORKFLOW_UID}/${NODE_ID}/main-logs"
```

Use the real node display name and Argo Server base path for your installation. For a sidecar or another container, the artifact name follows the container name, such as `metrics-logs`. The artifact API is preferable to constructing a bucket key yourself because Argo resolves the recorded artifact location and repository driver.

For a live Workflow object, the API also provides a name-based artifact route:

```text
/artifacts/{namespace}/{workflowName}/{nodeId}/{artifactName}
```

Both routes require the caller to pass Argo authentication and to be authorized for the Workflow/artifact. Do not expose the underlying bucket publicly merely to make log download easy.

## Verify Archiving Before Enabling Pod Deletion

Run a smoke Workflow and verify the whole lifecycle:

```bash
argo submit -n workflows archived-logs.yaml --watch

# Read logs while the Pod exists.
argo logs -n workflows @latest
```

`@latest` is an Argo CLI shortcut, not a valid Kubernetes object name. Obtain the actual name before inspecting the artifacts recorded on its nodes with `kubectl`:

```bash
WORKFLOW_NAME="$(argo list -n workflows -o name | head -n 1)"
kubectl get workflow -n workflows "$WORKFLOW_NAME" -o json \
  | jq '.status.nodes[] | {displayName, artifacts: .outputs.artifacts}'
```

Then wait for or trigger the configured Pod GC, confirm the Pod no longer exists, and retrieve the log through the Argo UI and the external backend. A setting is not proven until the post-deletion read works.

If archiving failed, inspect the Pod's Argo executor container before it is deleted:

```bash
kubectl logs -n workflows <pod-name> -c wait
kubectl logs -n workflows <pod-name> -c supervisor
```

Look for missing output paths, Secret errors, denied object writes, wrong bucket regions, TLS failures, or executor termination. A successful application container does not prove that its log artifact uploaded.

## Set Independent Retention Policies

Treat each retention clock explicitly:

- **Pod retention:** `podGC` strategy and deletion delay;
- **Workflow CR retention:** `ttlStrategy`;
- **Workflow database retention:** persistence `archiveTTL`;
- **log backend retention:** index/object lifecycle policy;
- **Argo log-artifact retention:** artifact-store lifecycle and any applicable artifact garbage collection policy.

Do not let log objects disappear earlier than the Workflow history that points to them, unless that is the intended compliance policy. Conversely, do not keep sensitive logs indefinitely merely because the Workflow archive defaults to a long retention period.

Apply encryption, least-privilege reads, tenant separation, and deletion controls to both the external backend and artifact bucket. Container output often contains customer identifiers, URLs, query text, and accidental credentials even when applications are designed not to log secrets.

## Troubleshooting Checklist

When logs disappear after Pod GC:

1. Confirm whether the Pod is actually deleted; `kubectl logs` cannot read a deleted Pod.
2. Check whether a cluster log collector ingested the Pod and attached Workflow metadata.
3. Check the collector for backpressure and tail-loss near Pod completion.
4. Confirm the Workflow had effective `archiveLogs: true` before it ran.
5. Verify the selected artifact repository and executor upload logs.
6. Inspect `.status.nodes[].outputs.artifacts` for the container log artifact.
7. Confirm Argo Server has read permission for the artifact location.
8. Remember that the Workflow archive stores node history, not log bodies.
9. Increase `podGC.deleteDelayDuration` only as a buffer while fixing collection reliability.
10. Test retrieval after deletion with a controlled smoke Workflow.

For production operations, make the external backend the system of record and add Argo UI deep links. Use `archiveLogs` when its workflow-centric convenience is worth the extra artifacts and when its simpler storage model satisfies your requirements.

## Official Documentation

- [Argo Workflows: Configuring Archive Logs](https://argo-workflows.readthedocs.io/en/latest/configure-archive-logs/)
- [Argo Workflows: Workflow Archive](https://argo-workflows.readthedocs.io/en/latest/workflow-archive/)
- [Argo Workflows: Links](https://argo-workflows.readthedocs.io/en/latest/links/)
- [Argo Workflows: Artifact Repository Ref](https://argo-workflows.readthedocs.io/en/latest/artifact-repository-ref/)
- [Argo Workflows: API Reference](https://argo-workflows.readthedocs.io/en/latest/swagger/)
- [Argo Workflows: Field Reference for `PodGC`](https://argo-workflows.readthedocs.io/en/latest/fields/#podgc)
