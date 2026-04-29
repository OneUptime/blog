# How to Set Up K3s with Rootless Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Security, Rootless, Linux, Container, DevOps

Description: Learn how to run K3s in rootless mode to improve security by running the entire cluster without root privileges.

## Introduction

Running container workloads as root is a security risk - if a container escape occurs, an attacker could gain root access to the host. K3s supports **rootless mode**, which runs the entire K3s server (including containerd and networking) as a non-root user using user namespaces. This significantly reduces the attack surface. This guide covers setting up and using K3s in rootless mode.

## Understanding Rootless Mode

In rootless mode:
- K3s runs as a regular user (no root required after initial setup)
- User namespaces isolate the K3s process from the root namespace
- rootlesskit handles networking through user-space networking
- Some features have limitations (for example, service ports below 1024 are exposed on the host with a `+10000` offset)

## Prerequisites

- Linux with pure cgroup v2 support (kernel 4.15+; 5.2+ recommended)
- User namespaces enabled
- `newuidmap` and `newgidmap` tools (`uidmap` package)
- A non-root user account with `subuid` and `subgid` ranges configured
- systemd user session support

## Step 1: Verify System Requirements

```bash
# Check if user namespaces are enabled
K3S_USER=k3s-user

# Create the user first if it does not already exist
id "${K3S_USER}" 2>/dev/null || sudo useradd -m -s /bin/bash "${K3S_USER}"

cat /proc/sys/kernel/unprivileged_userns_clone
# Should be 1 on most modern distributions

# If you need to persist it, write a sysctl drop-in and reload
echo "kernel.unprivileged_userns_clone=1" | sudo tee /etc/sysctl.d/99-rootless.conf
sudo sysctl --system

# Check for required tools
which newuidmap newgidmap || sudo apt-get install -y uidmap

# Check for pure cgroup v2
stat -fc %T /sys/fs/cgroup/
# Should print: cgroup2fs
# Hybrid v1/v2 is not supported in rootless K3s

# Delegate cgroup controllers to user sessions
sudo mkdir -p /etc/systemd/system/user@.service.d
cat <<'EOF' | sudo tee /etc/systemd/system/user@.service.d/delegate.conf
[Service]
Delegate=cpu cpuset io memory pids
EOF
sudo systemctl daemon-reload
# Reboot or re-login after changing cgroup delegation

# Verify user has a subuid/subgid range
grep "^${K3S_USER}:" /etc/subuid /etc/subgid
# Should show: k3s-user:100000:65536
# If missing:
sudo usermod --add-subuids 100000-165535 "${K3S_USER}"
sudo usermod --add-subgids 100000-165535 "${K3S_USER}"
```

## Step 2: Install K3s in Rootless Mode

Install the K3s binary, then switch to the non-root user you'll run it as:

```bash
# Install the K3s binary
VERSION=$(curl -w '%{url_effective}' -L -s -S https://update.k3s.io/v1-release/channels/stable -o /dev/null | sed -e 's|.*/||')
ARCH=$(uname -m)
case "${ARCH}" in
  x86_64) K3S_BIN=k3s ;;
  aarch64|arm64) K3S_BIN=k3s-arm64 ;;
  armv7l|armv6l|armhf) K3S_BIN=k3s-armhf ;;
  s390x) K3S_BIN=k3s-s390x ;;
  *) echo "Unsupported architecture: ${ARCH}" >&2; exit 1 ;;
esac
sudo curl -Lo /usr/local/bin/k3s "https://github.com/k3s-io/k3s/releases/download/${VERSION}/${K3S_BIN}"
sudo chmod 0755 /usr/local/bin/k3s

# On Ubuntu or other distributions with AppArmor support, allow K3s to run unconfined
cat <<'EOF' | sudo tee "/etc/apparmor.d/usr.local.bin.k3s"
abi <abi/4.0>,
include <tunables/global>

/usr/local/bin/k3s flags=(unconfined) {
  userns,

  include if exists <local/usr.local.bin.k3s>
}
EOF
sudo systemctl restart apparmor.service

# Allow the user service to run at boot
sudo loginctl enable-linger k3s-user

# Start a real login session as the non-root user so XDG_RUNTIME_DIR is set
ssh k3s-user@localhost
# Or, as root: machinectl shell k3s-user@
```

## Step 3: Configure systemd User Service

For rootless K3s to start automatically:

