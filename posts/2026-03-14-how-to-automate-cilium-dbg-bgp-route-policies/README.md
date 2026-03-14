# Automating Cilium BGP Route Policy Validation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, BGP, Route Policies, Automation, Compliance

Description: Automate BGP route policy validation using cilium-dbg bgp route-policies for consistent policy auditing.

---

## Introduction

Cilium supports BGP for advertising pod and service CIDRs to external network infrastructure. The `cilium-dbg bgp route-policies` command provides visibility into BGP route policy configuration on each Cilium node.



This guide covers automating cilium-dbg bgp route-policies for monitoring and alerting.

## Prerequisites

- Kubernetes cluster with Cilium and BGP enabled
- BGP peering configured via CiliumBGPPeeringPolicy
- `kubectl` access to cilium pods
- `jq` for JSON processing
- 

## Automated Route-Policies Collection

```bash
#!/bin/bash
# collect-bgp-route-policies-state.sh
set -euo pipefail

NAMESPACE="${CILIUM_NAMESPACE:-kube-system}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_DIR="/tmp/cilium-bgp-route-policies-$TIMESTAMP"
mkdir -p "$OUTPUT_DIR"

PODS=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{range .items[*]}{.metadata.name},{.spec.nodeName}{"\n"}{end}')

HEALTHY=0
UNHEALTHY=0

while IFS=',' read -r pod node; do
  [ -z "$pod" ] && continue
  echo "Collecting from $node..."

  OUTPUT=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg bgp route-policies 2>/dev/null || echo "FAILED")

  echo "$OUTPUT" > "$OUTPUT_DIR/${node}.txt"

  if [ "$OUTPUT" != "FAILED" ] && [ -n "$OUTPUT" ]; then
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
  name: cilium-bgp-route-policies-monitor
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
                OUTPUT=$(kubectl -n kube-system exec "$pod" -c cilium-agent -- \
                  cilium-dbg bgp route-policies 2>/dev/null || echo "FAILED")
                if [ "$OUTPUT" = "FAILED" ]; then
                  FAIL=$((FAIL + 1))
                fi
              done
              [ "$FAIL" -gt 0 ] && exit 1 || exit 0
          restartPolicy: OnFailure
```

### Alerting Integration

```bash
#!/bin/bash
# alert-bgp-route-policies.sh
NAMESPACE="kube-system"

PODS=$(kubectl -n "$NAMESPACE" get pods -l k8s-app=cilium \
  -o jsonpath='{.items[*].metadata.name}')

for pod in $PODS; do
  OUTPUT=$(kubectl -n "$NAMESPACE" exec "$pod" -c cilium-agent -- \
    cilium-dbg bgp route-policies 2>/dev/null || echo "FAILED")
  if [ "$OUTPUT" = "FAILED" ]; then
    NODE=$(kubectl -n "$NAMESPACE" get pod "$pod" -o jsonpath='{.spec.nodeName}')
    echo "ALERT: bgp route-policies check failed on $NODE"
  fi
done
```

## Verification

```bash
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium \
  -o jsonpath='{.items[0].metadata.name}')

# Verify command works
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- \
  cilium-dbg bgp route-policies 2>/dev/null && echo "Command succeeded"

# Verify automation/parsing
bash collect-bgp-route-policies-state.sh
```

## Troubleshooting

- **"BGP is not enabled"**: Set `enable-bgp-control-plane: "true"` in cilium-config.
- **Empty output**: No BGP peering policy may be configured. Check `kubectl get ciliumbgppeeringpolicies`.
- **No policies displayed**: Ensure route policy is defined in the CiliumBGPPeeringPolicy.
- **Timeout on large clusters**: Add `--request-timeout=120s` to kubectl commands.

## Conclusion

Automating `cilium-dbg bgp route-policies` enables continuous monitoring of BGP route policies on Cilium nodes. This enables proactive detection of BGP issues and integration with alerting systems.
