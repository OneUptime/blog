# How to Troubleshoot EKS Node NotReady Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EKS, Kubernetes, Troubleshooting, Nodes

Description: Diagnose and resolve EKS node NotReady issues, including kubelet failures, resource exhaustion, networking problems, and instance health checks.

---

A node going NotReady is one of those things that can ruin your day. Pods get evicted, workloads are disrupted, and the auto-healing mechanisms that are supposed to fix things sometimes make it worse. The challenge is that "NotReady" is a symptom with many possible causes - kubelet crashes, disk pressure, memory exhaustion, network connectivity issues, or problems with the underlying EC2 instance.

This guide walks through a systematic approach to diagnosing and fixing NotReady nodes on EKS.

## Understanding Node Conditions

Kubernetes tracks several conditions for each node. When any of these go bad, the node can transition to NotReady:

```bash
# Check all node conditions
kubectl get nodes
kubectl describe node NODE_NAME | grep -A 20 "Conditions:"
```

The key conditions are:

| Condition | Healthy Value | What It Means |
|---|---|---|
| Ready | True | kubelet is healthy, can accept pods |
| MemoryPressure | False | Sufficient memory available |
| DiskPressure | False | Sufficient disk space |
| PIDPressure | False | Sufficient process IDs |
| NetworkUnavailable | False | Network is configured correctly |

When `Ready` is `False` or `Unknown`, the node is NotReady.

## Step 1: Check the Node Status

Start with a broad overview:

```bash
# Quick check of all nodes
kubectl get nodes -o wide

# Detailed info on the problematic node
kubectl describe node ip-10-0-1-100.ec2.internal
```

Look for:
- The current conditions (which ones are True/False/Unknown)
- Recent events at the bottom
- Resource pressure indicators
- The node's kubelet version

## Step 2: Check the EC2 Instance

The problem might be at the infrastructure level. Check the EC2 instance health:

```bash
# Get the instance ID from the node's provider ID
INSTANCE_ID=$(kubectl get node ip-10-0-1-100.ec2.internal -o jsonpath='{.spec.providerID}' | cut -d/ -f5)

# Check instance status
aws ec2 describe-instance-status --instance-ids $INSTANCE_ID \
  --query "InstanceStatuses[0].{InstanceStatus:InstanceStatus.Status,SystemStatus:SystemStatus.Status,State:InstanceState.Name}"

# Check for scheduled events (maintenance, retirement)
aws ec2 describe-instance-status --instance-ids $INSTANCE_ID \
  --query "InstanceStatuses[0].Events"
```

If the instance is in a stopped or terminated state, that's your answer. For managed node groups, EKS should replace it automatically.

## Step 3: Check the Kubelet

The kubelet is the agent that runs on each node and reports its status to the API server. If the kubelet crashes or stops, the node goes NotReady.

SSH into the node (or use SSM Session Manager):

```bash
# Connect via SSM Session Manager
aws ssm start-session --target $INSTANCE_ID
```

Once on the node:

```bash
# Check kubelet service status
sudo systemctl status kubelet

# Check kubelet logs for errors
sudo journalctl -u kubelet --since "30 minutes ago" --no-pager | tail -100

# Check if kubelet is running
ps aux | grep kubelet
```

Common kubelet issues:
- **OOMKilled** - the kubelet process ran out of memory
- **Certificate errors** - the kubelet's client certificate expired
- **API server connectivity** - can't reach the EKS API endpoint

If the kubelet is down, try restarting it:

```bash
# Restart the kubelet
sudo systemctl restart kubelet

# Watch it start up
sudo journalctl -u kubelet -f
```

## Step 4: Check Resource Exhaustion

Disk pressure is one of the most common causes of NotReady:

```bash
# Check disk usage on the node
df -h

# Check specifically the root and container storage
df -h / /var/lib/docker /var/lib/containerd

# Check inode usage (running out of inodes causes similar symptoms)
df -i
```

If disk is full, identify what's consuming space:

```bash
# Find large files
sudo du -sh /var/lib/containerd/* | sort -rh | head -20

# Check container image cache
sudo crictl images | wc -l

# Clean up unused images
sudo crictl rmi --prune
```

For memory pressure:

