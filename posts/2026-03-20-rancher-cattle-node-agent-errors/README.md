# How to Troubleshoot cattle-node-agent Errors in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Troubleshooting, Agent, Node

Description: Learn how to diagnose and fix cattle-node-agent errors in Rancher, including container runtime issues, volume mount failures, and network problems.

## Introduction

The `cattle-node-agent` runs as a DaemonSet on the Linux nodes in a Rancher-launched RKE cluster. It handles node-level cluster operations such as Kubernetes upgrades and etcd snapshot workflows, and it can act as a fallback path back to Rancher when the `cattle-cluster-agent` is unavailable. When node agents fail, affected nodes may show as "Not Ready" or unavailable for workloads.

If you are troubleshooting a Rancher-provisioned RKE2 or K3s cluster, the equivalent component is `rancher-system-agent`, not `cattle-node-agent`.

## Architecture

```text
Rancher server / cluster controller
       ↓ primary connection
cattle-cluster-agent (Deployment, in cattle-system)
       ↘ fallback for node operations and cluster connectivity
cattle-node-agent (DaemonSet, one pod per Linux node in a Rancher-launched RKE cluster)
```

## Step 1: Check Node Agent Status

```bash
# Check the DaemonSet status

kubectl get daemonset -n cattle-system cattle-node-agent

# Check pods - look for nodes where the agent is not Running
kubectl get pods -n cattle-system -l app=cattle-agent -o wide

# Find nodes where the agent is failing
kubectl get pods -n cattle-system -l app=cattle-agent \
  | grep -v "Running\|Completed"

# Get logs from a specific node's agent
NODE_AGENT=$(kubectl get pod -n cattle-system -l app=cattle-agent \
  --field-selector spec.nodeName=<node-name> -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n cattle-system ${NODE_AGENT} --tail=200
```

## Step 2: Diagnose Image Pull Failures

```bash
# If the node agent pod shows ImagePullBackOff
kubectl describe pod -n cattle-system ${NODE_AGENT} | grep -A5 "Events:"

# Inspect the exact image the DaemonSet is trying to run
AGENT_IMAGE=$(kubectl get daemonset -n cattle-system cattle-node-agent \
  -o jsonpath='{.spec.template.spec.containers[0].image}')
echo "${AGENT_IMAGE}"

# For air-gapped clusters, mirror that exact image
# On a machine with access to the image registry:
docker pull "${AGENT_IMAGE}"
docker save "${AGENT_IMAGE}" | gzip > rancher-agent.tar.gz

# Transfer to the air-gapped node and load it into Docker
scp rancher-agent.tar.gz user@<node-ip>:~
ssh user@<node-ip> 'sudo docker load -i rancher-agent.tar.gz'
```

## Step 3: Debug Volume Mount Issues

The node agent mounts host paths that must match the container runtime available on the node:

```bash
# Check what volumes the node agent mounts
kubectl get daemonset -n cattle-system cattle-node-agent -o json \
  | jq '.spec.template.spec.volumes[]'

# Common required path on RKE nodes:
# /var/run/docker.sock - Docker

# On the node, verify the socket exists
ssh user@<node-ip> 'ls -la /var/run/docker.sock'

# If the mounted host paths do not match the node, compare the DaemonSet spec
# with the node's actual runtime configuration before making changes.
kubectl describe daemonset -n cattle-system cattle-node-agent
```

## Step 4: Check Connectivity to Rancher

The node agent must be able to reach the Rancher `server-url`, and any load balancer in front of Rancher must support websocket traffic:

```bash
# Verify the Rancher server URL configured for the agent
kubectl get daemonset -n cattle-system cattle-node-agent -o yaml \
  | grep -A1 'name: CATTLE_SERVER'

# From the node, verify Rancher is reachable over HTTPS
ssh user@<node-ip> 'curl -vk https://<rancher-server>/healthz'

# Look for websocket or certificate errors in the agent logs
kubectl logs -n cattle-system ${NODE_AGENT} --tail=200 \
  | grep -E "Failed to connect to proxy|websocket|x509|certificate"

# If Rancher is behind a load balancer or proxy, verify it supports long-lived
# websocket connections and forwards the required headers.
```

## Step 5: Check Disk Pressure and System Resources

```bash
# Node agents fail if the node has disk pressure
kubectl describe node <node-name> | grep -A10 "Conditions:"

# Check disk usage on the node
ssh user@<node-ip> 'df -h'

# Check available inodes (often the real culprit)
ssh user@<node-ip> 'df -i'

# Free up disk space by removing unused container images
ssh user@<node-ip> 'sudo docker image prune -af'
```

## Step 6: Fix Nodes Stuck in NotReady

When a node is stuck in `NotReady` due to agent issues:

```bash
# Check kubelet and kube-proxy containers on the node
ssh user@<node-ip> "sudo docker ps -a -f=name='kubelet|kube-proxy'"
ssh user@<node-ip> 'sudo docker logs --tail=100 kubelet'

# Restart the kubelet container
ssh user@<node-ip> 'sudo docker restart kubelet'

# Force the DaemonSet to recreate the pod on the node
kubectl delete pod -n cattle-system ${NODE_AGENT}
```

## Step 7: Verify After Recovery

```bash
# Check node status
kubectl get nodes

# Verify all node agent pods are running
kubectl get pods -n cattle-system -l app=cattle-agent -o wide

# Check that the node is reporting to the cluster correctly
kubectl describe node <node-name> | grep -E "Conditions:|Ready:"
```

## Conclusion

`cattle-node-agent` failures in Rancher-launched RKE clusters are usually caused by image pull issues in air-gapped environments, missing Docker socket access, disk pressure on nodes, or connectivity problems between the node agent and Rancher. Monitoring the DaemonSet rollout status and individual pod health across all nodes is essential for maintaining cluster stability. Proactive node maintenance - clearing disk space and ensuring the required agent image is available on the nodes - prevents many node agent failures.
