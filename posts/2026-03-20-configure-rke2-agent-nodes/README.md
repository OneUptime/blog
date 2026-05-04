# How to Configure RKE2 Agent Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Agent Nodes, Worker Nodes, SUSE Rancher, Node Configuration

Description: Learn how to configure RKE2 agent (worker) nodes to join an existing RKE2 cluster, including the configuration file, node labels, taints, and kubelet options.

---

RKE2 agent nodes run the workload pods. They join an existing cluster by connecting to a server node using a shared token. Agents run kubelet, kube-proxy, and the container runtime (containerd).

---

## Step 1: Install RKE2 Agent

```bash
# Download and install RKE2 in agent mode

curl -sfL https://get.rke2.io | INSTALL_RKE2_TYPE="agent" sh -

# Enable the agent service (do not start yet - configure first)
systemctl enable rke2-agent.service
```

---

## Step 2: Create the Agent Configuration File

```yaml
# /etc/rancher/rke2/config.yaml

# Address of the RKE2 server (or load balancer in front of server nodes)
server: https://rke2-server.example.com:9345

# Join token - must match the server token
token: my-super-secret-cluster-token

# Custom node name (defaults to hostname)
node-name: worker-01

# Labels applied to this node
node-label:
  - "topology.kubernetes.io/zone=us-east-1a"
  - "node.kubernetes.io/instance-type=m5.xlarge"
  - "workload-type=general"

# Taints applied to this node (e.g., reserve for specific workloads)
# node-taint:
#   - "dedicated=gpu:NoSchedule"

# kubelet configuration overrides
kubelet-arg:
  - "max-pods=110"
  - "kube-reserved=cpu=200m,memory=500Mi"
  - "system-reserved=cpu=200m,memory=500Mi"
  - "eviction-hard=memory.available<500Mi,nodefs.available<10%"
```

---

## Step 3: Start the Agent

```bash
# Start the RKE2 agent - it will connect to the server and join the cluster
systemctl start rke2-agent.service

# Monitor the agent connection logs
journalctl -u rke2-agent -f
```

---

## Step 4: Verify the Node Joined

On a server node:

```bash
export KUBECONFIG=/etc/rancher/rke2/rke2.yaml
export PATH=$PATH:/var/lib/rancher/rke2/bin

# Confirm the new worker node appears
kubectl get nodes -o wide

# Check that labels were applied
kubectl describe node worker-01 | grep -A 10 Labels
```

---

## Step 5: Configure Node-Specific containerd Settings

If the agent needs to pull images from a private registry, create:

```yaml
# /etc/rancher/rke2/registries.yaml
mirrors:
  "registry.example.com":
    endpoint:
      - "https://registry.example.com"

configs:
  "registry.example.com":
    auth:
      username: myuser
      password: mypassword
    tls:
      insecure_skip_verify: false
```

Restart the agent after changes:

```bash
systemctl restart rke2-agent.service
```

---

## Useful Paths

| Path | Purpose |
|---|---|
| `/etc/rancher/rke2/config.yaml` | Agent configuration |
| `/etc/rancher/rke2/registries.yaml` | Private registry config |
| `/var/lib/rancher/rke2/agent/logs/kubelet.log` | Kubelet logs |
| `/run/k3s/containerd/containerd.sock` | containerd socket |

---

## Best Practices

- Always set `kube-reserved` and `system-reserved` to protect node stability.
- Use `node-label` at provisioning time rather than adding labels manually - this ensures labels survive node re-registration.
- For GPU nodes, add a `NoSchedule` taint and only schedule GPU workloads that explicitly tolerate it.
- Configure `eviction-hard` thresholds to avoid out-of-memory kills on the node.
