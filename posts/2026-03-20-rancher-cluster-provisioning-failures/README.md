# How to Troubleshoot Cluster Provisioning Failures in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Troubleshooting, Provisioning

Description: Diagnose and fix cluster provisioning failures in Rancher, covering RKE2, K3s, and hosted provider issues with practical debugging steps.

## Introduction

Cluster provisioning failures in Rancher can occur at multiple stages: node bootstrapping, Kubernetes component startup, or CNI/CSI installation. This guide covers the most common failure scenarios across RKE2, K3s, and cloud-hosted clusters and how to resolve them.

## Step 1: Check Provisioning Status in the UI

Navigate to **Cluster Management** in Rancher and look for clusters stuck in:

- **Provisioning** - infrastructure is being created but Kubernetes hasn't started yet.
- **Waiting** - Rancher is waiting for nodes to register.
- **Updating** - components are being applied but the process stalled.

Click on the cluster name and look at the **Conditions** tab for specific error messages.

## Step 2: Examine Provisioning Logs

```bash
# Check the Rancher server logs for provisioning errors

kubectl logs -n cattle-system -l app=rancher -c rancher --tail=300 | grep -Ei 'provision|error|fail'

# Find the namespace where the provisioning cluster object lives
kubectl get clusters.provisioning.cattle.io -A

# For Rancher v2.13 and earlier, check the provisioning controller
kubectl logs -n cattle-provisioning-capi-system \
  -l control-plane=controller-manager --tail=200

# For Rancher v2.14+, check Rancher Turtles and CAPI controllers
kubectl logs -n rancher-turtles-system deploy/rancher-turtles-controller-manager --tail=200
kubectl logs -n capi-system deploy/capi-controller-manager --tail=200

# Check provisioning machine resources in the cluster namespace (often fleet-default)
kubectl get machines -n <cluster-namespace>
kubectl describe machine -n <cluster-namespace> <machine-name>
```

## Step 3: Check Node Bootstrap Logs

For RKE2 nodes, SSH into the node and check the bootstrap process:

```bash
# On the provisioned node
# Check cloud-init / user-data execution
sudo cat /var/log/cloud-init-output.log

# Check RKE2 service status
sudo systemctl status rke2-server   # for server nodes
sudo systemctl status rke2-agent    # for agent nodes

# Stream RKE2 logs
sudo journalctl -u rke2-server -f --no-pager   # for server nodes
sudo journalctl -u rke2-agent -f --no-pager    # for agent nodes

# Check kubelet logs
sudo cat /var/lib/rancher/rke2/agent/logs/kubelet.log
```

## Step 4: Common Provisioning Failure Causes

### Insufficient Node Resources

```bash
# Check node resources before provisioning
# Minimum for RKE2: 2 vCPU, 4 GB RAM
# Use fast disk/SSD for etcd data, and size the disk for your workload and snapshots

# On the node:
free -h       # Check available memory
df -h /       # Check root disk space
nproc         # Check CPU count
```

### Node Registration Timeout

```bash
# The node must reach the Rancher server within the registration timeout
# Check if the node can reach Rancher:
curl -k https://<rancher-url>/ping

# On a server node, verify the RKE2 join token if needed
sudo cat /var/lib/rancher/rke2/server/token
```

### Port Conflicts

```bash
# RKE2 requires specific ports to be free
# Check for conflicts on the node
sudo ss -tulnp | grep -E '6443|9345|10250|2379|2380|8472'

# Common conflict: the node was previously used by another Kubernetes installation
sudo systemctl list-units --type=service | grep -E 'k3s|k3s-agent|kubelet'
```

## Step 5: Cloud Provider Provisioning Issues

### AWS EC2 Provisioning

```bash
# Check which cloud credential the cluster references
kubectl get clusters.provisioning.cattle.io -n <cluster-namespace> <cluster-name> \
  -o jsonpath='{.spec.cloudCredentialSecretName}{"\n"}'

# The value is usually in the form cattle-global-data:cc-xxxx; inspect that secret by name
kubectl get secret -n cattle-global-data <cloud-credential-secret> -o json \
  | jq '.data | map_values(@base64d)'

# Verify the AWS principal can perform the actions required by the node template
aws iam simulate-principal-policy \
  --policy-source-arn <principal-arn> \
  --action-names ec2:RunInstances ec2:CreateTags ec2:DescribeInstances iam:PassRole
```

### vSphere Provisioning

```bash
# Check which cloud credential the cluster references
kubectl get clusters.provisioning.cattle.io -n <cluster-namespace> <cluster-name> \
  -o jsonpath='{.spec.cloudCredentialSecretName}{"\n"}'

# The value is usually in the form cattle-global-data:cc-xxxx; inspect that secret by name
kubectl get secret -n cattle-global-data <cloud-credential-secret> -o json \
  | jq -r '.data | to_entries[] | "\(.key): \(.value | @base64d)"'

# Common issues:
# - Invalid datacenter/datastore/network paths
# - Template VM not found or powered on
# - Insufficient vSphere permissions
```

## Step 6: Fix a Stalled Provisioning

```bash
# Force-delete the stalled cluster resource (USE WITH CAUTION)
# First, remove the finalizer
kubectl patch clusters.provisioning.cattle.io -n <cluster-namespace> <cluster-name> \
  -p '{"metadata":{"finalizers":[]}}' --type=merge

# Then delete
kubectl delete clusters.provisioning.cattle.io -n <cluster-namespace> <cluster-name>
```

## Step 7: Review Machine Pool Events

```bash
# List all CAPI machine resources
kubectl get machinesets,machines,machinedeployments -n <cluster-namespace>

# Get events for a specific machine
kubectl get events -n <cluster-namespace> \
  --field-selector involvedObject.name=<machine-name>,reason!=Pulling,reason!=Pulled
```

## Conclusion

Cluster provisioning failures in Rancher require examining logs at multiple levels: the Rancher server, the CAPI provisioning controller, and the individual nodes. The most frequent causes are insufficient node resources, network connectivity issues between nodes and Rancher, port conflicts, and incorrect cloud provider credentials. Addressing these systematically will resolve the vast majority of provisioning failures.
