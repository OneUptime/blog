# How to Debug CNI-Related Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CNI, Kubernetes, Debugging, Networking

Description: A hands-on troubleshooting guide for diagnosing and fixing CNI-related problems when running the Istio service mesh.

---

CNI issues in Istio show up as pods that won't start, networking that partially works, or mysterious connection failures. The tricky part is that the symptoms often look like application bugs when the root cause is actually in the CNI layer. Here's a systematic approach to finding and fixing these problems.

## Recognizing CNI Issues

CNI problems have some telltale signatures. Watch for these symptoms:

- Pods stuck in `Init:0/1` or `PodInitializing` state for a long time
- Pods in `CrashLoopBackOff` with network-related errors
- Sidecar injection works but traffic doesn't flow
- Some pods work fine while others on different nodes fail
- Errors mentioning "failed to set up sandbox" in pod events

Start with a pod describe to see what's happening:

```bash
kubectl describe pod <pod-name> -n <namespace>
```

Look for events like:

```
Warning  FailedCreatePodSandBox  networkPlugin cni failed to set up pod network
```

That's a dead giveaway that something is wrong at the CNI level.

## Step 1: Check Istio CNI DaemonSet Status

The Istio CNI plugin runs as a DaemonSet. If it's not running on a node, pods on that node won't get their iptables rules configured:

```bash
kubectl get daemonset -n istio-system istio-cni-node
```

Check if the desired count matches the ready count. If not, look at which nodes are missing:

```bash
kubectl get pods -n istio-system -l k8s-app=istio-cni-node -o wide
```

Compare this list with your nodes:

```bash
kubectl get nodes
```

If a node doesn't have the CNI pod, check for tolerations or node selector issues:

```bash
kubectl describe daemonset -n istio-system istio-cni-node | grep -A 10 Tolerations
```

## Step 2: Examine CNI Plugin Logs

The CNI plugin logs are your best friend here. Pull the logs from the CNI DaemonSet pod on the affected node:

```bash
# Find the CNI pod on the problematic node
NODE_NAME="your-node-name"
CNI_POD=$(kubectl get pods -n istio-system -l k8s-app=istio-cni-node \
  --field-selector spec.nodeName=${NODE_NAME} -o jsonpath='{.items[0].metadata.name}')

kubectl logs -n istio-system ${CNI_POD}
```

Common log messages and what they mean:

- `"CNI configuration file not found"` - the config directory path is wrong
- `"Failed to inject istio-cni plugin"` - the main CNI config file format is incompatible
- `"istio-cni plugin already in chain"` - this is actually fine, it's a no-op
- `"Failed to set up iptables"` - permissions issue or iptables binary missing

## Step 3: Inspect the CNI Configuration on the Node

You need to see what's actually on the node's filesystem. Use a debug pod or the CNI DaemonSet pod itself:

```bash
kubectl exec -n istio-system ${CNI_POD} -c install-cni -- cat /host/etc/cni/net.d/10-calico.conflist
```

The `install-cni` container mounts the host's CNI directories. Verify that:

1. The Istio CNI plugin is listed in the plugins array
2. The plugin configuration has the correct settings
3. There are no duplicate entries

You can also check the CNI binary is present:

```bash
kubectl exec -n istio-system ${CNI_POD} -c install-cni -- ls -la /host/opt/cni/bin/istio-cni
```

## Step 4: Verify iptables Rules Inside Pods

If the CNI plugin is installed but traffic isn't flowing correctly, check the iptables rules that Istio sets up inside the pod:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -L -n -v
```

You should see rules like:

```
Chain ISTIO_INBOUND (1 references)
 pkts bytes target     prot opt in     out     source       destination
    0     0 ISTIO_IN_REDIRECT  tcp  --  *      *       0.0.0.0/0    0.0.0.0/0    tcp dpt:80

Chain ISTIO_IN_REDIRECT (3 references)
 pkts bytes target     prot opt in     out     source       destination
    0     0 REDIRECT   tcp  --  *      *       0.0.0.0/0    0.0.0.0/0    redir ports 15006

