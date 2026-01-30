# How to Create Fencing Mechanisms

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: High Availability, Fencing, Clustering, STONITH

Description: Learn how to implement fencing mechanisms to prevent split-brain scenarios.

---

In high availability clusters, split-brain scenarios are the nightmare that keeps SREs awake at night. When nodes lose communication with each other, they might both assume they're the primary and start making conflicting changes to shared resources. Fencing mechanisms are your defense against this chaos.

## What is Fencing?

Fencing is the process of isolating a malfunctioning or unreachable node from shared cluster resources. Think of it as a circuit breaker for your cluster - when something goes wrong, fencing ensures only healthy nodes can access shared storage and services.

```mermaid
flowchart TB
    subgraph Normal Operation
        N1[Node 1] <--> HB1[Heartbeat] <--> N2[Node 2]
        N1 --> S1[(Shared Storage)]
        N2 --> S1
    end

    subgraph Split Brain Scenario
        N3[Node 1] -.-x|Lost Connection|x-.- N4[Node 2]
        N3 -->|Write| S2[(Shared Storage)]
        N4 -->|Write| S2
        S2 -->|Data Corruption!| CORRUPT[Corrupted Data]
    end

    subgraph With Fencing
        N5[Node 1] -.-x|Lost Connection|x-.- N6[Node 2]
        N5 -->|Fence| STONITH[STONITH Device]
        STONITH -->|Power Off| N6
        N5 -->|Safe Write| S3[(Shared Storage)]
    end
```

## Types of Fencing

### 1. Power Fencing (STONITH)

STONITH (Shoot The Other Node In The Head) is the most reliable fencing method. It physically powers off the problematic node, guaranteeing it cannot access shared resources.

```mermaid
flowchart LR
    subgraph Power Fencing Methods
        IPMI[IPMI/iLO/DRAC]
        PDU[Smart PDU]
        VM[Hypervisor API]
        Cloud[Cloud Provider API]
    end

    Node[Healthy Node] --> |Fence Command| IPMI
    Node --> |Fence Command| PDU
    Node --> |Fence Command| VM
    Node --> |Fence Command| Cloud

    IPMI --> |Power Off| Target1[Target Node]
    PDU --> |Cut Power| Target2[Target Node]
    VM --> |VM Destroy| Target3[Target VM]
    Cloud --> |Instance Stop| Target4[Target Instance]
```

### 2. Storage Fencing

Storage fencing blocks a node's access to shared storage without powering it off. This is useful when you want to preserve the node for debugging.

### 3. Network Fencing

Network fencing isolates a node by blocking its network access. This prevents it from communicating with clients or other services.

## STONITH Configuration with Pacemaker

Pacemaker is the most widely used cluster resource manager, and it has excellent STONITH support.

### Basic STONITH Setup

```bash
# List available fence agents
pcs stonith list

# Common fence agents:
# fence_ipmilan - IPMI LAN
# fence_vmware_soap - VMware vSphere
# fence_aws - AWS EC2
# fence_gce - Google Compute Engine
# fence_azure_arm - Azure Resource Manager
```

### IPMI/iLO Fencing Configuration

```bash
# Configure IPMI fencing for node1
pcs stonith create fence-node1 fence_ipmilan \
    pcmk_host_list="node1" \
    ipaddr="192.168.1.101" \
    login="admin" \
    passwd="secret" \
    lanplus="true" \
    power_timeout="30" \
    op monitor interval="60s"

# Configure IPMI fencing for node2
pcs stonith create fence-node2 fence_ipmilan \
    pcmk_host_list="node2" \
    ipaddr="192.168.1.102" \
    login="admin" \
    passwd="secret" \
    lanplus="true" \
    power_timeout="30" \
    op monitor interval="60s"

# Set location constraints - node shouldn't fence itself
pcs constraint location fence-node1 avoids node1
pcs constraint location fence-node2 avoids node2
```

### VMware vSphere Fencing

