# How to Troubleshoot Image Pull Failures on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Container Image, Kubernetes, Troubleshooting, Container Registry

Description: Step-by-step guide to fixing container image pull failures on Talos Linux, including registry authentication, network issues, and containerd configuration.

---

Container image pull failures are one of the most common issues you will face on any Kubernetes cluster, and Talos Linux is no exception. When an image cannot be pulled, the pod gets stuck in an `ImagePullBackOff` or `ErrImagePull` state. Since Talos uses containerd as its container runtime and does not allow direct access to the filesystem, debugging image pull issues requires a different approach than on traditional Linux distributions.

## Identifying Image Pull Failures

Start by checking the pod status:

```bash
# Check pods with image pull problems
kubectl get pods -A | grep -E "ImagePull|ErrImage"

# Describe the failing pod for details
kubectl describe pod <pod-name> -n <namespace>
```

The Events section will show you the exact error. Common messages include:

- `Failed to pull image: rpc error: code = NotFound desc = failed to pull and unpack image`
- `Failed to pull image: rpc error: code = Unknown desc = failed to resolve reference`
- `Failed to pull image: rpc error: code = Unknown desc = failed to do request: Head: dial tcp: lookup registry.example.com: no such host`

Each of these points to a different root cause.

## Cause 1: Image Does Not Exist

The simplest cause is that the image tag is wrong or the image does not exist in the registry:

```bash
# Verify the image exists by pulling it from your workstation
docker pull <image-name>:<tag>

# Or check with crane/skopeo
skopeo inspect docker://<image-name>:<tag>
```

Common mistakes include:

- Typos in the image name or tag
- Using `latest` tag when the registry does not have a `latest` tag
- Referencing a private registry without the full hostname

Make sure your pod spec has the correct image reference:

```yaml
containers:
  - name: myapp
    image: registry.example.com/myapp:v1.2.3  # Full path with tag
```

## Cause 2: Registry Authentication Required

If your images are in a private registry, containerd needs credentials to pull them. On Talos, you configure registry authentication in the machine config:

```yaml
machine:
  registries:
    config:
      registry.example.com:
        auth:
          username: myuser
          password: mypassword
```

Alternatively, you can use Kubernetes image pull secrets:

```bash
# Create a pull secret
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  -n <namespace>
```

Then reference it in your pod spec:

```yaml
spec:
  imagePullSecrets:
    - name: regcred
  containers:
    - name: myapp
      image: registry.example.com/myapp:v1.2.3
```

If you are using both the Talos machine config and Kubernetes secrets, the machine config takes precedence for the containerd level, while Kubernetes secrets work at the kubelet level.

## Cause 3: DNS Resolution Failure

If the node cannot resolve the registry hostname, the pull will fail:

```bash
# Check host DNS configuration
talosctl -n <node-ip> get resolvers

# Check if DNS is working by looking at container pull history
talosctl -n <node-ip> containers
```

Fix DNS by updating the machine configuration:

```yaml
machine:
  network:
    nameservers:
      - 8.8.8.8
      - 1.1.1.1
```

## Cause 4: Network Connectivity to Registry

Even with DNS working, the node might not be able to reach the registry due to firewall rules or network configuration:

```bash
# From a debug pod, test registry connectivity
kubectl run regtest --image=busybox --restart=Never -- wget -qO- https://registry.example.com/v2/

# Check if the node can reach the internet
talosctl -n <node-ip> get routes
```

If you are behind a corporate firewall or proxy, configure the proxy in the machine config:

```yaml
machine:
  env:
    http_proxy: http://proxy.example.com:8080
    https_proxy: http://proxy.example.com:8080
    no_proxy: 10.0.0.0/8,192.168.0.0/16,localhost,127.0.0.1
```

## Cause 5: TLS Certificate Issues

If your private registry uses a self-signed certificate or a private CA, containerd will reject the connection:

```
x509: certificate signed by unknown authority
```

Configure Talos to trust the registry's CA:

```yaml
machine:
  registries:
    config:
      registry.example.com:
        tls:
          ca: |
            -----BEGIN CERTIFICATE-----
            MIIDxTCCAq2gAwIBAgIJAN...
            -----END CERTIFICATE-----
```

For registries running without TLS (not recommended), you can mark them as insecure:

```yaml
machine:
  registries:
    config:
      registry.example.com:
        tls:
          insecureSkipVerify: true
```

## Cause 6: Disk Space Issues

If the node does not have enough disk space to store the image, the pull will fail:

```bash
# Check available disk space
talosctl -n <node-ip> usage /var/lib/containerd
```

If disk space is low, clean up unused images by draining the node and letting garbage collection run, or increase the disk size.

## Cause 7: Rate Limiting

Public registries like Docker Hub enforce rate limits. If your cluster pulls many images frequently, you may hit these limits:

```
toomanyrequests: You have reached your pull rate limit
```

Solutions include:

1. Use a registry mirror to cache images locally
2. Authenticate with Docker Hub to get higher limits
3. Pre-pull images on nodes during maintenance windows

Configure a registry mirror in Talos:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://mirror.example.com
```

## Cause 7: Image Architecture Mismatch

If you are running Talos on ARM64 hardware but the image only has an AMD64 variant (or vice versa), the pull will fail:

```bash
# Check the node architecture
kubectl get nodes -o custom-columns=NAME:.metadata.name,ARCH:.status.nodeInfo.architecture

# Verify the image supports the right architecture
docker manifest inspect <image-name>:<tag>
```

Make sure your images are built for the correct architecture, or use multi-arch images.

## Cause 8: containerd Configuration Issues

If containerd itself is not healthy, no images can be pulled:

```bash
# Check containerd service status
talosctl -n <node-ip> service containerd

# View containerd logs
talosctl -n <node-ip> logs containerd --tail 50
```

If containerd is restarting or in an error state, check the Talos dmesg for potential underlying issues:

```bash
# Check kernel logs for containerd-related issues
talosctl -n <node-ip> dmesg | grep -i containerd
```

## Debugging Image Pulls

To get more detailed information about what is happening during an image pull, you can check containerd events:

```bash
# Watch containerd events
talosctl -n <node-ip> events --tail 20
```

You can also check the list of images that are currently on the node:

```bash
# List all images on the node
talosctl -n <node-ip> images
```

## Pre-pulling Images

For critical workloads, you can pre-pull images to avoid pull failures during deployment:

```bash
# Create a DaemonSet that pulls the image on every node
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: image-prepull
  namespace: default
spec:
  selector:
    matchLabels:
      name: image-prepull
  template:
    metadata:
      labels:
        name: image-prepull
    spec:
      initContainers:
        - name: pull
          image: registry.example.com/myapp:v1.2.3
          command: ["sh", "-c", "echo done"]
      containers:
        - name: pause
          image: registry.k8s.io/pause:3.9
EOF
```

## Summary

Image pull failures on Talos Linux usually come down to one of these issues: wrong image name, missing registry credentials, DNS failures, network connectivity, TLS certificate problems, or disk space. Start by describing the pod to get the exact error message, then work through the possible causes. Configure registry authentication and mirrors in the Talos machine configuration for the best experience, and always verify that your nodes can reach the registries they need.
