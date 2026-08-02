# Fixing “Request Entity Too Large” in Argo Workflows with Node-Status Offloading

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, Node Status Offloading, PostgreSQL, MySQL, etcd, Workflow Controller, Troubleshooting

Description: Fix large Argo Workflow status updates with SQL-backed node-status offloading, verify that offloading works, and distinguish status growth from oversized submissions and proxies.

---

Argo Workflows records every node's execution state in the `Workflow` custom resource. Large fan-out DAGs and loops can make `.status.nodes` grow until the resource no longer fits within the Kubernetes object-size limit. Symptoms include errors such as:

```text
offload node status is not supported
etcdserver: request is too large
Request Entity Too Large
```

Node-status offloading is the supported fix when **runtime node status** is the part that has grown too large. Argo first tries to compress the node map into `.status.compressedNodes`. If the result is still too large and persistence is configured with `nodeStatusOffLoad: true`, the controller writes the node status to PostgreSQL, MySQL, or MariaDB instead of carrying it in the Kubernetes object.

However, not every HTTP 413 or “request too large” error is a node-status problem. Determine where the request failed before adding a database.

## Identify Which Payload Is Too Large

There are three common failure points:

| Failure point | Typical timing | Does node-status offloading fix it? |
| --- | --- | --- |
| Workflow `.status.nodes` update | Workflow starts, then fails as node count grows | Yes |
| Initial Workflow manifest | Submission fails before a Workflow is created | No; the spec itself must be reduced or submitted differently |
| Ingress or reverse-proxy request body | HTTP submission fails at Argo Server boundary | No; fix that proxy limit or reduce the request |

Check whether the Workflow exists:

```bash
NS=workflows
WF=<workflow-name>

kubectl get workflow "$WF" -n "$NS"
kubectl get workflow "$WF" -n "$NS" -o json \
  | jq '{
      phase: .status.phase,
      message: .status.message,
      nodes: ((.status.nodes // {}) | length),
      compressedBytes: ((.status.compressedNodes // "") | length),
      offloadVersion: (.status.offloadNodeStatusVersion // "")
    }'
```

Then inspect controller and Argo Server logs around the failure:

```bash
kubectl logs deployment/workflow-controller -n argo --since=30m \
  | grep -E "$WF|offload|too large|413"

kubectl logs deployment/argo-server -n argo --since=30m \
  | grep -E "$WF|too large|413"
```

If a proxy generated the 413, its access or error log usually records the rejection while Argo Server never sees the request. If the Workflow ran many nodes before failing and the controller reports that offloading is unsupported, it is the node-status case described here.

## How Argo Stores Large Node Status

The progression is automatic:

1. Small Workflows store their node map in `.status.nodes`.
2. When needed, Argo compresses it into `.status.compressedNodes`.
3. If compressed status still exceeds the safe resource size, a persistence-enabled controller offloads it to SQL.

An offloaded Workflow has `.status.offloadNodeStatusVersion` populated with a hash identifying the database version. The field reference specifies that `.status.nodes` and `.status.compressedNodes` are empty in this state. Operators should not patch that hash or database row manually; they are coordinated by the controller.

Offloading is demand-driven by default. Enabling it does not mean every small Workflow immediately appears in the offload table. The controller avoids the database write when normal or compressed status fits.

## Configure a Production Database

The Workflow controller needs a supported SQL database and credentials. The following ConfigMap uses the documented alternate `config: |` structure:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: workflow-controller-configmap
  namespace: argo
data:
  config: |
    persistence:
      nodeStatusOffLoad: true
      archive: false
      postgresql:
        host: argo-postgresql.database.svc
        port: 5432
        database: argo
        tableName: argo_workflows
        userNameSecret:
          name: argo-postgres-config
          key: username
        passwordSecret:
          name: argo-postgres-config
          key: password
```

The Secret references are resolved in the Workflow controller's namespace:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: argo-postgres-config
  namespace: argo
type: Opaque
stringData:
  username: argo_workflows
  password: replace-through-your-secret-manager
```

Do not commit a real database password in YAML. Create or synchronize this Secret through the cluster's approved secret-management path.