```bash
# Configure VMware fencing
pcs stonith create fence-vmware fence_vmware_soap \
    pcmk_host_map="node1:vm-node1;node2:vm-node2" \
    ipaddr="vcenter.example.com" \
    ssl="1" \
    ssl_insecure="1" \
    login="fence-user@vsphere.local" \
    passwd="secret" \
    op monitor interval="60s"

# Verify configuration
pcs stonith config fence-vmware
```

### AWS EC2 Fencing

```bash
# Configure AWS fencing
pcs stonith create fence-aws fence_aws \
    pcmk_host_map="node1:i-0abc123def;node2:i-0def456abc" \
    region="us-east-1" \
    access_key="AKIAIOSFODNN7EXAMPLE" \
    secret_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" \
    op monitor interval="60s"
```

For production, use IAM roles instead of access keys:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:DescribeInstances",
                "ec2:StopInstances",
                "ec2:StartInstances",
                "ec2:RebootInstances"
            ],
            "Resource": "*"
        }
    ]
}
```

### Google Cloud Platform Fencing

```bash
# Configure GCE fencing
pcs stonith create fence-gce fence_gce \
    pcmk_host_map="node1:instance-1;node2:instance-2" \
    project="my-project" \
    zone="us-central1-a" \
    op monitor interval="60s"

# Ensure the service account has compute.instances.stop permission
```

### Azure Fencing

```bash
# Configure Azure fencing
pcs stonith create fence-azure fence_azure_arm \
    pcmk_host_map="node1:vm-node1;node2:vm-node2" \
    subscriptionId="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
    resourceGroup="my-resource-group" \
    tenantId="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
    login="app-id" \
    passwd="app-secret" \
    op monitor interval="60s"
```

## Storage Fencing with SCSI Reservations

SCSI-3 Persistent Reservations (PR) provide storage-level fencing by controlling which nodes can access shared storage.

```mermaid
flowchart TB
    subgraph SCSI PR Fencing
        N1[Node 1] -->|Register Key| SAN[(SAN Storage)]
        N2[Node 2] -->|Register Key| SAN
        N1 -->|Reserve| SAN
        SAN -->|Preempt & Abort| N2
        N2 -.->|Access Denied| SAN
    end
```

### Configuring SCSI Fencing

```bash
# Install fence-agents-scsi package
yum install fence-agents-scsi

# Configure SCSI fencing
pcs stonith create fence-scsi fence_scsi \
    pcmk_host_list="node1 node2" \
    devices="/dev/disk/by-id/wwn-0x5000c5000000001" \
    meta provides="unfencing"

# Enable unfencing to re-register keys after node restart
pcs stonith update fence-scsi meta provides="unfencing"
```

### Multi-Path Device Configuration

```bash
# For multipath devices, use the persistent device name
pcs stonith create fence-scsi fence_scsi \
    pcmk_host_list="node1 node2" \
    devices="/dev/mapper/mpath0" \
    meta provides="unfencing"

# Verify SCSI reservations
sg_persist -i -k /dev/mapper/mpath0  # Show registered keys
sg_persist -i -r /dev/mapper/mpath0  # Show reservations
```

## Network Fencing

Network fencing isolates a node by blocking its network connectivity.

### Firewall-Based Fencing

```bash
# Configure iptables fencing
pcs stonith create fence-iptables fence_iptables \
    pcmk_host_list="node1 node2" \
    action="off"
```

### Custom Network Fencing Script

```bash
#!/bin/bash
# /usr/sbin/fence_network
# Custom network fencing agent

ACTION=$1
TARGET=$2
SWITCH_IP="192.168.1.1"

case $ACTION in
    off)
        # Disable switch port via SNMP
        snmpset -v2c -c private $SWITCH_IP \
            .1.3.6.1.2.1.2.2.1.7.$PORT_INDEX i 2
        ;;
    on)
        # Enable switch port
        snmpset -v2c -c private $SWITCH_IP \
            .1.3.6.1.2.1.2.2.1.7.$PORT_INDEX i 1
        ;;
    status)
        # Check port status
        snmpget -v2c -c public $SWITCH_IP \
            .1.3.6.1.2.1.2.2.1.7.$PORT_INDEX
        ;;
