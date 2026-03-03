# How to Troubleshoot Istio CNI Plugin Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CNI, Networking, Kubernetes, Troubleshooting

Description: A hands-on guide to diagnosing and fixing common issues with the Istio CNI plugin for network traffic redirection in Kubernetes.

---

The Istio CNI plugin is an alternative to the init container approach for setting up traffic redirection in pods. Instead of running `istio-init` with elevated privileges (NET_ADMIN, NET_RAW capabilities), the CNI plugin configures iptables rules as part of the pod network setup. This is better from a security standpoint, but it adds another moving part that can fail.

If you've enabled the Istio CNI plugin and pods aren't getting their traffic properly redirected through Envoy, here's how to track down the problem.

## How the Istio CNI Plugin Works

When a pod is scheduled on a node, the container runtime calls the CNI plugins in order to set up networking. The Istio CNI plugin hooks into this chain and adds iptables rules to redirect traffic through the Envoy sidecar - the same rules that `istio-init` would normally set up.

The plugin runs as a DaemonSet (`istio-cni-node`) that installs the CNI binary and configuration on each node. If the DaemonSet fails or the configuration is wrong, pods on that node won't get proper traffic redirection.

## Step 1: Check the CNI DaemonSet

Start by making sure the CNI DaemonSet is running on all nodes:

```bash
kubectl get daemonset istio-cni-node -n istio-system
```

```text
NAME             DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE
istio-cni-node   3         3         3       3            3
```

If READY doesn't match DESIRED, some nodes aren't running the CNI plugin. Check which pods are failing:

```bash
kubectl get pods -n istio-system -l k8s-app=istio-cni-node -o wide
```

Look at the failing pod's logs:

```bash
kubectl logs istio-cni-node-abc12 -n istio-system
```

Common failures:

- **Mount permission errors** - The CNI plugin needs to write to the host's CNI directory (usually `/etc/cni/net.d/` and `/opt/cni/bin/`). If the node has restrictive security policies, the DaemonSet might fail to mount these paths.
- **Missing host directories** - Some Kubernetes distributions put CNI config in non-standard paths. Check your distribution's documentation.
- **Resource limits** - The CNI node pods are lightweight, but if resource limits are too tight, they might get OOMKilled.

## Step 2: Verify CNI Configuration on the Node

The CNI plugin installs its configuration as a file in the CNI config directory. SSH into a node (or use a debug pod) and check:

```bash
# Using a debug container
kubectl debug node/worker-1 -it --image=busybox

# Inside the debug container
ls /host/etc/cni/net.d/
```

You should see a file related to Istio CNI. Depending on the configuration mode, it's either a standalone config file or an entry in a CNI chain config.

If you're using chained mode (the default), look for your primary CNI config file (e.g., `10-calico.conflist`) and check that it includes the Istio CNI plugin in the `plugins` array:

```json
{
  "name": "k8s-pod-network",
  "cniVersion": "0.3.1",
  "plugins": [
    {
      "type": "calico",
      ...
    },
    {
      "type": "istio-cni",
      "kubernetes": {
        "kubeconfig": "/etc/cni/net.d/ZZZ-istio-cni-kubeconfig"
      }
    }
  ]
}
```

If the Istio CNI entry is missing from the chain, the CNI node pod failed to install it. Check the CNI node logs again for errors.

Also verify the CNI binary exists:

```bash
ls /host/opt/cni/bin/istio-cni
```

## Step 3: Check Pod Traffic Redirection

If the CNI plugin is installed but traffic isn't being redirected properly, check the iptables rules inside a pod:

```bash
kubectl exec httpbin-abc123 -c istio-proxy -- iptables -t nat -L -n
```

You should see rules like:

```text
Chain ISTIO_REDIRECT (2 references)
target     prot opt source               destination
REDIRECT   tcp  --  0.0.0.0/0            0.0.0.0/0            redir ports 15001

Chain ISTIO_IN_REDIRECT (3 references)
target     prot opt source               destination
REDIRECT   tcp  --  0.0.0.0/0            0.0.0.0/0            redir ports 15006
```

