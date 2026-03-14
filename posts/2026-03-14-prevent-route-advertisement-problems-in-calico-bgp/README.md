# Preventing Route Advertisement Problems in Calico BGP

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, BGP

Description: Implement proactive measures to prevent BGP route advertisement failures in Calico, including configuration best practices, monitoring, and network infrastructure alignment.

---

## Introduction

BGP route advertisement problems in Calico can be prevented by establishing correct configurations from the start, monitoring BGP health continuously, and aligning cluster networking with your infrastructure. Most BGP issues in production trace back to initial misconfigurations that were not caught during setup or infrastructure changes that broke assumptions Calico depends on.

Prevention is especially important for BGP because route advertisement failures can cascade. When one node loses its BGP session, pods on that node become unreachable from the rest of the cluster, and services that depend on those pods start failing.

This guide covers configuration best practices, automated health checks, and infrastructure alignment strategies that prevent BGP route advertisement problems before they occur.

## Prerequisites

- A Kubernetes cluster with Calico configured for BGP networking
- `kubectl` and `calicoctl` with cluster-admin access
- Access to network infrastructure team for firewall and routing coordination
- Prometheus and Grafana for monitoring

## BGP Configuration Best Practices

Start with a validated BGP configuration that accounts for common failure modes:

```yaml
# bgp-configuration-production.yaml
# Production-ready BGP configuration for Calico
apiVersion: projectcalico.org/v3
kind: BGPConfiguration
metadata:
  name: default
spec:
  # Use Info for production, Debug only for troubleshooting
  logSeverityScreen: Info
  # For clusters under 50 nodes, full mesh is simpler and more resilient
  # For larger clusters, disable and use route reflectors
  nodeToNodeMeshEnabled: true
  # Use a private AS number from the 64512-65534 range
  asNumber: 64512
  # Enable graceful restart to handle calico-node restarts without route withdrawal
  nodeMeshMaxRestartTime: 120s
```

```yaml
# ip-pool-production.yaml
# IP pool with correct BGP advertisement settings
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  blockSize: 26
  # Use CrossSubnet for multi-subnet deployments
  # Use Never if all nodes are on the same L2 segment
  ipipMode: CrossSubnet
  vxlanMode: Never
  natOutgoing: true
  nodeSelector: all()
```

Apply and validate:

```bash
# Apply the production BGP configuration
calicoctl apply -f bgp-configuration-production.yaml
calicoctl apply -f ip-pool-production.yaml

# Validate the configuration
calicoctl get bgpconfiguration default -o yaml
calicoctl get ippool default-ipv4-ippool -o yaml
```

## Infrastructure Alignment Checklist

Ensure your network infrastructure supports Calico BGP:

```bash
#!/bin/bash
# bgp-infrastructure-check.sh
# Validates network infrastructure supports Calico BGP

echo "=== BGP Infrastructure Validation ==="

# Check 1: Port 179 connectivity between all node pairs
NODES=$(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')
NODE_ARRAY=($NODES)

echo "Checking BGP port 179 connectivity..."
for i in "${!NODE_ARRAY[@]}"; do
  for j in "${!NODE_ARRAY[@]}"; do
    if [ "$i" != "$j" ]; then
      # Use a timeout to avoid hanging
      timeout 3 bash -c "echo >/dev/tcp/${NODE_ARRAY[$j]}/179" 2>/dev/null
      if [ $? -eq 0 ]; then
        echo "  ${NODE_ARRAY[$i]} -> ${NODE_ARRAY[$j]}:179 OK"
      else
        echo "  ${NODE_ARRAY[$i]} -> ${NODE_ARRAY[$j]}:179 BLOCKED"
      fi
    fi
  done
done

# Check 2: IP-in-IP protocol (protocol 4) allowed if using IPIP mode
echo ""
echo "Checking IPIP protocol support..."
IPPOOL_MODE=$(calicoctl get ippool default-ipv4-ippool -o json | python3 -c "
import sys, json
pool = json.load(sys.stdin)
print(pool['spec'].get('ipipMode', 'Never'))
")
echo "  IPIP Mode: $IPPOOL_MODE"
if [ "$IPPOOL_MODE" != "Never" ]; then
  echo "  Ensure IP protocol 4 (IPIP) is allowed in security groups/firewalls"
fi
```

