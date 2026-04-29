# How to Configure K3s to Use containerd - Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Containerd, Container Runtime, Kubernetes, Configuration, SUSE Rancher

Description: Learn how to configure K3s with containerd including private registry authentication, mirror configuration, runtime settings, and debugging containerd issues.

---

K3s uses containerd as its default container runtime. Understanding how to configure containerd directly allows you to manage private registries, mirrors, and runtime settings without modifying K3s itself.

---

## containerd Configuration Location

K3s manages its own containerd instance, separate from any system-wide containerd:

```text
/var/lib/rancher/k3s/agent/etc/containerd/config.toml          # Active config (managed by K3s)
/var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.tmpl  # Template for containerd 2.0
/var/lib/rancher/k3s/agent/etc/containerd/config.toml.tmpl     # Template for containerd 1.7 and earlier
```

To customize containerd on current K3s releases, edit `config-v3.toml.tmpl` - K3s uses the template to regenerate `config.toml` on startup.

---

## Step 1: Configure Private Registry Authentication

```yaml
# /etc/rancher/k3s/registries.yaml

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
      insecure_skip_verify: false      # Set true only for self-signed certs in dev
```

Restart K3s on each node to apply:

```bash
# On server nodes
systemctl restart k3s

# On agent nodes
systemctl restart k3s-agent
```

---

## Step 2: Configure Registry Mirrors

```yaml
# /etc/rancher/k3s/registries.yaml
mirrors:
  "docker.io":
    endpoint:
      - "https://mirror.example.com"

  "ghcr.io":
    endpoint:
      - "https://ghcr-mirror.example.com"
```

containerd still tries each registry's default endpoint as a last resort unless K3s is started with `--disable-default-registry-endpoint`.

---

## Step 3: Customize the containerd Config Template

For advanced runtime settings, extend the base containerd template instead of copying a rendered `config.toml`:

```toml
# /var/lib/rancher/k3s/agent/etc/containerd/config-v3.toml.tmpl
{{ template "base" . }}

[plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.'custom']
  runtime_type = "io.containerd.runc.v2"

[plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.'custom'.options]
  BinaryName = "/usr/bin/custom-container-runtime"
  SystemdCgroup = true
```

---

## Step 4: Use ctr to Interact with containerd

K3s bundles `ctr` and the K3s CLI can interact with the embedded containerd:

```bash
# List containers in the Kubernetes namespace
k3s ctr -n k8s.io containers list

# List images in the Kubernetes namespace
k3s ctr -n k8s.io images list

# Pull an image manually into K3s containerd
k3s ctr -n k8s.io images pull docker.io/library/nginx:1.24

# List containerd snapshots in the Kubernetes namespace
k3s ctr -n k8s.io snapshots list

# View containerd info
k3s ctr info
```

---

## Step 5: Debug containerd Issues

```bash
# Check containerd socket
ls -la /run/k3s/containerd/containerd.sock

# View K3s service logs on server nodes
journalctl -u k3s

# View K3s service logs on agent nodes
journalctl -u k3s-agent

# View containerd logs
tail -f /var/lib/rancher/k3s/agent/containerd/containerd.log

# Check the active containerd config
cat /var/lib/rancher/k3s/agent/etc/containerd/config.toml

# Check if a specific image was pulled
k3s ctr -n k8s.io images list | grep nginx

# List current tasks
k3s ctr -n k8s.io tasks list
```

---

## Step 6: Configure containerd for GPU Support

For GPU workloads, K3s automatically detects the NVIDIA container runtime if it is installed when K3s starts:

```bash
# Restart K3s after installing nvidia-container-runtime on the node
# Server nodes
systemctl restart k3s

# Agent nodes
systemctl restart k3s-agent

# Confirm that K3s added the NVIDIA runtime
grep nvidia /var/lib/rancher/k3s/agent/etc/containerd/config.toml
```

Then in your Pod spec, reference the runtime class:

```yaml
spec:
  runtimeClassName: nvidia
```

---

## Best Practices

- Always use `/etc/rancher/k3s/registries.yaml` for registry configuration instead of editing the containerd config directly - K3s reads registries.yaml and manages the containerd config automatically.
- After any containerd configuration change, verify by pulling a test image: `k3s ctr -n k8s.io images pull docker.io/library/hello-world:latest`.
- If you add custom runc-based runtimes, keep `SystemdCgroup` aligned with the node's cgroup driver.