Chain ISTIO_OUTPUT (1 references)
 pkts bytes target     prot opt in     out     source       destination
    0     0 RETURN     all  --  *      lo      127.0.0.6    0.0.0.0/0
    0     0 ISTIO_IN_REDIRECT  all  --  *      lo      0.0.0.0/0   !127.0.0.1
    0     0 RETURN     all  --  *      *       0.0.0.0/0    0.0.0.0/0    owner UID match 1337
```

If the ISTIO_INBOUND and ISTIO_OUTPUT chains are missing, the CNI plugin failed to set up iptables rules for that pod.

## Step 5: Check for Race Conditions

A common issue is a race condition between the CNI plugin installation and pod creation. When a node first boots or when the Istio CNI DaemonSet is being deployed, there's a window where pods can be created before the plugin is ready.

Check the timestamps:

```bash
# When was the pod created?
kubectl get pod <pod-name> -o jsonpath='{.metadata.creationTimestamp}'

# When did the CNI pod become ready?
kubectl get pod -n istio-system ${CNI_POD} -o jsonpath='{.status.conditions[?(@.type=="Ready")].lastTransitionTime}'
```

If the pod was created before the CNI pod was ready, delete and recreate it:

```bash
kubectl delete pod <pod-name>
```

The replacement pod should pick up the CNI configuration correctly.

## Step 6: Test CNI Functionality Directly

Create a minimal test pod and watch what happens:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: cni-test
  namespace: default
  labels:
    sidecar.istio.io/inject: "true"
spec:
  containers:
    - name: test
      image: busybox
      command: ["sleep", "3600"]
EOF
```

Watch the pod events in real time:

```bash
kubectl get events --field-selector involvedObject.name=cni-test --watch
```

## Step 7: Handle Upgrade-Related CNI Issues

CNI issues often appear during Istio upgrades. The old CNI binary might be incompatible with the new configuration, or vice versa.

During upgrades, follow this order:

1. Upgrade the Istio CNI DaemonSet first
2. Wait for all CNI pods to be ready
3. Then upgrade istiod and gateways
4. Finally, restart workload pods to pick up new sidecars

Check the version of the CNI plugin:

```bash
kubectl exec -n istio-system ${CNI_POD} -c install-cni -- /opt/cni/bin/istio-cni version 2>/dev/null || echo "version command not supported"
```

If the version command isn't supported, check the image tag:

```bash
kubectl get daemonset -n istio-system istio-cni-node -o jsonpath='{.spec.template.spec.containers[0].image}'
```

## Step 8: Collect a Full Debug Bundle

When all else fails, collect everything:

```bash
# Istio bug report captures a lot of useful info
istioctl bug-report --include istio-system

# Additionally, grab the CNI config from all nodes
for node in $(kubectl get nodes -o jsonpath='{.items[*].metadata.name}'); do
  echo "=== Node: $node ==="
  kubectl debug node/$node -it --image=busybox -- cat /host/etc/cni/net.d/10-calico.conflist 2>/dev/null
done
```

The bug report archive contains proxy configs, logs, and cluster state that can help identify the root cause.

## Quick Reference: Common Fixes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Pods stuck in Init | CNI plugin not installed on node | Check DaemonSet, restart pod |
| Partial connectivity | iptables rules missing | Delete and recreate pod |
| All pods fail on one node | CNI binary missing | Restart CNI DaemonSet pod on that node |
| Works then stops | CNI config overwritten by another plugin | Adjust CNI plugin priorities |
| Upgrade breaks networking | Version mismatch | Upgrade CNI DaemonSet before istiod |

CNI debugging is not glamorous work, but having a systematic approach saves hours of guessing. Start from the infrastructure (is the DaemonSet running?), move to the configuration (is the plugin chained correctly?), and then look at the pod level (are the iptables rules in place?). Most issues fall into one of these categories.