`archive: false` is intentional in this example. Node-status offloading and the Workflow Archive share persistence infrastructure but solve different problems:

- `nodeStatusOffLoad: true` keeps oversized status out of the live Kubernetes object;
- `archive: true` retains completed Workflow records after live objects are removed.

You can enable both, but enabling archive is not required merely to offload large live Workflows. Conversely, `archive: true` without `nodeStatusOffLoad: true` does not enable node-status offloading.

Use `mysql:` instead of `postgresql:` for a MySQL or MariaDB deployment; never configure both database types simultaneously. Confirm version-specific authentication fields in the controller ConfigMap reference for the Argo release you deploy.

## Apply the Change Safely

If the ConfigMap is managed by Helm, Kustomize, or GitOps, change the source of truth. A live `kubectl edit` may be overwritten. Before rollout:

1. Provision a durable database with backups and monitoring.
2. Restrict network access to the Argo controller and server components that require it.
3. Grant only the database permissions required for schema migration and runtime access.
4. Place the credential Secret in the controller namespace.
5. Update the controller configuration and restart or roll out components according to the installed chart or manifests.

For a manifest-managed installation, observe the rollout:

```bash
kubectl apply -f workflow-controller-configmap.yaml
kubectl rollout restart deployment/workflow-controller -n argo
kubectl rollout status deployment/workflow-controller -n argo
kubectl logs deployment/workflow-controller -n argo --since=10m \
  | grep -E 'Persistence|migration|offload|database'
```

Some releases can react to ConfigMap updates, but a controlled rollout ensures the active controller process loaded the expected persistence configuration. In an HA installation, keep versions and configuration aligned across replicas and let leader election provide availability; Argo's scaling documentation does not support multiple concurrently active controllers as ordinary horizontal workers.

The controller performs database schema migration when persistence starts unless `skipMigration` is set. Treat `skipMigration` as an advanced operational choice: the schema must already match the running Argo version, or the controller can fail or behave incorrectly.

## Verify Offloading End to End

Do not validate the feature with a tiny hello-world Workflow. Offloading is normally invoked only once status needs it.

Use a non-production test Workflow with enough nodes to cross the compression threshold, or reproduce the known failing Workflow at controlled concurrency. Watch the status fields:

```bash
watch -n 5 "kubectl get workflow '$WF' -n '$NS' -o json | \
  jq '{phase: .status.phase, message: .status.message, \
       nodes: ((.status.nodes // {}) | length), \
       compressed: ((.status.compressedNodes // \"\") | length), \
       offloadVersion: (.status.offloadNodeStatusVersion // \"\")}'"
```

Success has three signals:

- the controller log says persistence and node-status offloading are enabled;
- `.status.offloadNodeStatusVersion` becomes non-empty for a sufficiently large Workflow;
- `argo get`, the Argo UI, and Workflow progression continue to work after offloading.

The Kubernetes object alone no longer contains its node map after offloading. Use Argo-aware clients connected to the correctly configured Argo Server/controller environment to retrieve the reconstructed view.

Also verify failure behavior. Temporarily blocked database connectivity in a test environment should produce visible alerts; otherwise a database outage can turn into stalled large Workflows without an operator noticing.

## If Submission Fails Before the Workflow Exists

Node-status offloading cannot shrink an oversized `.spec`, because status does not exist yet. Measure the rendered manifest:

```bash
argo lint workflow.yaml
kubectl create --dry-run=client -f workflow.yaml -o json \
  | wc -c
```

Reduce repeated specification data using Argo's documented composition patterns:

- parameterize repeated work with `withItems` or `withParam`;
- put common fields in Workflow or template defaults;
- move reusable templates into `WorkflowTemplate` or `ClusterWorkflowTemplate` resources;
- split a very large graph into smaller Workflows, potentially using the workflow-of-workflows pattern;
- store large input data as artifacts rather than embedding it in parameters or YAML.

If the exact submission error is `Failed to submit workflow: etcdserver: request is too large`, the Argo offloading documentation directs clients to submit through Argo Server using the Argo CLI with `ARGO_SERVER` configured:

