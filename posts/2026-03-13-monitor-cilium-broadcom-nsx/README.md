# Monitor Cilium with Broadcom NSX Integration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, VMware, NSX, eBPF

Description: Learn how to monitor Cilium's integration with Broadcom NSX networking infrastructure, ensuring consistent policy enforcement and connectivity between Kubernetes workloads and NSX-managed network...

---

## Introduction

Broadcom NSX provides software-defined networking for enterprise data centers, and when Kubernetes is deployed in NSX-managed environments, integrating Cilium with NSX enables consistent network policy enforcement across both container and virtual machine workloads. Cilium can operate on nodes connected to NSX segments while using NSX Distributed Firewall rules alongside CiliumNetworkPolicy for defense-in-depth security.

Monitoring this integration requires visibility into both the Cilium data plane (eBPF metrics, Hubble flows) and the NSX control plane (segment health, DFW rule hits, BGP state). Disconnects between the two layers - such as NSX segment changes that affect Cilium node connectivity - can cause subtle network disruptions that are difficult to trace without monitoring both systems simultaneously.

This guide covers monitoring the Cilium-NSX integration, validating connectivity across the boundary, and alerting on integration health.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+ deployed on NSX-managed nodes
- NSX-T 3.2+ or NSX 4.x with Kubernetes integration configured
- `kubectl` with cluster-admin access
- `cilium` CLI v0.15+ installed
- NSX API or NSX Manager UI access for policy verification
- Hubble CLI for Cilium flow observability

## Step 1: Verify Cilium Node Connectivity to NSX Segments

Confirm that Cilium agents on each node can communicate through NSX-managed segments.

Check Cilium agent connectivity and NSX segment reachability:

```bash
# Check Cilium agent status on all nodes
cilium status --wait

# List Cilium endpoints and verify they have NSX-assigned IPs
kubectl get ciliumnodes -o yaml | grep -E "ipam:|addresses:"

# Test connectivity from Cilium pods to NSX gateway IPs
for node in $(kubectl get nodes -o name); do
  echo "Testing node: $node"
  kubectl debug $node -it --image=nicolaka/netshoot -- \
    ping -c3 <nsx-gateway-ip> 2>/dev/null | tail -3
done
```

## Step 2: Monitor Hubble Flows Across NSX Segments

Use Hubble to observe traffic flows between pods on different NSX segments.

Enable Hubble and observe cross-segment traffic patterns:

```bash
# Enable Hubble if not already active
cilium hubble enable

# Port-forward Hubble relay for CLI access
cilium hubble port-forward &

# Monitor all traffic flows including cross-segment
hubble observe --follow --all-namespaces

# Filter for traffic between specific NSX segments (by IP range)
hubble observe --follow --output json | \
  jq 'select(.flow.ip.source | startswith("10.10.")) | 
      {src: .flow.ip.source, dst: .flow.ip.destination, verdict: .flow.verdict}'

# Alert on dropped flows indicating NSX DFW blocks
hubble observe --verdict DROPPED --follow
```

## Step 3: Validate CiliumNetworkPolicy and NSX DFW Consistency

Ensure that Cilium policies and NSX Distributed Firewall rules are consistent and not conflicting.

Compare CiliumNetworkPolicy rules with NSX DFW rules for the same workloads:

```bash
# List all CiliumNetworkPolicies
kubectl get ciliumnetworkpolicies -A -o wide

# Show detailed policy for a specific workload
kubectl get ciliumnetworkpolicy <policy-name> -n <namespace> -o yaml

# Check Cilium endpoint policy enforcement status
kubectl exec -n kube-system \
  $(kubectl get pod -n kube-system -l k8s-app=cilium -o name | head -1) \
  -- cilium endpoint list --output json | \
  jq '.[] | {id: .id, labels: .status.labels, policy: .status.policy}'
```

## Step 4: Monitor NSX and Cilium Integration Health

Create health checks that span both the NSX and Cilium control planes.

Run periodic connectivity tests between NSX-managed VMs and Kubernetes pods:

```yaml
# nsx-connectivity-test.yaml - CronJob to test NSX-Kubernetes connectivity
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nsx-cilium-connectivity-test
  namespace: monitoring
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: connectivity-test
            image: curlimages/curl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Test connectivity from pod to NSX-managed service
              if curl -sf --connect-timeout 5 http://<nsx-service-ip>/health; then
                echo "NSX connectivity: OK"
              else
                echo "NSX connectivity: FAILED" >&2
                exit 1
              fi
          restartPolicy: Never
```

Apply the connectivity test CronJob:

```bash
kubectl apply -f nsx-connectivity-test.yaml
```

## Step 5: Create Integrated Monitoring Dashboard

Build a monitoring view that combines Cilium and NSX metrics.

Configure Prometheus to collect Cilium metrics alongside NSX monitoring:

```yaml
# cilium-nsx-servicemonitor.yaml - monitor Cilium metrics in NSX environment
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: cilium-agent-metrics
  namespace: monitoring
spec:
  namespaceSelector:
    matchNames:
    - kube-system
  selector:
    matchLabels:
      k8s-app: cilium
  endpoints:
  - port: prometheus
    interval: 15s
    # Key NSX-relevant metrics:
    # - cilium_drop_count_total (drops indicating NSX DFW blocks)
    # - cilium_forward_count_total (successful cross-segment flows)
    # - cilium_endpoint_state (endpoint health)
```

Apply the ServiceMonitor:

```bash
kubectl apply -f cilium-nsx-servicemonitor.yaml
```

## Best Practices

- Align Cilium network policy rules with NSX DFW rules to avoid redundant or conflicting enforcement
- Enable Hubble L7 visibility for HTTP and gRPC traffic crossing NSX segment boundaries
- Monitor both Cilium endpoint health and NSX segment availability to catch integration failures early
- Use NSX tags to label VM workloads and mirror those labels in Kubernetes node labels for consistent policy targeting
- Configure OneUptime to monitor critical cross-boundary service endpoints and alert on availability degradation

## Conclusion

Integrating Cilium with Broadcom NSX enables consistent network policy enforcement across containerized and virtualized workloads, but requires careful monitoring of both control planes. By using Hubble for Cilium-side visibility and NSX monitoring APIs for the infrastructure side, you can maintain comprehensive observability across the integration boundary. Use OneUptime synthetic checks to validate cross-boundary connectivity from an application perspective and alert quickly on integration failures.
