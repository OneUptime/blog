# How to Configure Istio CNI Plugin

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CNI, Kubernetes, Security, Networking

Description: Complete guide to configuring the Istio CNI plugin to eliminate the need for privileged init containers in your service mesh.

---

By default, Istio uses an init container called `istio-init` that requires NET_ADMIN and NET_RAW capabilities to set up iptables rules for traffic interception. The Istio CNI plugin replaces this init container, which means your application pods no longer need elevated privileges. This is a big win for security, especially in environments with strict PodSecurityPolicies or PodSecurity Standards.

## Why Use the Istio CNI Plugin?

There are three solid reasons to switch to the CNI plugin:

1. **Security**: No more NET_ADMIN capability required in application pods
2. **Compatibility**: Works with restricted PodSecurity Standards (baseline and restricted profiles)
3. **Consistency**: Traffic rules are set up by the infrastructure, not by individual pods

The trade-off is additional operational complexity since you're running another DaemonSet. But for production environments, the security benefits usually outweigh this.

## Basic Installation

The simplest way to enable the CNI plugin is during Istio installation:

```bash
istioctl install --set components.cni.enabled=true
```

For more control, use an IstioOperator manifest:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-with-cni
spec:
  profile: default
  components:
    cni:
      enabled: true
      namespace: istio-system
  values:
    cni:
      chained: true
      excludeNamespaces:
        - kube-system
        - istio-system
```

Apply it:

```bash
istioctl install -f istio-cni-config.yaml -y
```

## Configuration Options Explained

The CNI plugin has several configuration values that control its behavior. Here are the important ones:

### chained

```yaml
values:
  cni:
    chained: true
```

When set to `true`, the Istio CNI plugin inserts itself into the existing CNI plugin chain. When `false`, it creates a standalone configuration. You almost always want `true` unless you're running Istio as the only CNI (which is unusual).

### cniBinDir and cniConfDir

```yaml
values:
  cni:
    cniBinDir: /opt/cni/bin
    cniConfDir: /etc/cni/net.d
```

These tell the plugin where to install the binary and where to find the CNI configuration. The defaults work for most distributions, but some platforms need different paths:

| Platform | cniBinDir | cniConfDir |
|----------|-----------|------------|
| Standard K8s | /opt/cni/bin | /etc/cni/net.d |
| GKE | /home/kubernetes/bin | /etc/cni/net.d |
| OpenShift | /var/lib/cni/bin | /etc/cni/multus/net.d |

### excludeNamespaces

```yaml
values:
  cni:
    excludeNamespaces:
      - kube-system
      - istio-system
```

Pods in these namespaces won't have iptables rules configured by the CNI plugin. Always exclude `kube-system` and `istio-system` to avoid breaking system components.

### logLevel

```yaml
values:
  cni:
    logLevel: info
```

Set to `debug` when troubleshooting:

```yaml
values:
  cni:
    logLevel: debug
```

## Advanced Configuration

### Custom Traffic Redirection

You can control which ports get redirected and which are excluded:

```yaml
values:
  cni:
    psp_cluster_role: ""
  sidecarInjectorWebhook:
    injectedAnnotations:
      traffic.sidecar.istio.io/excludeInboundPorts: "22"
      traffic.sidecar.istio.io/excludeOutboundPorts: "5432,6379"
```

These annotations are set at injection time, and the CNI plugin respects them when configuring iptables rules.

You can also set these per-pod using annotations on your workload:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "8443"
        traffic.sidecar.istio.io/excludeOutboundPorts: "3306"
    spec:
      containers:
        - name: my-app
          image: my-app:latest
```

### Resource Limits for the CNI DaemonSet

The CNI DaemonSet runs on every node, so set appropriate resource limits:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 10m
            memory: 100Mi
          limits:
            cpu: 100m
            memory: 200Mi
```

The CNI plugin itself is lightweight. It only runs when pods are created or deleted, not continuously.

### Running on OpenShift

OpenShift uses Multus as a meta-CNI plugin, which changes how Istio's CNI plugin integrates:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: openshift
  components:
    cni:
      enabled: true
      namespace: kube-system
  values:
    cni:
      cniBinDir: /var/lib/cni/bin
      cniConfDir: /etc/cni/multus/net.d
      chained: false
      cniConfFileName: "istio-cni.conf"
```

On OpenShift, you also need a NetworkAttachmentDefinition:

```yaml
apiVersion: k8s.cni.cncf.io/v1
kind: NetworkAttachmentDefinition
metadata:
  name: istio-cni
  namespace: default
```

And annotate your pods to use it:

```yaml
metadata:
  annotations:
    k8s.v1.cni.cncf.io/networks: istio-cni
```

## Verifying the CNI Plugin Installation

After installation, run through these checks:

```bash
# 1. DaemonSet is running on all nodes
kubectl get daemonset -n istio-system istio-cni-node

# 2. All pods are ready
kubectl get pods -n istio-system -l k8s-app=istio-cni-node

# 3. The binary was installed
kubectl exec -n istio-system $(kubectl get pods -n istio-system -l k8s-app=istio-cni-node -o jsonpath='{.items[0].metadata.name}') -c install-cni -- ls /host/opt/cni/bin/istio-cni

# 4. The config was modified
kubectl exec -n istio-system $(kubectl get pods -n istio-system -l k8s-app=istio-cni-node -o jsonpath='{.items[0].metadata.name}') -c install-cni -- cat /host/etc/cni/net.d/10-calico.conflist | python3 -m json.tool
```

## Testing That Init Containers Are No Longer Needed

Deploy a test pod and verify that no init container is injected:

```bash
kubectl create namespace cni-test
kubectl label namespace cni-test istio-injection=enabled

kubectl apply -n cni-test -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: test-pod
spec:
  containers:
    - name: app
      image: nginx:latest
      ports:
        - containerPort: 80
EOF
```

Check the pod spec:

```bash
kubectl get pod -n cni-test test-pod -o jsonpath='{.spec.initContainers[*].name}'
```

With the CNI plugin enabled, you should not see `istio-init` in the init containers. The sidecar proxy container (istio-proxy) will still be present as a regular container.

## Upgrading the CNI Plugin

During Istio upgrades, upgrade the CNI plugin first:

```bash
# Step 1: Upgrade CNI
istioctl install -f istio-cni-config.yaml --set tag=1.21.0 -y

# Step 2: Wait for rollout
kubectl rollout status daemonset/istio-cni-node -n istio-system

# Step 3: Then upgrade the rest of Istio
istioctl upgrade -f istio-cni-config.yaml -y
```

This order matters because the CNI binary on the node needs to be compatible with the iptables rules that new sidecars expect.

## Cleanup

If you need to remove the CNI plugin and go back to init containers:

```bash
istioctl install --set components.cni.enabled=false -y
```

Then restart all workload pods so they get the istio-init container injected again.

The Istio CNI plugin is straightforward to configure once you know the platform-specific settings. For most standard Kubernetes clusters, enabling it with `chained: true` and the default paths is all you need. For managed Kubernetes services like GKE or OpenShift, adjust the paths and integration method accordingly.
