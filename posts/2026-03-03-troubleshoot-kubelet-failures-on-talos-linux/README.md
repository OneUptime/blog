# How to Troubleshoot Kubelet Failures on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Kubelet, Troubleshooting, Container Runtime

Description: Learn how to diagnose and resolve kubelet failures on Talos Linux, including common error patterns, log analysis, and configuration fixes.

---

The kubelet is the primary agent that runs on every Kubernetes node. It is responsible for managing pods, communicating with the API server, and ensuring containers are running as expected. On Talos Linux, the kubelet is managed as a system service, which means you interact with it differently than on a traditional Linux distribution. When kubelet fails on Talos, your node will appear as NotReady, and pods will not be scheduled on it.

This guide covers the most frequent kubelet failure scenarios on Talos Linux and how to resolve them.

## Checking Kubelet Status

The first thing you should do is check whether the kubelet service is running at all:

```bash
# Check the status of the kubelet service
talosctl -n <node-ip> service kubelet
```

This will tell you if the service is running, stopped, or in an error state. You will see output that includes the service state, health status, and any recent events.

If the kubelet is not running, check the service logs:

```bash
# View the last 100 lines of kubelet logs
talosctl -n <node-ip> logs kubelet --tail 100
```

## Common Kubelet Failure: Unable to Connect to API Server

One of the most frequent kubelet errors looks like this in the logs:

```
E0303 10:15:42.123456 kubelet.go:2347] "Error getting node" err="Get \"https://10.0.0.10:6443/api/v1/nodes/talos-worker-1\": dial tcp 10.0.0.10:6443: connect: connection refused"
```

This means the kubelet cannot reach the Kubernetes API server. Potential causes:

1. The control plane endpoint is wrong in the machine configuration
2. The API server is not running on the control plane nodes
3. A firewall is blocking port 6443

Verify the endpoint in your configuration:

```bash
# Check the cluster endpoint configured on this node
talosctl -n <node-ip> get machineconfiguration -o yaml | grep endpoint
```

Then verify you can reach it:

```bash
# Test API server connectivity from your workstation
curl -k https://<control-plane-endpoint>:6443/healthz
```

## Common Kubelet Failure: Certificate Issues

Kubelet uses client certificates to authenticate with the API server. If the certificates are expired or do not match, you will see errors like:

```
E0303 10:20:00.000000 kubelet.go:2347] "Error getting node" err="Unauthorized"
```

On Talos, certificates are managed automatically. If they become stale, regenerate the machine configuration and re-apply it:

```bash
# Regenerate and apply fresh configuration
talosctl gen config my-cluster https://<endpoint>:6443
talosctl apply-config -n <node-ip> --file worker.yaml
```

You can also check the certificate status:

```bash
# View current certificate information
talosctl -n <node-ip> get certificate
```

## Common Kubelet Failure: Container Runtime Not Ready

The kubelet depends on the container runtime (containerd on Talos) being functional. If containerd is not ready, the kubelet will fail with messages like:

```
E0303 10:25:00.000000 kubelet.go:2347] "Container runtime not ready" msg="runtime status check failed"
```

Check the containerd service:

```bash
# Check containerd status
talosctl -n <node-ip> service containerd

# View containerd logs for errors
talosctl -n <node-ip> logs containerd --tail 50
```

If containerd is failing, it may be a disk space issue. Check available disk space:

```bash
# Check disk usage on the node
talosctl -n <node-ip> usage /var
```

## Common Kubelet Failure: Node Resource Pressure

Kubelet monitors node resources and will start evicting pods or report issues when resources are constrained. You might see taints applied automatically:

```bash
# Check node conditions
kubectl describe node <node-name> | grep -A 5 Conditions
```

Look for conditions like `MemoryPressure`, `DiskPressure`, or `PIDPressure`. If any of these are `True`, the kubelet is reporting resource constraints.

For disk pressure, you can check what is consuming space:

```bash
# Check disk usage breakdown
talosctl -n <node-ip> usage /var/lib/containerd
talosctl -n <node-ip> usage /var/log
```

## Common Kubelet Failure: Wrong Cluster DNS Configuration

If the kubelet has an incorrect cluster DNS setting, pods will start but DNS resolution inside containers will fail. The kubelet configuration in Talos is set through the machine config:

```yaml
machine:
  kubelet:
    clusterDNS:
      - 10.96.0.10  # This must match your CoreDNS service IP
```

Verify the CoreDNS service IP:

```bash
# Check the CoreDNS service cluster IP
kubectl -n kube-system get svc kube-dns
```

If these do not match, update your machine configuration and apply it.

## Common Kubelet Failure: Static Pod Manifest Errors

On control plane nodes, the kubelet runs static pods for the API server, controller manager, scheduler, and etcd. If any of these manifests are invalid, the kubelet may fail to start them.

```bash
# Check static pod status on a control plane node
talosctl -n <cp-ip> get staticpodstatus
```

If a static pod is not starting, check its specific logs:

```bash
# View logs for the API server static pod
talosctl -n <cp-ip> logs kube-apiserver

# View logs for the scheduler
talosctl -n <cp-ip> logs kube-scheduler
```

## Kubelet Configuration Overrides

Talos lets you pass extra kubelet arguments and configuration through the machine config. If you have overrides that conflict with Talos defaults, the kubelet may fail to start:

```yaml
machine:
  kubelet:
    extraArgs:
      rotate-server-certificates: "true"
      max-pods: "200"
    extraConfig:
      serializeImagePulls: false
```

Be careful with `extraArgs` - some flags are not compatible with the kubelet version bundled in your Talos release. If you recently added extra arguments and kubelet stopped working, try removing them one by one to find the problematic flag.

## Kubelet Not Registering the Node

Sometimes kubelet runs but the node does not appear in `kubectl get nodes`. This usually means the node registered with a different name or the kubelet cannot authenticate.

Check the node name the kubelet is using:

```bash
# Check the hostname/node name
talosctl -n <node-ip> get hostname
```

Compare this with what appears in the API server. If you have a custom hostname set in the machine config, make sure it is valid (lowercase, no special characters, and follows DNS naming rules).

## Restarting Kubelet

On Talos, you cannot use `systemctl` like on a regular Linux system. Instead, use `talosctl`:

```bash
# Restart the kubelet service
talosctl -n <node-ip> service kubelet restart
```

After restarting, monitor the logs to see if the issue recurs:

```bash
# Follow kubelet logs in real time
talosctl -n <node-ip> logs kubelet --follow
```

## When All Else Fails

If kubelet refuses to work after trying all the above steps, consider these last-resort options:

1. Upgrade or downgrade Talos to a different version, as the issue may be a known bug
2. Reset the node and start fresh with a new configuration
3. Check the Talos GitHub issues for your specific error message

```bash
# Upgrade Talos on the node
talosctl -n <node-ip> upgrade --image ghcr.io/siderolabs/installer:v1.7.0

# Or reset the node completely
talosctl -n <node-ip> reset --graceful=false
```

Kubelet failures on Talos Linux almost always leave a clear trail in the logs. The key is reading those logs carefully and matching the error messages to the scenarios described above. Start with `talosctl service kubelet` and `talosctl logs kubelet`, and work from there.