## Monitoring BGP Session Health

Set up Prometheus alerts for BGP issues:

```yaml
# bgp-monitoring-alerts.yaml
# Prometheus alerts for Calico BGP health
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-bgp-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: calico.bgp
      rules:
        - alert: CalicoBGPSessionDown
          expr: |
            bird_protocol_up{protocol=~"Mesh_.*|Global_.*"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Calico BGP session down on {{ $labels.node }}"
            description: "BGP session {{ $labels.protocol }} on {{ $labels.node }} has been down for 5 minutes."
        - alert: CalicoNodeNotReady
          expr: |
            kube_daemonset_status_number_unavailable{daemonset="calico-node"} > 0
          for: 3m
          labels:
            severity: critical
          annotations:
            summary: "Calico node pods unavailable"
            description: "{{ $value }} calico-node pods are not ready, which will prevent BGP route advertisement."
```

```bash
kubectl apply -f bgp-monitoring-alerts.yaml

# Verify Felix exports BGP metrics
kubectl exec -n calico-system $(kubectl get pod -n calico-system \
  -l k8s-app=calico-node -o jsonpath='{.items[0].metadata.name}') -- \
  wget -qO- http://localhost:9091/metrics | grep bird
```

## Change Management for BGP Configuration

Prevent configuration drift and accidental changes:

```yaml
# bgp-config-validation-policy.yaml
# Kyverno policy to validate BGP configuration changes
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: validate-bgp-configuration
spec:
  validationFailureAction: Audit
  rules:
    - name: validate-as-number
      match:
        any:
          - resources:
              kinds:
                - BGPConfiguration
      validate:
        message: "AS number must be in the private range 64512-65534"
        pattern:
          spec:
            asNumber: "64512-65534"
```

## Verification

Test the prevention measures are working:

```bash
# Verify all BGP sessions are Established
calicoctl node status

# Verify routes are present on all nodes
EXPECTED_ROUTES=$(($(kubectl get nodes --no-headers | wc -l) - 1))
for NODE in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  ACTUAL=$(kubectl debug node/$NODE -it --image=nicolaka/netshoot -- \
    ip route show proto bird 2>/dev/null | wc -l)
  echo "$NODE: $ACTUAL routes (expected >= $EXPECTED_ROUTES)"
done

# Verify Prometheus alerts are loaded
curl -s http://localhost:9090/api/v1/rules | python3 -c "
import sys, json
for g in json.load(sys.stdin)['data']['groups']:
  for r in g['rules']:
    if 'bgp' in r['name'].lower() or 'calico' in r['name'].lower():
      print(f'  {r[\"name\"]}: {r[\"state\"]}')
"
```

## Troubleshooting

- **BGP sessions flap during node upgrades**: Configure `nodeMeshMaxRestartTime` in BGPConfiguration to allow graceful restart during calico-node pod restarts. A value of 120 seconds covers most upgrade scenarios.
- **New nodes join without BGP peering**: Ensure the node-to-node mesh is enabled, or if using route reflectors, verify the BGPPeer nodeSelector matches the new node's labels.
- **Cloud provider resets security groups**: Use infrastructure-as-code (Terraform, CloudFormation) to define security group rules that include BGP port 179 and IPIP protocol 4.
- **AS number conflicts with existing network infrastructure**: Coordinate with your network team to select an AS number that does not conflict with existing BGP routers on your network.

## Conclusion

Preventing BGP route advertisement problems requires getting the initial configuration right, continuously monitoring BGP session health, aligning with network infrastructure requirements, and controlling configuration changes. The combination of validated BGP configuration, infrastructure checks, Prometheus alerting, and change management policies creates a resilient BGP networking layer for your Calico deployment.
