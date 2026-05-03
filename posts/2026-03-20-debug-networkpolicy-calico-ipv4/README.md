# How to Debug Kubernetes NetworkPolicy Issues with Calico for IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Calico, Kubernetes, NetworkPolicy, IPv4, Debugging, Troubleshooting

Description: Use Calico-specific tools and kubectl commands to diagnose why IPv4 NetworkPolicy rules are not working as expected in a Kubernetes cluster.

NetworkPolicy debugging requires understanding which policies apply to a pod, whether Calico has correctly programmed the rules, and what traffic is being allowed or denied.

## Step 1: Verify Calico is Enforcing Policies

Calico must be configured to enforce NetworkPolicy. Verify calico-node is running on all nodes:

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node
# All pods should be Running and Ready

kubectl get pods -n calico-system -l k8s-app=calico-node
# Or in calico-system namespace depending on installation (Tigera Operator)

```

## Step 2: Check Which Policies Apply to a Pod

```bash
# Get the labels of the target pod
kubectl get pod my-pod -n production -o jsonpath='{.metadata.labels}'

# List NetworkPolicies in the namespace
kubectl get networkpolicy -n production

# Describe each policy to understand selectors
kubectl describe networkpolicy default-deny-all -n production
kubectl describe networkpolicy allow-ingress-from-vpn -n production
```

## Step 3: Use calicoctl to View Effective Policies

```bash
# Install calicoctl matching your Calico version
# List all network policies (including Calico GlobalNetworkPolicy)
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl get networkpolicy --all-namespaces -o wide

DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl get globalnetworkpolicy -o wide
```

## Step 4: Check Calico Endpoints

Calico represents each pod as a WorkloadEndpoint. Check that the pod's endpoint has the correct policies attached:

```bash
# List all workload endpoints
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl get workloadendpoint --all-namespaces

# Get details for a specific pod's endpoint
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config \
  calicoctl get workloadendpoint -n production -o yaml | \
  grep -A20 "my-pod"

# Check the "profiles" and "policies" fields - these show what policies are enforced
```

## Step 5: Check iptables Rules on the Node

Calico programs iptables rules for each endpoint:

```bash
# SSH to the node where the pod is running
kubectl get pod my-pod -n production -o wide  # note the Node name

# On that node, view Calico's iptables chains
sudo iptables -L -n -v | grep -i cali

# View rules for a specific endpoint (replace ENDPOINT_ID)
sudo iptables -L cali-fw-ENDPOINT_ID -n -v

# Watch for hits on DROP rules
sudo iptables -L -n -v | grep -i "DROP\|REJECT"
```

## Step 6: Enable Calico Packet Logging

```yaml
# calico-logging-policy.yaml - log dropped packets
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: log-dropped-packets
spec:
  order: 1000
  selector: all()
  types:
  - Ingress
  - Egress
  ingress:
  - action: Log
  - action: Deny
  egress:
  - action: Log
  - action: Deny
```

```bash
kubectl apply -f calico-logging-policy.yaml

# View logs
sudo dmesg | grep calico
# Or
sudo journalctl -k | grep calico
```

## Step 7: Test Connectivity Between Pods

```bash
# Deploy test pods
kubectl run client --image=alpine -n production --restart=Never -- sleep 3600
kubectl run server --image=nginx -n production --restart=Never
SERVER_IP=$(kubectl get pod server -n production -o jsonpath='{.status.podIP}')

# Test from client to server
kubectl exec client -n production -- wget -qO- --timeout=5 http://$SERVER_IP
# If blocked: "timeout" (policy silently dropping packets) or "Connection refused" (no listener on the port)
```

## Verifying with Calico Diagnostics

```bash
# Run Calico's built-in diagnostics
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl node diags

# Check dataplane status
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl node status
```

When a NetworkPolicy isn't working, the issue is almost always either wrong label selectors, missing DNS allowance, or a CNI version that doesn't support NetworkPolicy enforcement.
