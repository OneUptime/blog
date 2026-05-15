# How to Deploy k3s Lightweight Kubernetes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kubernetes, Container, k3s, Linux

Description: Learn how to deploy k3s Lightweight Kubernetes on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Deploy k3s Lightweight Kubernetes on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A unique hostname for each node

## Overview

Deploying k3s Lightweight Kubernetes requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl
```

On RHEL 10, install the additional kernel modules package required by k3s:

```bash
sudo dnf install -y kernel-modules-extra
```

## Step 2: Install Required Packages

```bash
curl -sfL https://get.k3s.io | sh -
```

Verify the installation:

```bash
sudo k3s --version
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo mkdir -p /etc/rancher/k3s
sudo vi /etc/rancher/k3s/config.yaml
```

Apply the recommended settings for your environment. Start with the defaults and adjust based on your workload and hardware. For example:

```yaml
write-kubeconfig-mode: "0644"
node-label:
  - "environment=lab"
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl enable k3s
sudo systemctl restart k3s
sudo systemctl status k3s
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo k3s kubectl get nodes
sudo k3s kubectl get pods --all-namespaces
```

Check the logs for any errors:

```bash
sudo journalctl -u k3s -f
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo firewall-cmd --permanent --add-port=6443/tcp
sudo firewall-cmd --permanent --zone=trusted --add-source=10.42.0.0/16
sudo firewall-cmd --permanent --zone=trusted --add-source=10.43.0.0/16
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show k3s --property=MemoryCurrent
top -p $(pidof k3s)
```

## Security Considerations

- Protect `/etc/rancher/k3s/k3s.yaml` because it grants cluster access
- Use TLS subject alternative names with `tls-san` when the API server is reached through a DNS name or load balancer
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u k3s -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured k3s Lightweight Kubernetes on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
