# How to Use Istio CNI Instead of Init Containers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CNI, Kubernetes, Networking, Security

Description: A step-by-step guide to installing and configuring the Istio CNI plugin to replace privileged init containers for traffic redirection.

---

By default, Istio uses an init container called `istio-init` to set up iptables rules in each pod. This init container needs the `NET_ADMIN` and `NET_RAW` capabilities, which many security-conscious organizations don't want to grant. The Istio CNI plugin provides an alternative approach that moves the network configuration out of the pod and into the node-level CNI chain.

## Why Use the CNI Plugin?

The `istio-init` container requires elevated privileges to modify iptables rules. In environments with strict PodSecurityPolicies, PodSecurityStandards, or OPA/Gatekeeper constraints, running containers with `NET_ADMIN` capability is often blocked. The CNI plugin solves this because it runs as a DaemonSet on each node with the necessary permissions already in place.

Other benefits include:

- Pods don't need any special security context
- Slightly faster pod startup since there's no init container to run
- Cleaner pod specs with fewer injected containers
- Better compatibility with strict security policies

## Installing Istio with CNI Enabled

If you're using `istioctl` to install Istio, enable the CNI component:

```bash
istioctl install --set components.cni.enabled=true
```

For a more complete installation with custom settings:

```bash
istioctl install -f - <<EOF
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
      namespace: istio-system
  values:
    cni:
      excludeNamespaces:
        - istio-system
        - kube-system
      logLevel: info
EOF
```

If you're using Helm, the CNI is installed as a separate chart:

```bash
helm install istio-cni istio/cni -n istio-system --set global.cni.enabled=true
```

Then install istiod with CNI awareness:

```bash
helm install istiod istio/istiod -n istio-system --set istio_cni.enabled=true
```

## How the CNI Plugin Works

The Istio CNI plugin installs itself into the node's CNI chain. When a pod is created and the container runtime calls the CNI plugins to set up networking, the Istio CNI plugin runs as part of that chain. It checks whether the pod should have Istio sidecar injection (based on namespace labels and pod annotations) and, if so, sets up the same iptables rules that the init container would have created.

The process looks like this:

1. A new pod is scheduled on a node.
2. The container runtime invokes the CNI plugin chain.
3. The primary CNI plugin (like Calico, Flannel, or Cilium) sets up the pod network.
4. The Istio CNI plugin runs next and configures iptables rules in the pod's network namespace.
5. The pod starts with traffic interception already in place, no init container needed.

## Verifying the CNI Installation

After installation, check that the CNI DaemonSet is running:

```bash
kubectl get daemonset -n istio-system -l k8s-app=istio-cni-node
```

You should see one pod per node:

```text
NAME             DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE
istio-cni-node   3         3         3       3            3
```

Check the CNI plugin configuration on a node:

```bash
kubectl exec -it <istio-cni-node-pod> -n istio-system -- ls /etc/cni/net.d/
```

You should see the Istio CNI configuration file alongside your existing CNI config.

Check the logs for any issues:

```bash
kubectl logs -n istio-system -l k8s-app=istio-cni-node --tail=50
```

## Confirming Init Container Is Removed

Deploy a test application and verify that the `istio-init` container is not present:

```bash
kubectl apply -f samples/httpbin/httpbin.yaml
kubectl get pod -l app=httpbin -o jsonpath='{.items[0].spec.initContainers[*].name}'
```

With the CNI plugin active, you should NOT see `istio-init` in the list of init containers. The pod should only have the application container and the `istio-proxy` sidecar.

Also verify that the sidecar doesn't have elevated privileges:

```bash
kubectl get pod -l app=httpbin -o jsonpath='{.items[0].spec.containers[?(@.name=="istio-proxy")].securityContext}'
```

## Configuring CNI Plugin Options

The CNI plugin has several configuration options you can set during installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      excludeNamespaces:
        - istio-system
        - kube-system
        - monitoring
      cniBinDir: /opt/cni/bin
      cniConfDir: /etc/cni/net.d
      chained: true
      repair:
        enabled: true
        deletePods: true
```

The `excludeNamespaces` setting tells the CNI plugin to skip pods in those namespaces. The `cniBinDir` and `cniConfDir` settings should match your cluster's CNI binary and config locations (the defaults work for most distributions).

The `chained` option (default true) means the Istio CNI plugin runs as part of the existing CNI chain rather than replacing it. You almost always want this to be true.

The `repair` section enables the CNI race condition repair feature. Sometimes pods start before the CNI plugin is ready, and this feature detects and fixes those pods.

## Handling the CNI Race Condition

One known issue with the CNI approach is a race condition during node startup. If a pod is scheduled on a node before the Istio CNI DaemonSet pod is ready, the Istio iptables rules won't be configured. The pod will run without traffic interception.

Istio includes a repair controller to handle this. When enabled, it watches for pods that should have been configured by the CNI plugin but weren't. It can either label those pods for manual intervention or delete them so they get rescheduled.

```yaml
values:
  cni:
    repair:
      enabled: true
      labelPods: true
      deletePods: false
```

With `labelPods: true`, affected pods get a label `cni.istio.io/uninitialized=true`. You can then handle them with your own automation or restart them manually.

## Compatibility with Different CNI Plugins

The Istio CNI plugin works alongside most popular CNI plugins:

- **Calico**: Works out of the box in chained mode.
- **Flannel**: Fully compatible.
- **Cilium**: Works, but if you're using Cilium you might also consider Cilium's native Istio integration.
- **AWS VPC CNI**: Compatible, just make sure the CNI binary and config directories match.
- **Azure CNI**: Compatible with standard settings.

For GKE, the CNI directories may differ. You might need:

```yaml
values:
  cni:
    cniBinDir: /home/kubernetes/bin
```

## Migrating from Init Containers to CNI

If you already have Istio running with init containers, you can migrate to CNI:

1. Install the CNI plugin alongside your existing Istio installation.
2. Update the Istio configuration to enable CNI.
3. Restart your workloads so they pick up the new injection template (without the init container).

```bash
istioctl upgrade --set components.cni.enabled=true --set values.sidecar_injector.istio_cni.enabled=true
```

Then do a rolling restart of your namespaces:

```bash
kubectl rollout restart deployment -n my-namespace
```

The CNI plugin gives you a cleaner, more secure setup for Istio traffic interception. It does require a DaemonSet running on every node, but the trade-off of removing privileged init containers from application pods is well worth it for most production environments.
