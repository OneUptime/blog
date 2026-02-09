# How to Upgrade Windows Nodes in a Kubernetes Cluster Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Windows, Upgrades

Description: Step-by-step guide to performing rolling upgrades of Windows nodes in Kubernetes clusters with zero downtime using cordoning, draining, and gradual rollout strategies.

---

Upgrading Windows nodes in production Kubernetes clusters requires careful planning to avoid service disruptions. Windows nodes need patching for security updates, OS upgrades, and kubelet version changes. This guide covers strategies for upgrading Windows nodes without downtime using rolling updates, PodDisruptionBudgets, and proper draining procedures.

## Pre-Upgrade Planning

Before upgrading, assess your cluster:

```bash
# Check current node versions
kubectl get nodes -o wide

# View Windows node details
kubectl get nodes -l kubernetes.io/os=windows -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion,OS:.status.nodeInfo.osImage

# Check pod distribution
kubectl get pods -o wide --all-namespaces | grep <node-name>

# Verify node capacity
kubectl describe node <node-name> | grep -A 5 Capacity
```

## Setting Up PodDisruptionBudgets

Prevent too many pods from being unavailable:

```yaml
# pod-disruption-budget.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: windows-app-pdb
  namespace: production
spec:
  minAvailable: 2  # Keep at least 2 pods running
  selector:
    matchLabels:
      app: windows-web
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: critical-service-pdb
  namespace: production
spec:
  maxUnavailable: 1  # Only 1 pod can be down at a time
  selector:
    matchLabels:
      app: critical-service
```

Apply PDBs:

```bash
kubectl apply -f pod-disruption-budget.yaml

# Verify PDBs
kubectl get pdb -A
kubectl describe pdb windows-app-pdb -n production
```

## Rolling Upgrade Procedure

Upgrade nodes one at a time:

```bash
# Step 1: Cordon the node (prevent new pods)
kubectl cordon <windows-node-name>

# Verify node is cordoned
kubectl get node <windows-node-name>
# Should show STATUS: Ready,SchedulingDisabled

# Step 2: Drain the node (evict running pods)
kubectl drain <windows-node-name> \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --force \
  --grace-period=300

# Monitor pod eviction
kubectl get pods -o wide --all-namespaces | grep <windows-node-name>
```

Perform the upgrade on the node:

```powershell
# On the Windows node
# Stop kubelet service
Stop-Service kubelet

# Upgrade kubelet
$version = "1.28.0"
Invoke-WebRequest -Uri "https://dl.k8s.io/v$version/bin/windows/amd64/kubelet.exe" `
  -OutFile "C:\k\kubelet.exe"

# Update Windows
Install-WindowsUpdate -AcceptAll -AutoReboot

# After reboot, restart kubelet
Start-Service kubelet
```

Uncordon the node:

```bash
# Step 3: Uncordon the node (allow scheduling)
kubectl uncordon <windows-node-name>

# Verify node is ready
kubectl get node <windows-node-name>

# Check pods are rescheduling
kubectl get pods -o wide --all-namespaces | grep <windows-node-name>
```

## Automated Rolling Upgrade Script

Automate the upgrade process:

```powershell
# rolling-upgrade.ps1
param(
    [Parameter(Mandatory=$true)]
    [string[]]$Nodes,

    [int]$WaitTimeBetweenNodes = 300
)

foreach ($node in $Nodes) {
    Write-Host "==== Upgrading node: $node ===="

    # Cordon node
    Write-Host "Cordoning node..."
    kubectl cordon $node

    # Drain node
    Write-Host "Draining node..."
    kubectl drain $node --ignore-daemonsets --delete-emptydir-data --force --grace-period=300

    # Wait for drain to complete
    Start-Sleep -Seconds 30

    # Verify no pods are running (except DaemonSets)
    $podCount = (kubectl get pods --all-namespaces --field-selector spec.nodeName=$node -o json | ConvertFrom-Json).items.Count
    Write-Host "Pods remaining on node: $podCount"

    # Pause for manual intervention
    Write-Host "Node drained. Perform upgrades now."
    Write-Host "Press Enter when upgrade is complete..."
    Read-Host

    # Uncordon node
    Write-Host "Uncordoning node..."
    kubectl uncordon $node

    # Wait for node to stabilize
    Write-Host "Waiting $WaitTimeBetweenNodes seconds before next node..."
    Start-Sleep -Seconds $WaitTimeBetweenNodes
}

Write-Host "==== All nodes upgraded ===="
```

Use the script:

```powershell
.\rolling-upgrade.ps1 -Nodes @("win-node-1", "win-node-2", "win-node-3") -WaitTimeBetweenNodes 300
```

## Blue-Green Node Upgrade Strategy

Create new nodes and migrate workloads:

```bash
# Step 1: Add new Windows nodes with updated version
# (via your cloud provider or infrastructure automation)

# Step 2: Label old and new nodes
kubectl label nodes win-node-old-1 node-version=old
kubectl label nodes win-node-new-1 node-version=new