If these rules are missing, the CNI plugin didn't run for this pod. Check if the pod was created before the CNI plugin was installed on the node. Pods created before the CNI DaemonSet is ready won't have the iptables rules.

Fix by restarting the pod:

```bash
kubectl delete pod httpbin-abc123 -n default
```

The new pod will go through the CNI chain and get the correct rules.

## Step 4: CNI Plugin Compatibility

The Istio CNI plugin needs to work alongside your cluster's primary CNI (Calico, Cilium, Flannel, etc.). Some combinations need extra configuration.

### Calico

Calico is generally compatible. Make sure the Istio CNI is chained after Calico in the config:

```bash
kubectl logs istio-cni-node-abc12 -n istio-system | grep "chained"
```

### Cilium

Cilium uses a different CNI model. If you're using Cilium's chaining mode, configure Istio CNI accordingly:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
      k8s:
        env:
        - name: CHAINED_CNI_PLUGIN
          value: "true"
```

### Amazon VPC CNI

On EKS, the VPC CNI plugin has its own configuration. The Istio CNI plugin chains after it:

```bash
ls /etc/cni/net.d/
# Should show: 10-aws.conflist (with Istio CNI chained in)
```

## Step 5: Race Conditions During Pod Startup

A common issue is a race condition where the application container starts before the iptables rules are in place. The CNI plugin should set up rules before any container starts, but there can be edge cases.

Symptoms: intermittent connection failures only during pod startup, with traffic working fine after a few seconds.

Istio addresses this with a readiness probe on the sidecar. The sidecar won't report ready until it's configured. If you're seeing race conditions, make sure your app container depends on the sidecar being ready:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
      - name: httpbin
        image: kennethreitz/httpbin
```

The `holdApplicationUntilProxyStarts` annotation tells the injection webhook to add a postStart hook that waits for the sidecar.

## Step 6: Ambient Mode CNI

If you're using Istio's ambient mode (ztunnel-based, no sidecars), the CNI plugin plays a different role. It redirects traffic to the ztunnel node proxy instead of a sidecar.

Check the ztunnel DaemonSet:

```bash
kubectl get daemonset ztunnel -n istio-system
```

And verify it's running on all nodes:

```bash
kubectl get pods -n istio-system -l app=ztunnel -o wide
```

For ambient mode, the CNI configuration is slightly different. The redirection targets the ztunnel listening socket instead of a per-pod sidecar.

## Step 7: Examining CNI Logs in Detail

Enable debug logging on the CNI node pods:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      logLevel: debug
```

Or set it at runtime:

```bash
kubectl set env daemonset/istio-cni-node -n istio-system CNI_LOG_LEVEL=debug
```

Then watch the logs while creating a new pod:

```bash
kubectl logs -n istio-system -l k8s-app=istio-cni-node -f
```

Create a test pod and watch for CNI plugin invocations in the logs. You should see messages about setting up iptables rules for the new pod.

## Step 8: Repair Controller

Istio includes a repair controller (running as part of the CNI DaemonSet) that detects pods where the CNI plugin failed and can either label or delete them. Check if the repair controller is catching issues:

```bash
kubectl logs istio-cni-node-abc12 -n istio-system | grep "repair"
```

You can configure the repair behavior:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    cni:
      repair:
        enabled: true
        deletePods: false
        labelPods: true
```

With `labelPods: true`, pods that failed CNI setup get labeled, and you can find them:

```bash
kubectl get pods --all-namespaces -l cni.istio.io/uninitialized=true
```

## Summary

The Istio CNI plugin removes the need for privileged init containers, which is a real security win. When it breaks, the debugging path is: check the DaemonSet, verify the CNI configuration on nodes, inspect iptables in pods, and watch for race conditions. Most issues come down to the CNI binary not being installed correctly on the node or the plugin not being chained into the existing CNI config properly.
