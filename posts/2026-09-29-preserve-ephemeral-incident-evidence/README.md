# How to Preserve Incident Evidence Before Ephemeral Pods, Autoscaled Instances, and Short-Retention Logs Disappear

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Incident Response, Kubernetes, Logging, Observability

Description: Capture volatile Kubernetes and autoscaling evidence before replacement or retention removes it, while recording identity, collection limits, and restricted evidence storage.

Restarting a failing workload may restore service and remove the most useful evidence at the same time. A replacement Pod has a new identity, an autoscaled instance may terminate, and a short log-retention window keeps advancing while responders debug.

The practical answer is a small evidence capture step that runs alongside mitigation. Capture volatile observations first, put them in an approved restricted location, and record what was unavailable. Do not make a complete forensic archive a prerequisite for restoring service.

## Prioritize Evidence by How Quickly It Can Disappear

Create a capture queue using the incident's actual failure mode:

| Priority | Evidence | Why it is vulnerable |
| --- | --- | --- |
| Immediate | Current and previous container logs, termination state, Pod UID | Restarts, eviction, and replacement |
| Immediate | Instance identity, boot logs, local diagnostics | Scale-in and host loss |
| Next | Namespace events, deployment revision, configuration identifiers | Object cleanup and changing control-plane state |
| Next | Backend log exports, trace examples, metric windows | Retention, sampling, and late ingestion |
| Later | Human decisions, command results, recovery checks | Missing context and editable records |

Kubernetes documents that a kubelet normally retains logs for one terminated container after a restart, and that eviction removes the associated containers and logs. `kubectl logs` is therefore an opportunity to collect evidence, not a durable archive. [Kubernetes logging architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)

## Capture an Identified Pod Before Replacing It

The following Bash example captures one known Pod and container. It requires existing read access, `kubectl`, and a configured context. Replace and verify the context, namespace, Pod, and container values before running it in Bash. Every request pins that context so a changed default cannot redirect later collection. The directory is private by default, but its contents may still contain sensitive application data.

```bash
umask 077
incident_context=production-eu
incident_namespace=payments
incident_pod=checkout-7c8d6f4c5b-abcde
incident_container=app
capture_dir=$(mktemp -d "${TMPDIR:-/tmp}/incident-evidence.XXXXXX") || exit 1

date -u +%Y-%m-%dT%H:%M:%SZ > "$capture_dir/started-at.txt"
printf '%s\n' "$incident_context" > "$capture_dir/context.txt"

# Raw objects can include sensitive environment values and annotations.
kubectl --context "$incident_context" --request-timeout=15s -n "$incident_namespace" \
  get pod "$incident_pod" -o json \
  > "$capture_dir/pod-before.json" 2> "$capture_dir/pod-before.err"

for instance in current previous; do
  log_args=()
  if [ "$instance" = previous ]; then log_args+=(--previous); fi
  if ! kubectl --context "$incident_context" --request-timeout=20s -n "$incident_namespace" \
    logs "$incident_pod" -c "$incident_container" \
    --timestamps=true --since=30m --limit-bytes=10485760 "${log_args[@]}" \
    > "$capture_dir/$instance.log" 2> "$capture_dir/$instance.err"; then
    printf '%s log capture failed; inspect stderr\n' "$instance" \
      >> "$capture_dir/capture-errors.txt"
  fi
done

kubectl --context "$incident_context" --request-timeout=15s -n "$incident_namespace" \
  get events -o json > "$capture_dir/events.json" \
  2> "$capture_dir/events.err"
kubectl --context "$incident_context" --request-timeout=15s -n "$incident_namespace" \
  get pod "$incident_pod" -o json \
  > "$capture_dir/pod-after.json" 2> "$capture_dir/pod-after.err"
date -u +%Y-%m-%dT%H:%M:%SZ > "$capture_dir/finished-at.txt"
printf 'Evidence directory: %s\n' "$capture_dir"
```

Review every stderr file and compare `metadata.uid` in the before and after snapshots. The script intentionally continues after individual failures; a directory of files does not mean capture succeeded. If the Pod vanished or its UID changed, mark the capture incomplete rather than attributing every log to the original workload.

Also compare the selected container's `containerID` and `restartCount` in `status.containerStatuses`. A restart can change the meaning of current and previous logs without changing the Pod UID. If these values changed during collection, record the ambiguity and correlate against centrally retained logs.

The `--previous` flag requests the previous instance of that container, if present. It does not search deleted Pods or every historical restart. The thirty-minute window and 10 MiB byte limit are proposed collection bounds; treat capped output as incomplete and expand deliberately when needed. `kubectl logs` exposes only the latest log file, so the requested time window may already be absent after rotation. Capture sidecars and init containers separately when relevant. [Official kubectl logs options](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), [Kubernetes log rotation](https://kubernetes.io/docs/concepts/cluster-administration/logging/#log-rotation)

## Record Identity and Collection Conditions

For each artifact, maintain a small manifest:

```text
Incident: INC-284
Artifact: previous.log
Source: cluster context / namespace / pod UID / container name
Collected: start and end UTC timestamps
Requested window: previous container instance, last 30 minutes, 10 MiB cap
Collector: responder or automation identity
Outcome: complete request / truncated / failed / source unavailable
Restriction: production application logs; restricted responders only
Storage: approved evidence object ID
Integrity: SHA-256 recorded after upload and verified on retrieval
```

A hash detects later byte changes when compared with a trusted manifest. It does not establish that the source was complete or correct. Preserve original bytes and add interpretation in separate notes.

For cloud instances, record the account, region, instance ID, image, launch time, and relevant autoscaling activity. A hostname alone may be reused. Preserve boot and termination boundaries so later investigators do not combine separate machine lifetimes.

## Make Autoscaling Collection a Prepared Capability

Amazon EC2 Auto Scaling termination lifecycle hooks can place instances in a wait state while a prepared process collects logs or performs cleanup. Hooks have time limits; expiry or abandonment allows termination to proceed. They are useful for routine graceful termination, not a guarantee against abrupt machine loss. [AWS lifecycle hook documentation](https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html)

Build and exercise that collection path before an incident. Keep central log shipping as the primary durable path. During an outage, evaluate whether pausing replacement would reduce healthy capacity or prolong impact before changing autoscaling behavior.

## Export Evidence with Reproducible Queries

For a log or trace backend, save the query, UTC window, selected timestamp field, filters, export time, and any pagination or result limit. A saved dashboard URL can render different data later after retention or delayed ingestion.

Capture customer-facing metrics across both the suspected impact interval and a useful baseline. Preserve deployment and configuration identifiers with the time they were observed. Avoid exporting an entire cluster merely because it is easy; it increases collection load and exposes unrelated data.

Keep raw restricted evidence separate from sanitized incident summaries. A broad incident channel should receive a concise observation and an access-controlled link, rather than credentials, personal data, or full manifests pasted into chat.

## Conclusion

Preserving incident evidence works best as a short, rehearsed operation: identify the resource, capture volatile state, retain errors and collection limits, and move the result to durable restricted storage. Verify the archive is readable before relying on it, then continue mitigation with the evidence needed for a defensible investigation.
