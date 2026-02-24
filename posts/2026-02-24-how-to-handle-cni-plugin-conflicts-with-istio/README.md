# How to Handle CNI Plugin Conflicts with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CNI, Kubernetes, Networking, Troubleshooting

Description: Learn how to identify and resolve conflicts between Istio CNI plugin and other CNI plugins like Calico, Cilium, and Flannel.

---

If you've ever deployed Istio alongside Calico, Cilium, or Flannel and watched pods fail to start, you know how frustrating CNI plugin conflicts can be. The Container Network Interface specification allows for chaining multiple plugins, but getting them to cooperate takes some understanding of how each one works. This guide breaks down the common conflicts and how to fix them.

## How CNI Chaining Works

Kubernetes uses CNI plugins to set up pod networking. The CNI configuration lives in `/etc/cni/net.d/` on each node, and the kubelet picks up the first configuration file (sorted alphabetically) it finds there.

CNI plugins can be chained, meaning multiple plugins run in sequence. The first plugin in the chain typically handles the main networking setup (assigning IPs, setting up routes), while subsequent plugins add features like network policy enforcement or traffic interception.

Istio's CNI plugin is designed to be a chained plugin. It adds itself to an existing CNI configuration rather than replacing it. The purpose of the Istio CNI plugin is to set up iptables rules for traffic redirection, which normally happens in the istio-init container.

## Common Conflict: Calico and Istio CNI

Calico is one of the most popular CNI plugins, and it generally works well with Istio. But there's a common issue with the order of operations.

When both Calico and Istio CNI are installed, the CNI configuration directory might look like this:

```bash
ls /etc/cni/net.d/
10-calico.conflist
```

The Istio CNI plugin should add itself to the Calico conflist as a chained plugin. Check if it did:

```bash
kubectl exec -n kube-system $(kubectl get pods -n kube-system -l k8s-app=istio-cni-node -o jsonpath='{.items[0].metadata.name}') -- cat /etc/cni/net.d/10-calico.conflist
```

You should see an `istio-cni` entry in the plugins array:

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
      "type": "bandwidth",
      ...
    },
    {
      "type": "istio-cni",
      ...
    }
  ]
}
```

If the Istio CNI entry is missing, the plugin failed to install correctly. Check the Istio CNI DaemonSet logs:

```bash
kubectl logs -n istio-system -l k8s-app=istio-cni-node --tail=100
```

**Fix**: Make sure the Istio CNI plugin is configured with `chained: true` and points to the correct CNI configuration directory:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      chained: true
      cniConfDir: /etc/cni/net.d
      cniBinDir: /opt/cni/bin
```

## Common Conflict: Cilium and Istio

Cilium is an eBPF-based CNI that handles networking, observability, and security. Running Cilium alongside Istio creates an interesting situation because both tools can handle L7 traffic management.

The main conflict here is with port redirection. Cilium can handle traffic redirection using eBPF, and so can Istio using iptables. If both try to redirect traffic, you get loops or dropped packets.

The solution is to tell Cilium to skip Istio-managed traffic. Add this to your Cilium configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cilium-config
  namespace: kube-system
data:
  # Skip sidecar-managed pods
  cni-exclusive: "false"
```

On the Istio side, when using Cilium, you have two options:

**Option 1: Use Istio CNI plugin in chained mode**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      chained: true
```

**Option 2: Skip Istio CNI and use the init container**

If chaining doesn't work reliably, you can fall back to using the istio-init container, which runs as an init container with NET_ADMIN capability:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: false
  values:
    global:
      proxy_init:
        resources:
          limits:
            cpu: 100m
            memory: 50Mi
```

## Common Conflict: Flannel and Istio CNI

Flannel uses a simple overlay network, and its CNI configuration is straightforward. The conflict with Istio usually comes from the configuration file format.

Flannel can use either a `.conf` file (single plugin) or a `.conflist` file (plugin chain). Istio's CNI plugin can only chain with `.conflist` files. If Flannel is using a `.conf` file, Istio CNI won't be able to chain.

Check what format Flannel is using:

```bash
ls /etc/cni/net.d/
```

If you see `10-flannel.conf` instead of `10-flannel.conflist`, you need to convert it. Modern versions of Flannel support conflist format. Update your Flannel DaemonSet to use it:

```json
{
  "name": "cbr0",
  "cniVersion": "0.3.1",
  "plugins": [
    {
      "type": "flannel",
      "delegate": {
        "hairpinMode": true,
        "isDefaultGateway": true
      }
    },
    {
      "type": "portmap",
      "capabilities": {
        "portMappings": true
      }
    }
  ]
}
```

Once Flannel uses conflist format, Istio CNI can chain properly.

## Debugging CNI Conflicts Step by Step

When things go wrong, follow this systematic approach:

**Step 1: Check which CNI config is active**

```bash
# On the node (or via a debug pod)
ls -la /etc/cni/net.d/
```

The kubelet uses the first file alphabetically. If Istio creates a separate file that comes before your main CNI config, it will break networking.

**Step 2: Verify the Istio CNI binary exists**

```bash
ls /opt/cni/bin/istio-cni
```

**Step 3: Check the CNI plugin logs**

```bash
# Istio CNI logs
kubectl logs -n istio-system daemonset/istio-cni-node

# If using Calico
kubectl logs -n kube-system daemonset/calico-node
```

**Step 4: Test with a simple pod**

```bash
kubectl run test --image=busybox --command -- sleep 3600
kubectl describe pod test
```

Look at the events section for CNI-related errors.

**Step 5: Check iptables rules inside a pod**

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -L -n -v
```

## Race Conditions During Node Boot

One subtle issue is race conditions when a node starts up. Both the primary CNI plugin and the Istio CNI DaemonSet need to initialize. If a pod gets scheduled before both are ready, it can end up with incomplete networking.

The Istio CNI plugin has a readiness check. Make sure your DaemonSet has proper tolerations and priority:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
      k8s:
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
                - matchExpressions:
                    - key: kubernetes.io/os
                      operator: In
                      values:
                        - linux
```

## Prevention Tips

To avoid CNI conflicts in the first place:

1. Always use `chained: true` for the Istio CNI plugin
2. Make sure your primary CNI uses conflist format
3. Test CNI changes in a staging cluster first
4. Monitor the Istio CNI DaemonSet logs after upgrades
5. Pin your CNI plugin versions to avoid surprise changes

CNI conflicts are one of the more painful networking issues in Kubernetes, but they follow predictable patterns. Once you understand how chaining works and what each plugin expects, resolving conflicts becomes much more straightforward.
