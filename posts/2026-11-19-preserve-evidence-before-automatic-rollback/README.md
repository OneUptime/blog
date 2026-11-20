# Preserve Logs, Traces, and State Before Automatic Rollback Erases Evidence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Argo Rollouts, OpenTelemetry, Incident Response, Observability

Description: Preserve failed-release identity, volatile Kubernetes state, and durable telemetry with bounded collection that does not hold up automatic recovery.

A canary fails, traffic returns to stable, and its Pods disappear. The dashboard looks healthy again, but the failed revision's termination state and final logs are gone. Preventing that loss requires preparation before deployment and a collection path that cannot block recovery.

## Preserve telemetry continuously

Rollback does not erase logs and traces already retained by an independent backend. The vulnerable evidence is unexported SDK data, Collector buffers, node-local logs, process memory, and changing Kubernetes objects. Kubernetes normally keeps logs for one previous container instance; `kubectl logs` exposes only the latest log file. It is not an archive. [Kubernetes logging architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)

Ship logs and traces continuously. Run collection infrastructure independently of the application release. For Collector exporters that support persistent sending queues, enable one backed by `file_storage` on storage that survives Collector replacement. Queue exhaustion, disk failure, and retry expiry still cause loss; a disk queue does not prove backend retention. [OpenTelemetry resiliency guidance](https://opentelemetry.io/docs/collector/resiliency/)

Include `service.name`, an immutable build identifier in `service.version`, cluster, namespace, and Pod UID. Keep deployment-attempt identity separate: retrying the same build is another attempt. [OpenTelemetry service conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)

Establish sampling before deployment. A rollback hook cannot recover spans already discarded by head sampling. A prepared tail-sampling policy can favor errors or a new release, provided those spans reach it. [OpenTelemetry sampling](https://opentelemetry.io/docs/concepts/sampling/)

## Restore traffic without waiting for an archive

For an existing Argo Rollouts canary **with traffic routing**, configure a finite retention interval before the release. This fragment belongs in the existing Rollout manifest; retain its other routing and strategy fields:

```yaml
spec:
  strategy:
    canary:
      abortScaleDownDelaySeconds: 60
```

This delays scaling down the aborted candidate, giving collection a short opportunity while recovery proceeds. It is not a delay before requesting abort. The field applies to traffic-routed canaries, not basic canaries; blue-green uses the corresponding field under `blueGreen`. Zero disables scale-down, so it is unsuitable as a routine bounded policy. The documented behavior began in Argo Rollouts v1.1; verify your installed controller and CRD. [Argo scale-down behavior](https://argoproj.github.io/argo-rollouts/features/scaledown-aborted-rs/), [Rollout specification](https://argoproj.github.io/argo-rollouts/features/specification/)

Sixty seconds is an example, not a recommendation for every workload. Retained Pods consume capacity and may continue background jobs or database writes despite losing routed traffic. If they prolong harm or prevent stable capacity recovering, prioritize termination. This setting cannot protect against crashes, eviction, or node loss.

Have the recovery coordinator emit an evidence request alongside its recovery action. Do not make successful capture or upload a prerequisite for abort. Start collection from a prepared worker with a deadline and concurrency cap; record an unavailable worker as missing evidence.

When Argo itself aborts after failed analysis, an external worker can react to `on-rollout-aborted`. That notification reports an abort; it is not a synchronous pre-rollback hook. Collection may start after recovery begins, so retain the deployment identity beforehand and budget for notification delivery within the retention interval. [Argo analysis](https://argoproj.github.io/argo-rollouts/features/analysis/), [Argo notifications](https://argoproj.github.io/argo-rollouts/features/notifications/)

## Freeze the failed release's identity

Create the request from the failure decision and deployment record, before mutable controller references change. Include:

- Cluster, namespace, Rollout UID, deployment-attempt ID, and failure time.
- Failed and stable ReplicaSet UIDs, candidate image digest, source commit, and non-secret configuration revision.
- Selected Pod UIDs and container names, plus the failing AnalysisRun UID and measurements.
- An absolute UTC investigation window, including baseline and recovery, and the worker deadline.

These are your evidence schema, not proposed Kubernetes API fields. An image digest identifies an artifact; it does not identify an entire deployment configuration. Avoid resolving “the current canary” after rollback. Verify each selected Pod's owner chain reaches the recorded ReplicaSet and Rollout before dispatching collection.

## Capture one identified Pod within a budget

Save this as `capture-pod.sh` on the evidence worker. It requires Bash, `jq`, and `kubectl`; its eight arguments come from the verified request. The output directory must be newly created, empty, and private. Never reuse it across workers or retries, which could mix captures or leave stale completion markers. It writes selected status fields instead of dumping environment values or annotations.

```bash
#!/usr/bin/env bash
set -eu -o pipefail
ctx=$1 ns=$2 pod=$3 expected_uid=$4 expected_rs=$5
container=$6 since=$7 out=$8
umask 077
k=(kubectl --context "$ctx" --namespace "$ns" --request-timeout=5s)

snapshot() {
  "${k[@]}" get pod "$pod" -o json 2> "$out/$1.err" |
    jq '{uid:.metadata.uid, resourceVersion:.metadata.resourceVersion,
      owners:.metadata.ownerReferences, node:.spec.nodeName,
      containers:[.status.containerStatuses[]? |
        {name,imageID,containerID,restartCount,ready,
         state:(.state | del(.terminated.message,.waiting.message)),
         lastState:(.lastState | del(.terminated.message))}]}' > "$out/$1.json"
}
identity_matches() {
  jq -e --arg uid "$expected_uid" --arg rs "$expected_rs" '
    .uid == $uid and any(.owners[]?; .uid == $rs and .controller == true)
  ' "$out/$1.json" > /dev/null
}

date -u +%Y-%m-%dT%H:%M:%SZ > "$out/started.txt"
snapshot before && identity_matches before || exit 1
for mode in current previous; do
  previous=false
  if [ "$mode" = previous ]; then previous=true; fi
  if "${k[@]}" logs "$pod" -c "$container" --timestamps \
      --since-time="$since" --limit-bytes=1048576 --previous="$previous" \
      > "$out/$mode.log" 2> "$out/$mode.err"; then
    printf '0\n' > "$out/$mode.rc"
  else
    printf '%s\n' "$?" > "$out/$mode.rc"
  fi
done
snapshot after && identity_matches after || exit 1
date -u +%Y-%m-%dT%H:%M:%SZ > "$out/finished.tmp"
mv "$out/finished.tmp" "$out/finished.txt"
```

Give the entire invocation a deadline, not just individual API requests. On a Linux worker with GNU Coreutils, populate the variables from the request and run:

```bash
umask 077
capture_dir=$(mktemp -d) || exit 1
if timeout --kill-after=2s 25s bash capture-pod.sh \
    "$ctx" "$ns" "$pod" "$pod_uid" "$rs_uid" \
    "$container" "$window_start" "$capture_dir"; then
  capture_rc=0
else
  capture_rc=$?
fi
printf '%s\n' "$capture_rc" > "$capture_dir/worker.rc"
```

GNU `timeout` sends `TERM` after 25 seconds and, if needed, `KILL` two seconds later. Record timeout or failure and retain partial files. [GNU timeout documentation](https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html)

`finished.txt` marks completion of the read sequence, not complete evidence or a verified upload. Review `worker.rc` and both per-log exit codes even when this marker exists; a missing result file means incomplete collection. Compare before/after container IDs and restart counts; changes make current/previous attribution uncertain. Missing selected-container status or mismatched snapshots also mean incomplete evidence. API reads and log retrieval are not atomic.

`--previous` retrieves one prior instance in this Pod, not a deleted Pod. The requested 1 MiB limit produces an excerpt, but the API permits slightly more or fewer bytes and an incomplete final line; it is not an exact file-size cap. `--since-time` sets a lower time boundary, with no matching upper-bound flag. Record acquisition time and retain the requested incident end separately. Repeat for specifically selected sidecars or init containers with appropriate status projection. [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), [Pod log API](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/#read-log)

## Finish preservation after recovery

Export backend logs and traces for the fixed window and recorded identities, including stable-version comparisons. Save query text, trace IDs, pagination limits, export time, and sampling policy. Repeat after measured ingestion delay, marking the later export separately. A dashboard link alone is not preserved data.

Archive selected AnalysisRun results, routing observations, and relevant Events before cleanup. Record configuration identifiers, not Secret contents. Database snapshots, heap dumps, and application-local files require separate, prepared collection procedures; this Pod-status script does not preserve them.

Give the worker namespace-scoped read access to required objects and `pods/log`; exclude Secrets and `pods/exec`. Kubernetes treats logs as a separate RBAC subresource. Logs and status can still contain sensitive data, so use restricted storage, retention limits, and reviewed summaries. [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#referring-to-resources)

Store collection outcomes and SHA-256 digests with the request, verify uploaded artifacts are readable, and retain originals separately from redactions. Rehearse an automatic abort, Pod deletion, collector restart, and unreachable evidence store. Success means recovery completes on time and investigators can identify both the failed release and the evidence that was lost.
