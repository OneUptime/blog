# How to Use Ceph Log Correlation for Troubleshooting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Log Correlation, Troubleshooting, Observability, Debugging

Description: Correlate logs across Ceph monitors, OSDs, and RGW daemons using timestamps and request IDs to trace the root cause of complex cluster issues.

---

Complex Ceph issues often span multiple daemon types. A client write failure may involve a monitor, several OSDs, and a metadata server. Log correlation - linking related events across daemons by timestamp and request ID - is the key to tracing these issues end-to-end.

## Understanding Request IDs in Ceph Logs

Ceph assigns a unique transaction ID to operations that appears in logs across all involved daemons. Look for patterns like:

```text
osd.2 2024-01-15T10:23:45 op 0x5f3a0000002e...
client.12345 2024-01-15T10:23:45 op 0x5f3a0000002e...
```

## Correlate by Timestamp

Extract a time window around an incident and search all daemon logs:

```bash
# Get logs from all Ceph pods for the incident window
kubectl -n rook-ceph logs -l app=rook-ceph-osd \
  --since-time="2024-01-15T10:20:00Z" > /tmp/osd-logs.txt

kubectl -n rook-ceph logs -l app=rook-ceph-mon \
  --since-time="2024-01-15T10:20:00Z" > /tmp/mon-logs.txt

kubectl -n rook-ceph logs -l app=rook-ceph-rgw \
  --since-time="2024-01-15T10:20:00Z" > /tmp/rgw-logs.txt
```

Merge and sort all logs by timestamp:

```bash
cat /tmp/osd-logs.txt /tmp/mon-logs.txt /tmp/rgw-logs.txt | \
  sort -k1,2 > /tmp/correlated-logs.txt
```

## Use Loki for Multi-Component Correlation

Query Loki across all Ceph components simultaneously:

```bash
# Find all events in a 1-minute window across all daemons
{namespace="rook-ceph"} | json | line_format "{{.pod}} {{.message}}"
```

Use Grafana's "Correlate with metrics" feature to jump from a slow request log to the Prometheus graph at the same timestamp.

## Trace a Specific Operation

If you have a client-side error with an operation ID, search for it:

```bash
OP_ID="0x5f3a0000002e"

# Search across all daemon logs
for POD in $(kubectl -n rook-ceph get pods -o name | grep -E "osd|mon|mds"); do
  echo "=== $POD ==="
  kubectl -n rook-ceph logs $POD --tail=5000 | grep "$OP_ID"
done
```

## Correlate with Ceph Perf Counters

Dump all current stats at the time of investigation:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -s > /tmp/cluster-status.txt

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd perf >> /tmp/cluster-status.txt

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph pg stat >> /tmp/cluster-status.txt
```

## Build a Correlation Timeline

Document findings in chronological order:

```bash
# Example timeline format
cat << EOF > /tmp/incident-timeline.txt
10:20:00 - Client reports write errors
10:20:15 - OSD.3 logs: slow request 30s old
10:20:30 - Monitor logs: marking osd.3 down
10:21:00 - Rebalancing begins (45 PGs degraded)
10:25:00 - OSD.3 pod restarted by Rook
10:28:00 - HEALTH_OK restored
EOF
```

## Summary

Effective log correlation for Ceph troubleshooting requires synchronized timestamps across daemon types and, ideally, a centralized log store like Loki or Elasticsearch. Merging OSD, monitor, and RGW logs sorted by time, then searching for shared operation IDs, quickly narrows a complex multi-component failure to its root cause.
