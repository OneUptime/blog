# Troubleshooting Access Logging in Cilium Network Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Network Security, Access Logging, Troubleshooting, Hubble

Description: Diagnose and resolve common issues with access logging in Cilium L7 parsers, including missing log entries, incorrect metadata, Hubble integration problems, and log pipeline bottlenecks.

---

## Introduction

Access logging issues in Cilium L7 parsers range from missing entries (events happen but are not logged) to incorrect entries (logged with wrong metadata) to delivery failures (logs are generated but never reach the observation pipeline). Each failure mode has different diagnostic approaches.

Missing access logs are particularly concerning because they create blind spots in security monitoring. If denied requests are not logged, security teams cannot detect scanning or brute-force attempts. If allowed requests are not logged, compliance audits fail.

This guide covers systematic troubleshooting for access logging problems in Cilium L7 parsers.

## Prerequisites

- Cilium cluster with L7 policy applied
- Hubble enabled and operational
- Access to Cilium agent logs
- `cilium-dbg monitor` CLI tool in the Cilium agent pod
- Parser source code for reference

## Diagnosing Missing Log Entries

When expected log entries do not appear:

```bash
# Step 1: Verify the proxy is active and processing traffic

kubectl exec -n kube-system ds/cilium -- cilium-dbg status | grep -i "proxy\|envoy"
kubectl exec -n kube-system ds/cilium -- cilium-dbg envoy admin listeners

# Step 2: Check if L7 policy is applied
kubectl exec -n kube-system ds/cilium -- cilium-dbg endpoint list | grep -i policy

# Step 3: Monitor for any L7 events
kubectl exec -n kube-system ds/cilium -- cilium-dbg monitor --type l7

# Step 4: Check Hubble specifically
hubble observe --type l7 --last 100

# Step 5: Check Cilium agent logs for access log errors
kubectl logs -n kube-system ds/cilium -c cilium-agent | grep -i "access.log\|accesslog"
```

Common causes of missing entries:

```go
// PROBLEM: logAccess is only called on the PASS path
func (p *Parser) OnData(reply, endStream bool, dataArray [][]byte) (proxylib.OpType, int) {
    // ... parse ...

    if !p.connection.Matches(command) {
        return proxylib.DROP, msgLen  // BUG: No access log for denied requests!
    }

    p.logAccess(cilium.EntryType_Request, command, requestID)
    return proxylib.PASS, msgLen
}

// FIX: Log both allowed and denied requests
func (p *Parser) OnData(reply, endStream bool, dataArray [][]byte) (proxylib.OpType, int) {
    // ... parse ...

    if !p.connection.Matches(command) {
        p.logAccess(cilium.EntryType_Denied, command, requestID)
        return proxylib.DROP, msgLen
    }

    p.logAccess(cilium.EntryType_Request, command, requestID)
    return proxylib.PASS, msgLen
}
```

```mermaid
flowchart TD
    A[Missing Log Entry] --> B{Proxy active?}
    B -->|No| C[Check L7 policy applied]
    B -->|Yes| D{cilium-dbg monitor shows L7?}
    D -->|No| E[Check logAccess calls in parser]
    D -->|Yes| F{Hubble shows flows?}
    F -->|No| G[Check Hubble relay connection]
    F -->|Yes| H[Log entry exists but filtered]
```

## Fixing Incorrect Metadata

When log entries exist but contain wrong information:

```bash
# Compare actual flow with logged data
hubble observe --type l7 -o json | jq '.flow.l7'

# Check source/destination identity
hubble observe --type l7 -o json | jq '{src: .flow.source, dst: .flow.destination}'
```