esac
```

## Fencing Agent Selection Guide

Choosing the right fencing agent depends on your infrastructure:

```mermaid
flowchart TD
    Start[Select Fencing Agent] --> Q1{Physical or Virtual?}

    Q1 -->|Physical| Q2{IPMI/iLO Available?}
    Q1 -->|Virtual| Q3{Hypervisor Type?}

    Q2 -->|Yes| IPMI[fence_ipmilan]
    Q2 -->|No| Q4{Smart PDU Available?}

    Q4 -->|Yes| PDU[fence_apc / fence_raritan]
    Q4 -->|No| SCSI[fence_scsi]

    Q3 -->|VMware| VMW[fence_vmware_soap]
    Q3 -->|KVM/libvirt| KVM[fence_virsh]
    Q3 -->|Hyper-V| HV[fence_hyperv]
    Q3 -->|Cloud| Q5{Cloud Provider?}

    Q5 -->|AWS| AWS[fence_aws]
    Q5 -->|GCP| GCE[fence_gce]
    Q5 -->|Azure| AZR[fence_azure_arm]
```

### Fencing Agent Comparison

| Agent | Reliability | Speed | Use Case |
|-------|-------------|-------|----------|
| fence_ipmilan | High | Fast | Physical servers with IPMI |
| fence_apc | High | Fast | Servers with APC PDUs |
| fence_vmware_soap | High | Medium | VMware virtual machines |
| fence_aws | High | Medium | AWS EC2 instances |
| fence_scsi | Medium | Fast | Shared storage environments |
| fence_kdump | Low | Slow | Preserve crash dumps |

## Multi-Level Fencing

For critical environments, configure multiple fencing methods as fallbacks:

```bash
# Primary: IPMI fencing
pcs stonith create fence-node1-ipmi fence_ipmilan \
    pcmk_host_list="node1" \
    ipaddr="192.168.1.101" \
    login="admin" passwd="secret" \
    lanplus="true"

# Secondary: PDU fencing
pcs stonith create fence-node1-pdu fence_apc \
    pcmk_host_list="node1" \
    ipaddr="192.168.1.200" \
    login="admin" passwd="secret" \
    plug="1"

# Configure fencing levels
pcs stonith level add 1 node1 fence-node1-ipmi
pcs stonith level add 2 node1 fence-node1-pdu

# Verify fencing levels
pcs stonith level
```

```mermaid
flowchart TB
    subgraph Fencing Levels
        Trigger[Fencing Triggered] --> L1[Level 1: IPMI]
        L1 -->|Success| Done[Node Fenced]
        L1 -->|Failure| L2[Level 2: PDU]
        L2 -->|Success| Done
        L2 -->|Failure| L3[Level 3: SCSI PR]
        L3 -->|Success| Done
        L3 -->|Failure| Manual[Manual Intervention Required]
    end
```

## Testing Fencing Configuration

Always test your fencing configuration before going to production.

### Manual Fence Testing

```bash
# Test fencing agent directly (won't actually fence)
fence_ipmilan -a 192.168.1.101 -l admin -p secret -o status

# Test through Pacemaker (will actually fence!)
pcs stonith fence node2 --off

# Watch cluster status during fencing
watch -n 1 pcs status
```

### Fencing Simulation

```bash
# Simulate node failure without actual fencing
pcs property set stonith-enabled=false
pcs node standby node2

# Re-enable and verify
pcs property set stonith-enabled=true
pcs node unstandby node2
```

### Automated Fencing Tests

```bash
#!/bin/bash
# fencing_test.sh - Automated fencing verification

set -e

echo "Testing fencing configuration..."

# 1. Verify all nodes have fencing configured
for node in $(pcs node); do
    fence_devices=$(pcs stonith level | grep $node | wc -l)
    if [ "$fence_devices" -eq 0 ]; then
        echo "ERROR: No fencing configured for $node"
        exit 1
    fi
done