```bash
# Check memory usage
free -h

# Check which processes use the most memory
ps aux --sort=-%mem | head -20

# Check for OOM kills
sudo dmesg | grep -i "oom\|out of memory" | tail -20
```

## Step 5: Check Networking

Network issues prevent the kubelet from communicating with the API server:

```bash
# Test connectivity to the EKS API endpoint
curl -k https://CLUSTER_API_ENDPOINT/healthz

# Check if the VPC CNI plugin is healthy
kubectl get pods -n kube-system -l k8s-app=aws-node -o wide

# Check iptables rules (should show kube-proxy rules)
sudo iptables -t nat -L | head -30
```

For DNS issues:

```bash
# Test DNS resolution from the node
nslookup kubernetes.default.svc.cluster.local

# Check CoreDNS pods
kubectl get pods -n kube-system -l k8s-app=kube-dns
```

For [DNS resolution troubleshooting](https://oneuptime.com/blog/post/2026-02-12-troubleshoot-eks-dns-resolution-issues/view), we have a dedicated guide.

## Step 6: Check the Container Runtime

EKS uses containerd as its container runtime. If containerd fails, pods can't run and the node goes NotReady:

```bash
# Check containerd status
sudo systemctl status containerd

# Check containerd logs
sudo journalctl -u containerd --since "30 minutes ago" --no-pager | tail -50

# List containers to verify containerd is responsive
sudo crictl ps
```

## Common Scenarios and Fixes

### Scenario: Node NotReady After Cluster Upgrade

After [upgrading your cluster](https://oneuptime.com/blog/post/2026-02-12-upgrade-eks-cluster-versions/view), nodes running the old AMI might have compatibility issues.

```bash
# Check the node's kubelet version vs. cluster version
kubectl get nodes -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion

# Update the node group to the new AMI
aws eks update-nodegroup-version --cluster-name my-cluster --nodegroup-name my-nodegroup
```

### Scenario: Intermittent NotReady (Node Flapping)

The node alternates between Ready and NotReady. This usually indicates:
- Network instability between the node and API server
- kubelet resource pressure (high CPU on the node delays heartbeats)
- An overloaded API server

```bash
# Check node events for a pattern
kubectl get events --field-selector involvedObject.name=ip-10-0-1-100.ec2.internal --sort-by='.lastTimestamp'
```

Increase the node-status-update-frequency in severe cases:

```bash
# On the node, check kubelet args
ps aux | grep kubelet | grep node-status
```

### Scenario: All Nodes Go NotReady

If all nodes go NotReady simultaneously, the issue is likely:
- EKS control plane issue (rare, check the AWS Service Health Dashboard)
- Security group changes that block node-to-API communication
- IAM permission changes

```bash
# Check the cluster status
aws eks describe-cluster --name my-cluster --query "cluster.status"

# Verify security group rules
aws ec2 describe-security-groups --group-ids sg-CLUSTER_SG_ID
```

### Scenario: Newly Joined Node Stuck NotReady

A new node joined the cluster but never becomes Ready:

```bash
# Check if the node is registered
kubectl get nodes | grep NotReady

# SSH to the node and check bootstrap logs
sudo journalctl -u kubelet | head -100
```

Common causes:
- aws-auth ConfigMap doesn't have the node's IAM role
- The node can't pull the pause container image
- VPC CNI plugin failed to initialize

## Recovery Playbook

When a node is NotReady and you need quick recovery:

```bash
# 1. Cordon the node to prevent new pods
kubectl cordon ip-10-0-1-100.ec2.internal

# 2. Drain existing pods (they'll be rescheduled to healthy nodes)
kubectl drain ip-10-0-1-100.ec2.internal --ignore-daemonsets --delete-emptydir-data --force

# 3. If the instance is unhealthy, terminate it (ASG will replace it)
aws ec2 terminate-instances --instance-ids $INSTANCE_ID

# 4. If the node group is managed, EKS handles replacement automatically
```

The key to dealing with NotReady nodes is systematic diagnosis. Start from the outside (EC2 instance health), work inward (kubelet, container runtime), and check resources (disk, memory, CPU) along the way. Most issues fall into a handful of categories, and once you've seen them a few times, you'll diagnose them quickly.