```bash
# As k3s-user, confirm the user session is ready
echo $XDG_RUNTIME_DIR
# Should be: /run/user/<uid>

# Install the rootless systemd unit
VERSION=$(k3s --version | awk 'NR==1 {print $3}')
mkdir -p ~/.config/systemd/user ~/.kube
curl -Lo ~/.config/systemd/user/k3s-rootless.service \
  "https://raw.githubusercontent.com/k3s-io/k3s/${VERSION}/k3s-rootless.service"

# If k3s is not installed at /usr/local/bin/k3s, update the ExecStart path
grep ExecStart ~/.config/systemd/user/k3s-rootless.service

# Reload systemd and start rootless K3s
systemctl --user daemon-reload
systemctl --user enable --now k3s-rootless

# Check status
systemctl --user status k3s-rootless

# View logs
journalctl --user -u k3s-rootless -f
```

## Step 4: Configure kubectl for Rootless K3s

```bash
# As k3s-user, set the kubeconfig path used by rootless K3s
export KUBECONFIG=~/.kube/k3s.yaml

# The rootless kubeconfig is written here
ls ~/.kube/k3s.yaml

# Add to .bashrc for persistence
echo 'export KUBECONFIG=~/.kube/k3s.yaml' >> ~/.bashrc
source ~/.bashrc

# Test
k3s kubectl get nodes
```

## Step 5: Configure Networking for Rootless Mode

Rootless mode uses user-space networking with limitations:

```bash
# Check rootlesskit is running
ps aux | grep rootlesskit

# Rootless K3s runs in a separate network namespace
# The apiserver is automatically bound on host port 6443
# LoadBalancer Services below 1024 are bound to the host with an offset of 10000
# Example: a Service on port 80 becomes host port 10080
# Only LoadBalancer Services are automatically bound
```

## Step 6: Verify Rootless Mode is Working

```bash
# Check K3s is running as non-root
ps aux | grep k3s | head -5
# The k3s process should show as k3s-user, not root

# Verify there is no root-owned K3s server process
pgrep -u root -a k3s || echo "No root-owned K3s process"

# Check inside a container
k3s kubectl run whoami --image=busybox --restart=Never -- \
  sh -c 'id && cat /proc/self/status | grep -E "Uid|Gid|CapE"'

k3s kubectl logs whoami
k3s kubectl delete pod whoami

# Verify pods start normally under the rootless server
k3s kubectl run ns-check --image=busybox --restart=Never -- \
  sh -c 'ls /proc/1/ns/'
k3s kubectl logs ns-check
k3s kubectl delete pod ns-check
```

## Step 7: Storage Considerations

Rootless mode affects how volumes work:

```bash
# Check K3s data directory in rootless mode
ls -la ~/.rancher/k3s/
# Data is stored in user home directory, not /var/lib/rancher/k3s/

# Inspect the effective local-path-provisioner configuration
k3s kubectl -n kube-system get configmap local-path-config -o yaml

# To change the default storage path persistently, add
# --default-local-storage-path=/home/k3s-user/storage
# to the ExecStart line in ~/.config/systemd/user/k3s-rootless.service
```

## Step 8: Deploy a Test Workload

```yaml
# rootless-test.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rootless-nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: rootless-nginx
  template:
    metadata:
      labels:
        app: rootless-nginx
    spec:
      # Rootless containers should not run as root
      securityContext:
        runAsNonRoot: true
      containers:
        - name: nginx
          # Use nginx-unprivileged which runs as non-root
          image: nginxinc/nginx-unprivileged:alpine
          ports:
            - containerPort: 8080  # Non-privileged port
          securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
```

```bash
k3s kubectl apply -f rootless-test.yaml
k3s kubectl get pods
k3s kubectl port-forward deployment/rootless-nginx 8080:8080 &
curl http://localhost:8080/
```

## Step 9: Limitations of Rootless Mode

Be aware of these limitations:

```bash
# 1. Rootless mode is experimental
# 2. Only pure cgroup v2 is supported; cgroup v1 and hybrid v1/v2 are not
# 3. Multi-node rootless clusters are not currently supported
# 4. Multiple rootless K3s processes on the same node are not supported
# 5. Only LoadBalancer Services are automatically bound to host ports

# Check that the rootless flag is available
k3s server --help | grep -A1 rootless

# Do not run `k3s server --rootless` directly in a terminal;
# use the k3s-rootless user service instead
```

## Conclusion

K3s rootless mode provides a significant security improvement by eliminating root privileges from the container orchestration stack. While it has some limitations around networking, cgroup requirements, and multi-node support, rootless mode is excellent for development environments, multi-tenant systems, or any deployment where security is paramount. As Linux kernel support for user namespaces continues to improve, rootless Kubernetes deployments will become more capable and widely adopted.