# 2. Test fence agent connectivity
for device in $(pcs stonith | awk '/Stonith/ {print $2}'); do
    if ! pcs stonith show $device | grep -q "Started"; then
        echo "ERROR: Fence device $device is not running"
        exit 1
    fi
done

# 3. Test fence agent operation (status only)
for device in $(pcs stonith | awk '/Stonith/ {print $2}'); do
    echo "Testing $device..."
    pcs stonith fence --off $(pcs stonith show $device | grep pcmk_host_list | awk '{print $NF}') --simulate
done

echo "All fencing tests passed!"
```

## Best Practices

### 1. Always Enable Fencing in Production

```bash
# Ensure STONITH is enabled
pcs property set stonith-enabled=true

# Set appropriate timeouts
pcs property set stonith-timeout=60s

# Verify settings
pcs property | grep stonith
```

### 2. Use Redundant Fencing Paths

```bash
# Don't rely on a single fencing method
# Configure at least two levels for critical nodes

# Primary path through IPMI
pcs stonith level add 1 node1 fence-node1-ipmi

# Backup path through different network/method
pcs stonith level add 2 node1 fence-node1-pdu
```

### 3. Monitor Fencing Device Health

```yaml
# Prometheus alert for fence device issues
groups:
  - name: fencing
    rules:
      - alert: FenceDeviceDown
        expr: pacemaker_stonith_resource_state{state!="running"} == 1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Fence device {{ $labels.resource }} is down"
```

### 4. Document Fencing Procedures

```markdown
## Fencing Runbook

### Emergency Manual Fencing

If automatic fencing fails:

1. Verify the problematic node is truly unreachable
2. Access IPMI/iLO console directly
3. Issue power off command
4. Verify node is powered off
5. Clear fence state: `pcs stonith cleanup`
6. Resume cluster operations
```

### 5. Secure Fencing Credentials

```bash
# Use Pacemaker secrets for credentials
pcs stonith create fence-node1 fence_ipmilan \
    pcmk_host_list="node1" \
    ipaddr="192.168.1.101" \
    login="admin" \
    passwd="$(cat /etc/pacemaker/fence_password)" \
    lanplus="true"
```

## Kubernetes Fencing Considerations

In Kubernetes environments, traditional fencing is often replaced by:

### Node Problem Detector + Remediation

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-problem-detector
spec:
  selector:
    matchLabels:
      app: node-problem-detector
  template:
    spec:
      containers:
        - name: node-problem-detector
          image: registry.k8s.io/node-problem-detector/node-problem-detector:v0.8.13
          command:
            - /node-problem-detector
            - --logtostderr
            - --config.system-log-monitor=/config/kernel-monitor.json
```

### Machine Health Check (Cluster API)

```yaml
apiVersion: cluster.x-k8s.io/v1beta1
kind: MachineHealthCheck
metadata:
  name: worker-health-check
spec:
  clusterName: my-cluster
  maxUnhealthy: 40%
  nodeStartupTimeout: 10m
  selector:
    matchLabels:
      cluster.x-k8s.io/cluster-name: my-cluster
  unhealthyConditions:
    - type: Ready
      status: "False"
      timeout: 5m
    - type: Ready
      status: Unknown
      timeout: 5m
```

## Troubleshooting Fencing Issues

### Common Problems and Solutions

```bash
# Problem: Fencing timeout
# Solution: Increase timeout and verify network connectivity
pcs stonith update fence-node1 power_timeout=60

# Problem: Node fenced unexpectedly
# Solution: Check cluster communication
corosync-cfgtool -s
pcs status

# Problem: Fence device not starting
# Solution: Verify credentials and connectivity
fence_ipmilan -a 192.168.1.101 -l admin -p secret -o status -v

# Problem: SCSI reservations not clearing
# Solution: Manually clear reservations
sg_persist --out --clear --param-rk=0x12345678 /dev/mapper/mpath0
```

---

Fencing is not optional in production high availability clusters. Without proper fencing, you risk data corruption and split-brain scenarios that can take days to recover from. Invest the time to configure and test your fencing mechanisms thoroughly - your future self will thank you when a node failure is handled gracefully instead of catastrophically.
