# Iguazio 'No space left on device': Find Feature Store, Trace and Artifact Growth

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, Feature Store, Storage Monitoring, Troubleshooting

Description: Identify the storage boundary behind an Iguazio write failure, attribute growth to feature data, monitoring records, or artifacts, and recover capacity without breaking consumers.

A training job fails while saving an artifact. A feature ingestion stops writing Parquet. A notebook cannot create a temporary file. All three can report `No space left on device`, but they may be writing to different storage systems.

Start with the failed write's actual destination. A local staging directory, a mounted filesystem, and the Iguazio data layer need different capacity checks. Once you know which one is full, identify the producer responsible for its growth before choosing a retention change.

## Capture the failed operation

Save the traceback, timestamp, project, run or function identifier, and destination path. For a copy or upload, distinguish the source, temporary file, and final destination. The failure can occur before data reaches its intended target.

For a Kubernetes workload, replace the placeholders with the pod and container associated with the failed operation:

```bash
JOB_NAMESPACE=your-namespace
JOB_POD=your-pod
JOB_CONTAINER=your-container

kubectl -n "$JOB_NAMESPACE" get pod "$JOB_POD" -o wide
kubectl -n "$JOB_NAMESPACE" describe pod "$JOB_POD"
kubectl -n "$JOB_NAMESPACE" logs "$JOB_POD" \
  -c "$JOB_CONTAINER" --since=30m --timestamps
```

The logs command restricts output to a recent interval and includes timestamps for correlation. If the container has restarted, inspect its previous instance with `kubectl logs --previous` using the same namespace, pod, and container. [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

Read the pod's volume mounts alongside the error. Kubernetes local ephemeral storage includes container writable layers, local disk-backed `emptyDir` volumes, and pod logs. A node storage-pressure event belongs in that investigation; it does not establish that the project's remote data store is full. [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)

## Check capacity at the correct boundary

Run filesystem checks inside the failing container or its equivalent shell environment. Set the path to an **existing parent directory** of the failed file:

```bash
# Run inside the workload's container. Replace this example directory.
FAILED_PARENT=/path/to/existing/parent

df -h "$FAILED_PARENT"
df -i "$FAILED_PARENT"
```

`df` reports the filesystem containing its path argument. The first command checks space; the second checks inode availability where the filesystem exposes it. A filesystem can have free bytes while lacking inodes for new files. An unsupported or uninformative inode report on a remote mount is not evidence that its backend has capacity. [GNU df documentation](https://www.gnu.org/software/coreutils/manual/html_node/df-invocation.html)

For an Iguazio data-layer destination, also inspect the platform's **Storage** dashboard. It exposes data-node and disk capacity and per-container usage; **Events** provides operational alerts. These views require the appropriate platform permissions. Use them to establish backend capacity rather than interpreting the notebook's root filesystem as the entire platform. [Iguazio dashboard documentation](https://www.iguazio.com/docs/latest-release/intro/ui/)

Keep user and project storage separate. Iguazio's predefined `users` container holds user home directories, while `projects` holds shared project data. The documented default shared artifact location is `projects/<project name>/artifacts`. A notebook home directory therefore need not be disposable container-local storage. [Iguazio predefined containers](https://www.iguazio.com/docs/latest-release/services/data-layer/containers/predefined-containers/)

## Find the growing directory

When the destination is available through a filesystem mount, start with one project or a smaller known subtree. This example requires GNU `du` and GNU `sort`:

```bash
# Use the actual mounted path for the affected project.
STORAGE_SCOPE=/v3io/projects/your-project

du -x -h --max-depth=2 "$STORAGE_SCOPE" | sort -h | tail -n 20
```

`-x` avoids crossing filesystem boundaries, and `--max-depth=2` limits the reported directory levels. It still traverses files underneath those directories, so a large project can make this an expensive scan. Narrow the path as you identify the largest branch. Keep permission or read errors visible: an incomplete scan cannot establish total usage. [GNU du documentation](https://www.gnu.org/software/coreutils/manual/html_node/du-invocation.html)

Use this output to find candidate owners, then compare against the storage service's measurements. A directory walk is not a complete inventory of database storage. Do not pass `store://`, `v3io://`, or object-store URLs to filesystem commands; first resolve the resource's actual backend and access method.

Take a second measurement after a known interval if the workload can safely continue. A large, stable training dataset and a smaller directory doubling every hour call for different responses.

## Separate feature, trace, and artifact growth

Build a small ownership inventory before removing anything:

| Data category | Configuration to inspect | Question to answer |
| --- | --- | --- |
| Offline features | Feature-set and feature-vector target paths | Which partitions and ingestion runs added data? |
| Online features | Configured online target | Which table or database holds the serving values? |
| Trace or monitoring records | Producing function and monitoring configuration | Which requests or events are retained, and where? |
| Run artifacts | Artifact location and producing run | Which versions are still used by training or serving? |
| Temporary files | Failing process and staging path | Can the producer remove completed staging files? |

MLRun documents Parquet and Iguazio NoSQL as default feature-set targets on Iguazio. Parquet supports offline use; the online target serves low-latency lookups. The documented default feature-store location is under the project's `fs` directory in the `projects` container, but targets can use custom paths. Inspect the saved target configuration rather than assuming every feature set follows that layout. Looking only at online values misses the separate offline files. [MLRun feature-store sources and targets](https://docs.mlrun.org/en/stable/feature-store/sources-targets.html)

A directory named `tracing` does not identify its producer or establish that it contains OpenTelemetry spans. Follow its configured writer. For example, MLRun's documented model-monitoring pipeline writes collected serving data to Parquet, with a monitoring feature set referring to that target. Monitoring also involves other stores, so account for the configured stream and database backends separately. [MLRun model-monitoring architecture](https://docs.mlrun.org/en/stable/model-monitoring/index.html)

For artifacts, use MLRun's artifact details to connect the storage location with the producing run. Artifact paths can be overridden, and run-specific paths can accumulate across repeated executions. The UI's artifact query limit means a single results page is not a complete inventory. [MLRun artifact storage](https://docs.mlrun.org/en/stable/store/artifacts.html)

## Recover capacity with the owning workflow

Choose the response from the inventory. Reduce unnecessary production, archive data that must be retained, remove expired data through its owning system, or arrange additional capacity with the storage operator. Retention should account for consumers: a historical partition may still be needed for reproducible training, while an older model artifact may still support rollback.

MLRun distinguishes artifact metadata from stored files. Its `metadata-only` deletion mode leaves the data in storage, and file-deletion support varies by artifact type. Deleting an entry in the catalog therefore does not prove that bytes were reclaimed. Check the deletion behavior for the installed release before planning artifact cleanup. [MLRun artifact deletion documentation](https://docs.mlrun.org/en/stable/store/artifacts.html)

After the targeted change, recheck capacity at the original failing boundary. Retry one representative operation with the same workload identity and destination, then verify that its output can be read by the next pipeline stage. Restore normal production only after that succeeds.

Track both remaining capacity and growth rate for each storage owner. Give the alert an actionable destination: the affected container or filesystem, the producing project, and the team responsible for its retention. That makes the next alert useful before another job reaches a failed write.