# Step 3: Update deployments to prefer new nodes
kubectl patch deployment windows-app -p '
{
  "spec": {
    "template": {
      "spec": {
        "affinity": {
          "nodeAffinity": {
            "preferredDuringSchedulingIgnoredDuringExecution": [{
              "weight": 100,
              "preference": {
                "matchExpressions": [{
                  "key": "node-version",
                  "operator": "In",
                  "values": ["new"]
                }]
              }
            }]
          }
        }
      }
    }
  }
}'

# Step 4: Cordon old nodes
kubectl cordon -l node-version=old

# Step 5: Drain old nodes gradually
for node in $(kubectl get nodes -l node-version=old -o name); do
  kubectl drain $node --ignore-daemonsets --delete-emptydir-data
  sleep 300
done

# Step 6: Verify all pods on new nodes
kubectl get pods -o wide -A | grep -v win-node-new

# Step 7: Remove old nodes
kubectl delete node -l node-version=old
```

## In-Place OS Upgrade

Upgrade Windows OS in place:

```powershell
# On Windows node
# Install Windows Update module
Install-Module PSWindowsUpdate -Force

# Check available updates
Get-WindowsUpdate

# Install updates with automatic reboot
Install-WindowsUpdate -AcceptAll -AutoReboot

# Or specific KB
Install-WindowsUpdate -KBArticleID "KB5012345" -AcceptAll -AutoReboot
```

Monitor reboot and rejoin:

```bash
# Watch node status
watch kubectl get nodes

# After reboot, verify kubelet is running
kubectl get nodes <node-name>

# Check node version
kubectl get node <node-name> -o jsonpath='{.status.nodeInfo.osImage}'
```

## Upgrading Managed Node Groups (AKS/EKS)

For managed Kubernetes services:

```bash
# Azure AKS
az aks nodepool upgrade \
  --resource-group myResourceGroup \
  --cluster-name myAKSCluster \
  --name winpool \
  --kubernetes-version 1.28.0

# AWS EKS (update launch template, then roll nodes)
aws eks update-nodegroup-version \
  --cluster-name my-cluster \
  --nodegroup-name windows-ng \
  --kubernetes-version 1.28
```

## Monitoring Upgrade Progress

Track upgrade status:

```bash
# Watch node status
kubectl get nodes -w

# Monitor pod distribution
kubectl get pods -o wide --all-namespaces | awk '{print $8}' | sort | uniq -c

# Check PodDisruptionBudgets
kubectl get pdb -A

# View events
kubectl get events --sort-by='.lastTimestamp' | grep <node-name>

# Check for pod eviction errors
kubectl get pods -A | grep Evicted
```

Create a monitoring script:

```bash
#!/bin/bash
# monitor-upgrade.sh

while true; do
  clear
  echo "=== Node Status ==="
  kubectl get nodes -o wide

  echo -e "\n=== Pod Distribution ==="
  kubectl get pods -o wide --all-namespaces | awk '{print $8}' | sort | uniq -c

  echo -e "\n=== PodDisruptionBudgets ==="
  kubectl get pdb -A

  echo -e "\n=== Recent Events ==="
  kubectl get events --sort-by='.lastTimestamp' | tail -10

  sleep 10
done
```

## Rollback Strategy

If issues occur during upgrade:

```bash
# Stop the upgrade process
# Uncordon any cordoned nodes
kubectl uncordon <node-name>

# If node is unhealthy after upgrade
kubectl delete node <node-name>

# Re-add node with previous configuration
# (This depends on your provisioning method)

# Verify cluster health
kubectl get nodes
kubectl get pods -A | grep -E '(Crash|Error|Pending)'
```

## Post-Upgrade Validation

Verify cluster health after upgrades:

```bash
# Check all nodes are Ready
kubectl get nodes

# Verify all pods are running
kubectl get pods -A | grep -v Running

# Check system pods
kubectl get pods -n kube-system

# Verify services are accessible
kubectl get services -A

# Run smoke tests
kubectl run test-pod --image=myregistry.azurecr.io/test:v1 --rm -it --restart=Never -- /test.sh

# Check cluster metrics
kubectl top nodes
kubectl top pods -A
```

## Best Practices

1. Always use PodDisruptionBudgets for critical workloads
2. Upgrade during maintenance windows when possible
3. Upgrade one node at a time in production
4. Test upgrade procedures in non-production first
5. Monitor pod distribution across nodes during upgrades
6. Keep backup of node configurations
7. Document the upgrade process for your team
8. Set up alerting for node status changes
9. Verify application health after each node upgrade
10. Plan rollback procedures before starting

## Conclusion

Upgrading Windows nodes without downtime requires careful orchestration of cordoning, draining, and uncordoning operations. Use PodDisruptionBudgets to ensure minimum availability, upgrade nodes sequentially, and monitor cluster health throughout the process. For large clusters, consider blue-green node upgrades to minimize risk. Always test upgrade procedures in non-production environments first and have rollback plans ready. With proper planning and execution, Windows node upgrades can be performed safely without service disruption.