```bash
export ARGO_SERVER=argo.example.com
export ARGO_SECURE=true
argo submit workflow.yaml -n "$NS"
```

That route can address how submission is transported, but it does not make an arbitrarily large Workflow spec a sound design. Keep the manifest itself bounded.

For an ingress-generated HTTP 413, inspect the ingress/controller documentation and policy before increasing a request-body limit. Apply the smallest necessary limit to the Argo Server route, confirm upstream timeouts, and avoid turning the endpoint into an unrestricted upload path.

## Avoid Embedding Large Runtime Values in Status

Offloading moves node status; it does not eliminate the cost of producing, serializing, storing, and repeatedly updating it. Large output parameters and expanded fan-out still add controller, API, and database load.

Prefer artifacts for files and sizable JSON payloads:

```yaml
outputs:
  artifacts:
    - name: report
      path: /tmp/report.json
      s3:
        key: reports/{{workflow.uid}}/report.json
```

Pass a small artifact reference or key to downstream tasks instead of an entire document as a parameter. Bound fan-out, avoid copying identical templates into every submission, and split graphs when separate failure or retention boundaries make operational sense.

Argo Workflows v4.1 and later also supports selectable node-status compression algorithms through `WORKFLOW_COMPRESSION_ALGORITHM` and `WORKFLOW_COMPRESSION_LEVEL`. The official documentation warns that Workflows written with a non-gzip algorithm cannot be read by older Argo versions lacking that support. Compression tuning is therefore an upgrade-compatibility and CPU tradeoff, not a replacement for persistence when status remains too large.

## Common Configuration Mistakes

### The key is in the wrong ConfigMap shape

The controller supports individual ConfigMap data keys and the alternate consolidated `data.config` form. Do not mix indentation between them. Inspect the live object and the controller's rendered configuration log after rollout.

### Archive was enabled, but offloading was not

`archive: true` and `nodeStatusOffLoad: true` are separate booleans. Set the latter explicitly.

### The Secret is in the Workflow namespace

Database credential references belong to the controller's configuration and are resolved in the Workflow controller namespace, not each workload namespace.

### Small Workflows do not appear in offload storage

That is expected with demand-driven offloading. Check `.status.nodes` and `.status.compressedNodes`; a Workflow that fits does not need SQL node storage. `ALWAYS_OFFLOAD_NODE_STATUS` exists as a controller environment variable, but the official environment-variable page warns that such variables are generally experimental and should not be the default production solution.

### Argo Server cannot display the Workflow

Make sure the server uses compatible configuration and can reach the same persistence database. Test with the supported Argo UI/CLI path, and compare controller and server logs for database errors.

## Operational Checklist

- Confirm the large payload is runtime node status, not the initial spec or ingress body.
- Configure one supported SQL backend under `persistence`.
- Set `nodeStatusOffLoad: true` explicitly.
- Keep archiving decisions separate from offloading decisions.
- Verify migration, connectivity, and credential errors in controller logs.
- Exercise a Workflow large enough to offload and check `offloadNodeStatusVersion`.
- Test Argo UI and CLI reads after offload.
- Monitor database capacity, latency, backups, and controller errors.
- Reduce unnecessary status and manifest growth even after the immediate failure is fixed.

## Official Documentation

- [Argo Workflows: Offloading large Workflows](https://argo-workflows.readthedocs.io/en/latest/offloading-large-workflows/)
- [Argo Workflows: Workflow Controller ConfigMap](https://argo-workflows.readthedocs.io/en/latest/workflow-controller-configmap/)
- [Argo Workflows field reference: WorkflowStatus](https://argo-workflows.readthedocs.io/en/latest/fields/#workflowstatus)
- [Argo Workflows: Workflow Archive](https://argo-workflows.readthedocs.io/en/latest/workflow-archive/)
- [Argo Workflows: Environment variables](https://argo-workflows.readthedocs.io/en/latest/environment-variables/)
- [Argo Workflows: Workflow templates](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/)
- [Argo Workflows: Workflow of Workflows](https://argo-workflows.readthedocs.io/en/latest/workflow-of-workflows/)
- [Kubernetes: Custom resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
