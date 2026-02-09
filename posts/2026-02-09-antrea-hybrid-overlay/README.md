# How to use Antrea for hybrid overlay and no-encap modes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Antrea, Networking, CNI, Overlay

Description: Configure Antrea CNI for hybrid overlay and no-encapsulation modes in Kubernetes including setup, traffic mode selection, performance optimization, and integration with network policies for flexible deployment options.

---

Antrea is a Kubernetes CNI that leverages Open vSwitch (OVS) for networking and supports multiple traffic modes. The hybrid overlay mode tunnels traffic between different subnets while using direct routing within the same subnet. No-encap mode eliminates tunneling entirely, routing pod traffic natively through your network. This guide shows you how to configure and optimize these modes for your specific requirements.

## Understanding Antrea Traffic Modes

Antrea supports three primary traffic modes. Encap mode (default) tunnels all pod-to-pod traffic using GENEVE or VXLAN, working in any network environment but adding overhead. NoEncap mode uses native routing without any tunneling, offering best performance but requiring network infrastructure that supports pod CIDRs. Hybrid mode combines both, tunneling across subnets but routing directly within subnets.

The choice depends on your infrastructure. If your network supports pod CIDR routing (like in cloud environments with VPC routing), use NoEncap. If you have multiple Layer 2 segments or can't modify network routing, use Hybrid. For environments with strict network isolation or when you can't advertise pod CIDRs, stick with Encap.

## Installing Antrea with Hybrid Mode

Deploy Antrea with hybrid overlay configuration:

```bash
# Download Antrea manifest
curl -L https://github.com/antrea-io/antrea/releases/download/v1.14.0/antrea.yml -o antrea.yml

# Edit the ConfigMap to enable hybrid mode
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: antrea-config
  namespace: kube-system
data:
  antrea-agent.conf: |
    trafficEncapMode: hybrid
    noSNAT: false
    tunnelType: geneve
    trafficEncryptionMode: none
    enablePrometheusMetrics: true
    flowExporter:
      enable: true
EOF

# Apply the Antrea manifest
kubectl apply -f antrea.yml

# Wait for Antrea pods to be ready
kubectl rollout status daemonset/antrea-agent -n kube-system
kubectl rollout status deployment/antrea-controller -n kube-system
```

Verify hybrid mode is active:

```bash
# Check agent configuration
kubectl -n kube-system exec -it antrea-agent-xxxxx -c antrea-agent -- \
  antctl get agentinfo -o yaml | grep trafficEncapMode

# Should show: trafficEncapMode: hybrid
```

## Configuring NoEncap Mode

For environments with full pod CIDR routing, enable NoEncap mode for maximum performance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: antrea-config
  namespace: kube-system
data:
  antrea-agent.conf: |
    trafficEncapMode: noEncap
    noSNAT: false
    egress:
      exceptCIDRs: []
    nodePortLocal:
      enable: true
      portRange: "61000-62000"
    enablePrometheusMetrics: true
```

Update Antrea to use the new configuration:

```bash
kubectl apply -f antrea-config.yaml

# Restart Antrea agents
kubectl -n kube-system rollout restart daemonset/antrea-agent
```

Configure your network to route pod CIDRs. In AWS:

```bash
# Get node pod CIDRs
kubectl get nodes -o json | jq -r '.items[] | "\(.metadata.name) \(.spec.podCIDR)"'

# Add routes to VPC route table for each node
aws ec2 create-route \
  --route-table-id rtb-xxxxx \
  --destination-cidr-block 10.244.1.0/24 \
  --instance-id i-node1

# Repeat for each node
```

In Google Cloud with GKE:

```bash
# Enable IP alias networking (already done for most GKE clusters)
gcloud container clusters create my-cluster \
  --enable-ip-alias \
  --network=my-network \
  --subnetwork=my-subnet

# GKE automatically handles pod CIDR routing
```

## Understanding Hybrid Mode Behavior

Hybrid mode makes intelligent routing decisions. For pods on the same node, traffic goes through OVS directly. For pods on different nodes but same subnet (same L2 domain), traffic routes without tunneling. For pods on different subnets, traffic uses GENEVE/VXLAN tunneling.

Check how specific traffic flows:

```bash
# Create test pods in different scenarios
kubectl run pod-a --image=nginx:1.21 --labels=app=pod-a
kubectl run pod-b --image=nginx:1.21 --labels=app=pod-b

# Get pod details
POD_A_NODE=$(kubectl get pod pod-a -o jsonpath='{.spec.nodeName}')
POD_A_IP=$(kubectl get pod pod-a -o jsonpath='{.status.podIP}')
POD_B_NODE=$(kubectl get pod pod-b -o jsonpath='{.spec.nodeName}')
POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')

echo "Pod A: $POD_A_IP on $POD_A_NODE"
echo "Pod B: $POD_B_IP on $POD_B_NODE"

# Check OVS flows to see if tunneling is used
kubectl -n kube-system exec -it antrea-agent-xxxxx -c antrea-ovs -- \
  ovs-ofctl dump-flows br-int | grep $POD_B_IP
```

If you see `tun_id` or `set_tunnel` actions, traffic is being tunneled. Without these, it's direct routing.

## Optimizing OVS Performance

Tune OVS for better performance:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: antrea-config
  namespace: kube-system
data:
  antrea-agent.conf: |
    trafficEncapMode: hybrid
    ovsDatapathType: system
    ovsBridges:
      - bridgeName: br-int
        datapathType: system
    tlsCipherSuites: "TLS_ECDHE_ECDSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256"
    enablePrometheusMetrics: true
```

