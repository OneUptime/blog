# Automating Cilium BGP Peer Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, BGP, Peer, Automation, Monitoring

Description: Automate BGP peer status collection and alerting using cilium-dbg bgp peers across all Cilium nodes.

---

## Introduction

Cilium supports BGP for advertising pod and service CIDRs to external network infrastructure. The `cilium-dbg bgp peers` command provides visibility into BGP peer session information on each Cilium node.



This guide covers automating cilium-dbg bgp peers for monitoring and alerting.

## Prerequisites

- Kubernetes cluster with Cilium and BGP enabled
- BGP peering configured via Cilium BGP resources, such as CiliumBGPClusterConfig and CiliumBGPPeerConfig
- `kubectl` access to cilium pods
- `jq` for JSON processing

## Automated Peers Collection

```bash
#!/bin/bash
# collect-bgp-peers-state.sh

set -euo pipefail

NAMESPACE="${CILIUM_NAMESPACE:-kube-system}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="/tmp/cilium-bgp-peers-$TIMESTAMP"
mkdir -p "$OUTPUT_DIR"

PODS=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{range .items[*]}{.metadata.name},{.spec.nodeName}{"\n"}{end}')

HEALTHY=0
UNHEALTHY=0

while IFS=',' read -r pod node; do
  [ -z "$pod" ] && continue
  echo "Collecting from $node..."

  if ! OUTPUT=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg bgp peers -o json 2>/dev/null); then
    echo "FAILED" > "$OUTPUT_DIR/${node}.txt"
    UNHEALTHY=$((UNHEALTHY + 1))
    continue
  fi

  echo "$OUTPUT" | jq . > "$OUTPUT_DIR/${node}.json"

  PEERS=$(echo "$OUTPUT" | jq '[.. | objects | select(has("session-state")) | ."session-state"]')
  TOTAL=$(echo "$PEERS" | jq 'length')
  NOT_ESTABLISHED=$(echo "$PEERS" | jq '[.[] | select(. != "established")] | length')

  if [ "$TOTAL" -gt 0 ] && [ "$NOT_ESTABLISHED" -eq 0 ]; then
    HEALTHY=$((HEALTHY + 1))
  else
    UNHEALTHY=$((UNHEALTHY + 1))
  fi
done <<< "$PODS"

echo "Results: $HEALTHY healthy, $UNHEALTHY unhealthy"
echo "Output: $OUTPUT_DIR"
```

### Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cilium-bgp-peers-monitor
  namespace: kube-system
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: cilium
          containers:
          - name: monitor
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              PODS=$(kubectl -n kube-system get pods -l k8s-app=cilium \
                -o jsonpath='{.items[*].metadata.name}')
              FAIL=0
              for pod in $PODS; do
                STATES=$(kubectl -n kube-system exec "$pod" -c cilium-agent -- \
                  cilium-dbg bgp peers -o jsonpath='{range [*]}{.session-state}{"\n"}{end}' 2>/dev/null) || {
                  FAIL=$((FAIL + 1))
                  continue
                }
                if [ -z "$STATES" ] || echo "$STATES" | grep -vq '^established$'; then
                  FAIL=$((FAIL + 1))
                fi
              done
              [ "$FAIL" -gt 0 ] && exit 1 || exit 0
          restartPolicy: OnFailure
```

### Alerting Integration

```bash
#!/bin/bash
# alert-bgp-peers.sh
NAMESPACE="kube-system"

PODS=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{.items[*].metadata.name}')

for pod in $PODS; do
  NODE=$(kubectl -n "$NAMESPACE" get pod "$pod" -o jsonpath='{.spec.nodeName}')
  OUTPUT=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg bgp peers -o json 2>/dev/null) || {
    echo "ALERT: bgp peers check failed on $NODE"
    continue
  }

  TOTAL=$(echo "$OUTPUT" | jq '[.. | objects | select(has("session-state")) | ."session-state"] | length')
  NOT_ESTABLISHED=$(echo "$OUTPUT" | jq '[.. | objects | select(has("session-state")) | ."session-state" | select(. != "established")] | length')
  if [ "$TOTAL" -eq 0 ] || [ "$NOT_ESTABLISHED" -gt 0 ]; then
    echo "ALERT: bgp peers not established on $NODE"
  fi
done
```

## Verification

```bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

# Verify command works
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp peers -o json 2>/dev/null | jq .

# Verify automation/parsing
bash collect-bgp-peers-state.sh
```

## Troubleshooting

- **"BGP Control Plane is disabled"**: Enable Cilium BGP Control Plane with `bgpControlPlane.enabled=true`.
- **Empty output**: No BGP peering resources may be configured. Check `kubectl get ciliumbgpclusterconfigs,ciliumbgppeerconfigs,ciliumbgpadvertisements`.
- **Peers not establishing**: Verify network connectivity to peer on TCP/179 and ASN configuration.
- **Timeout on large clusters**: Add `--request-timeout=120s` to kubectl commands.

## Conclusion

Automating `cilium-dbg bgp peers` enables continuous monitoring of BGP peer sessions on Cilium nodes. This enables proactive detection of BGP issues and integration with alerting systems.
