# Fix MLRun API 412 'Waiting for Migrations' After an Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, Kubernetes, Troubleshooting

Description: Resolve MLRun's post-upgrade migration gate using the documented migration API, inspect migration progress, and verify the upgraded service without deleting metadata.

After an MLRun upgrade, a response such as HTTP 412 with `API is waiting for migrations to be triggered` points to an unfinished upgrade step. Repeating a training submission will not complete the database migration the API is waiting for.

Treat the response text as part of the diagnosis. HTTP 412 alone can represent other failed preconditions, and a reverse proxy can return its own errors. Preserve the complete sanitized message, timestamp, API address, and upgrade versions before taking action.

## Confirm the upgrade state

Determine the previous and intended MLRun versions, the running API image, and the client version used for recovery. Check the release's upgrade instructions rather than assuming the newest SDK is the right repair tool for an older deployment.

The MLRun CE chart documents triggering database migrations after upgrading the server. It also warns that upgrading the schema does not provide a downgrade path. Confirm the database backup and recovery plan established for the upgrade before starting a migration against production metadata. [MLRun CE chart migration instructions](https://github.com/mlrun/ce/blob/development/charts/mlrun-ce/README.md#triggering-db-migrations)

Inspect the actual rollout rather than relying only on a successful package-manager command:

```bash
MLRUN_NAMESPACE=your-mlrun-namespace
API_DEPLOYMENT=your-mlrun-api-deployment

kubectl -n "$MLRUN_NAMESPACE" get deployments,pods -o wide
kubectl -n "$MLRUN_NAMESPACE" get deployment "$API_DEPLOYMENT" \
  -o jsonpath='{range .spec.template.spec.containers[*]}{.name}{"\t"}{.image}{"\n"}{end}'
kubectl -n "$MLRUN_NAMESPACE" rollout status \
  deployment/"$API_DEPLOYMENT" --timeout=120s
```

Choose the deployment name from your installation. If it uses separate API roles, inspect the role responsible for migration coordination as well. A partially rolled-out service deserves investigation before you submit another administrative operation.

## Use the documented migration entry point

From an authorized, version-compatible client connected to the intended server:

```python
import mlrun

# Authentication and MLRUN_DBPATH are configured for the upgraded service.
db = mlrun.get_run_db()
result = db.trigger_migrations()
print("Migration request completed")
```

This is a database-changing operation, intended for the operator completing the upgrade. The documented HTTP client method submits the migrations operation and waits for its background task when one is returned. Its contract also allows no work when migrations are unnecessary. [MLRun HTTP database client implementation](https://docs.mlrun.org/en/stable/_modules/mlrun/db/httpdb.html#HTTPRunDB.trigger_migrations)

Do not call this in a training-loop retry handler. Run it through the upgrade procedure, preserve the result or exception, and correlate the operation with server logs. A timeout in the client does not establish whether server-side work stopped, completed, or is still running.

Some newer CE chart versions can launch a migration job as part of an upgrade. Verify support in your exact chart version and inspect that job before also starting a manual migration. The development chart's current options are not evidence that an older installed chart has them. [MLRun CE chart documentation](https://github.com/mlrun/ce/blob/development/charts/mlrun-ce/README.md#triggering-db-migrations)

## Follow progress and errors

Use the selected API pod and, where applicable, the migration job discovered in your namespace:

```bash
API_POD=your-api-pod

kubectl -n "$MLRUN_NAMESPACE" logs "$API_POD" \
  --all-containers=true --since=30m
kubectl -n "$MLRUN_NAMESPACE" get jobs
kubectl -n "$MLRUN_NAMESPACE" get events \
  --sort-by=.metadata.creationTimestamp
```

If logs identify a migration failure, preserve the first concrete exception. Database connectivity, credentials, storage capacity, and incompatible upgrade sequences need different repairs. A later repeated message about waiting for migrations may simply describe the state left by that earlier failure.

For a restarted pod, inspect the relevant container's previous logs when available. Include pod names and timestamps in the evidence so messages from old and new server versions are not mistaken for a single execution.

## Verify service recovery before resuming workloads

After migration completion, reconnect with the supported client and retry a small read through the same API route that failed. Then inspect an existing project and its recorded runs, and submit a minimal job that exercises the upgraded service.

If the same message persists, compare the endpoint with the pods you inspected. Check whether traffic reaches an older replica or another installation. Confirm migration completion from the server, not solely from the fact that the client command returned.

Keep the database and its persistent volumes intact while diagnosing. Removing them changes an upgrade repair into a fresh installation and discards the metadata you intended to preserve. Record the starting version, target version, migration outcome, and successful recovery checks so the next upgrade has a concrete operational history.