```go
// PROBLEM: Request and response logging swapped
func (p *Parser) logAccess(reply bool, command string, requestID uint32) {
    // BUG: EntryType should be EntryType_Response when reply is true.
    p.connection.Log(cilium.EntryType_Request, &cilium.LogEntry_GenericL7{
        GenericL7: &cilium.L7LogEntry{
            Proto: "myprotocol",
            Fields: map[string]string{
                "command":    command,
                "request_id": strconv.FormatUint(uint64(requestID), 10),
            },
        },
    })
}

// FIX: Set type based on direction
func (p *Parser) logAccess(reply bool, command string, requestID uint32) {
    entryType := cilium.EntryType_Request
    if reply {
        entryType = cilium.EntryType_Response
    }

    p.connection.Log(entryType, &cilium.LogEntry_GenericL7{
        GenericL7: &cilium.L7LogEntry{
            Proto: "myprotocol",
            Fields: map[string]string{
                "command":    command,
                "request_id": strconv.FormatUint(uint64(requestID), 10),
            },
        },
    })
}
```

## Resolving Hubble Integration Issues

When logs reach Cilium agent but not Hubble:

```bash
# Check Hubble relay status
hubble status

# Check Hubble relay logs
kubectl logs -n kube-system deployment/hubble-relay

# Verify Hubble is listening
kubectl exec -n kube-system ds/cilium -- cilium-dbg status | grep Hubble

# Test Hubble connectivity
hubble observe --last 1
```

Check Cilium Hubble configuration:

```bash
# Verify Hubble is enabled in Cilium config
kubectl get configmap -n kube-system cilium-config -o yaml | grep hubble

# Required settings
# hubble-enabled: "true"
# hubble-listen-address: ":4244"
```

## Handling Log Pipeline Backpressure

When logging causes performance degradation:

```bash
# Check Envoy proxy latency metrics
kubectl exec -n kube-system ds/cilium -- \
    cilium-dbg envoy admin metrics | grep downstream_rq_time

# Check for log buffer overflow indicators
kubectl logs -n kube-system ds/cilium -c cilium-agent | grep -i "buffer\|overflow\|dropped"
```

```go
// Keep parser-side logging cheap. Do not bypass proxylib's access-log path.
func (p *Parser) logAccess(entryType cilium.EntryType, command string, requestID uint32) {
    if entryType == cilium.EntryType_Request && !p.sampleAllowedRequest(requestID) {
        return
    }

    p.connection.Log(entryType, &cilium.LogEntry_GenericL7{
        GenericL7: &cilium.L7LogEntry{
            Proto: "myprotocol",
            Fields: map[string]string{
                "command":    command,
                "request_id": strconv.FormatUint(uint64(requestID), 10),
            },
        },
    })
}
```

## Verification

Verify logging is complete and correct:

```bash
# Send a mix of allowed and denied requests
kubectl exec test-client -- protocol-client batch-send \
    --commands "GET,SET,DELETE,GET,DELETE" \
    --target myservice:9000

# Check that all requests were logged
hubble observe --type l7 --last 10 -o json | jq '.flow.verdict'

# Count allowed vs denied
hubble observe --type l7 --last 100 -o json | \
    jq -r '.flow.verdict' | sort | uniq -c

# Verify response logging
hubble observe --type l7 --last 100 -o json | \
    jq -r '.flow.l7.type' | sort | uniq -c
```

## Troubleshooting

**Problem: Logs appear for HTTP but not for custom protocol**
Ensure your parser calls `p.connection.Log()` with a `cilium.LogEntry_GenericL7` value. HTTP logging is handled by Envoy, but custom proxylib parsers must emit their own generic L7 log entries.

**Problem: Log timestamps are inconsistent across nodes**
Use NTP-synchronized clocks and always log in UTC. If precision is critical, include monotonic timestamps alongside wall clock time.

**Problem: Hubble observe shows no protocol field**
Check that the `Proto` field is set in your `cilium.L7LogEntry`. Some Hubble filters are oriented around built-in protocols such as HTTP, DNS, and Kafka, so verify custom protocol entries with raw Hubble API output.

**Problem: Log volume overwhelms storage**
Implement per-connection or per-endpoint sampling. Log 100% of denied requests but sample allowed requests at a configurable rate (e.g., 10%).

## Conclusion

Troubleshooting access logging requires tracing the log entry from creation in the parser, through the Cilium agent, to Hubble. Missing entries usually indicate code paths that skip the logging call, while incorrect metadata points to parameter mapping errors. Hubble integration issues are typically configuration problems. Systematic checking of each pipeline stage identifies the failure point efficiently.