Enable OVS hardware offloading if your NICs support it:

```bash
# Check NIC capabilities
ethtool -k eth0 | grep hw-tc-offload

# Enable TC offload
ethtool -K eth0 hw-tc-offload on

# Configure Antrea to use hardware offloading
kubectl patch configmap antrea-config -n kube-system --type merge -p '
{
  "data": {
    "antrea-agent.conf": "trafficEncapMode: hybrid\novsDatapathType: netdev\n"
  }
}'
```

## Implementing Network Policies with Antrea

Antrea provides native NetworkPolicy support plus extensions:

```yaml
apiVersion: crd.antrea.io/v1alpha1
kind: ClusterNetworkPolicy
metadata:
  name: strict-ns-isolation
spec:
  priority: 1
  tier: securityops
  appliedTo:
    - namespaceSelector:
        matchLabels:
          env: production
  ingress:
    - action: Allow
      from:
        - namespaceSelector:
            matchLabels:
              env: production
    - action: Drop
  egress:
    - action: Allow
      to:
        - namespaceSelector:
            matchLabels:
              env: production
    - action: Allow
      ports:
        - protocol: TCP
          port: 443
      to:
        - fqdn: "*.amazonaws.com"
    - action: Drop
```

Antrea's ClusterNetworkPolicy works across namespaces and supports:
- Priority-based rule ordering
- FQDN-based egress rules
- Named tiers for policy organization
- Logging and auditing of policy decisions

Apply the policy:

```bash
kubectl apply -f cluster-network-policy.yaml

# View applied policies
kubectl get clusternetworkpolicies
kubectl get acnp
```

## Monitoring Antrea Traffic

Check traffic flow and performance:

```bash
# View Antrea metrics
kubectl -n kube-system port-forward ds/antrea-agent 10349:10349

# Access metrics endpoint
curl http://localhost:10349/metrics

# Key metrics to monitor
curl -s http://localhost:10349/metrics | grep -E "antrea_agent_ovs|antrea_agent_egress|antrea_agent_ingress"
```

Enable flow exporter for detailed traffic visibility:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: antrea-config
  namespace: kube-system
data:
  antrea-agent.conf: |
    trafficEncapMode: hybrid
    flowExporter:
      enable: true
      flowCollectorAddr: "flow-aggregator.flow-visibility.svc:4739"
      flowPollInterval: "5s"
      activeFlowTimeout: "60s"
      idleFlowTimeout: "15s"
```

Deploy flow aggregator to collect and analyze flows:

```bash
kubectl apply -f https://raw.githubusercontent.com/antrea-io/antrea/main/build/yamls/flow-aggregator.yml

# Query flow records
kubectl -n flow-visibility logs deployment/flow-aggregator
```

## Troubleshooting Traffic Modes

Verify traffic mode is working correctly:

```bash
# Check OVS configuration
kubectl -n kube-system exec -it antrea-agent-xxxxx -c antrea-ovs -- \
  ovs-vsctl show

# View tunnel interfaces (present in hybrid/encap mode)
kubectl -n kube-system exec -it antrea-agent-xxxxx -c antrea-ovs -- \
  ovs-vsctl list interface | grep -A 5 genev_sys

# Check routing table for NoEncap mode
kubectl -n kube-system exec -it antrea-agent-xxxxx -c antrea-agent -- \
  ip route show

# Trace packet path
kubectl -n kube-system exec -it antrea-agent-xxxxx -c antrea-ovs -- \
  ovs-appctl ofproto/trace br-int in_port=1,ip,nw_src=$POD_A_IP,nw_dst=$POD_B_IP
```

Common issues:

```bash
# Issue: Connectivity broken after switching modes
# Restart all pods to get new network config
kubectl delete pods --all --all-namespaces

# Issue: High CPU usage in hybrid mode
# Check OVS flows aren't too complex
kubectl -n kube-system exec -it antrea-agent-xxxxx -c antrea-ovs -- \
  ovs-ofctl dump-flows br-int | wc -l

# If > 10000 flows, consider using NoEncap mode

# Issue: NoEncap mode not working
# Verify pod CIDRs are routable
for node in $(kubectl get nodes -o name); do
  POD_CIDR=$(kubectl get $node -o jsonpath='{.spec.podCIDR}')
  NODE_IP=$(kubectl get $node -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}')
  echo "Testing route to $POD_CIDR via $NODE_IP"
  ping -c 1 $(echo $POD_CIDR | sed 's|/.*||').1
done
```

## Comparing Traffic Modes Performance

Benchmark different modes:

```bash
# Install iperf3 pods
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: iperf-server
spec:
  containers:
  - name: iperf3
    image: networkstatic/iperf3
    command: ["iperf3", "-s"]
---
apiVersion: v1
kind: Pod
metadata:
  name: iperf-client
spec:
  containers:
  - name: iperf3
    image: networkstatic/iperf3
    command: ["sleep", "3600"]
EOF

# Test with current mode
SERVER_IP=$(kubectl get pod iperf-server -o jsonpath='{.status.podIP}')
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 30

# Record throughput, then switch modes and retest
```

Typical results:
- NoEncap: Best throughput (10% better than Hybrid), lowest latency
- Hybrid: Good performance within subnet, slight overhead across subnets
- Encap: Highest CPU usage, 5-15% throughput reduction

Antrea's flexible traffic modes let you balance performance and network requirements. Hybrid mode provides a good middle ground, while NoEncap mode offers maximum performance when your infrastructure supports native pod routing. Choose based on your network topology, infrastructure capabilities, and performance needs.
