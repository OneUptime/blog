# How to Install k0s Kubernetes Distribution on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kubernetes, Container, k0s, Linux

Description: Learn how to install k0s Kubernetes Distribution on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install k0s Kubernetes Distribution on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection

## Overview

Install k0s Kubernetes Distribution requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install any required dependencies:

```bash
sudo dnf install -y curl
```

## Step 2: Install Required Packages

```bash
curl --proto '=https' --tlsv1.2 -sSf https://get.k0s.sh | sudo sh
```

Verify the installation:

```bash
k0s version
```

## Step 3: Configure the Service

Create or edit the main configuration file:

```bash
sudo mkdir -p /etc/k0s
sudo k0s config create | sudo tee /etc/k0s/k0s.yaml >/dev/null
sudo vi /etc/k0s/k0s.yaml
```

Apply the recommended settings for your environment. Start with the defaults and adjust based on your workload and hardware.

## Step 4: Start and Enable the Service

```bash
sudo k0s install controller --single -c /etc/k0s/k0s.yaml --start
sudo k0s status
```

## Step 5: Verify the Configuration

Test the setup:

```bash
sudo k0s kubectl get nodes
```

Check the logs for any errors:

```bash
sudo journalctl -u k0scontroller -f
```

## Step 6: Configure Firewall Rules

If the service needs network access:

```bash
sudo firewall-cmd --permanent --add-port=2380/tcp
sudo firewall-cmd --permanent --add-port=6443/tcp
sudo firewall-cmd --permanent --add-port=8132/tcp
sudo firewall-cmd --permanent --add-port=9443/tcp
sudo firewall-cmd --permanent --add-port=179/tcp
sudo firewall-cmd --permanent --add-port=10250/tcp
sudo firewall-cmd --permanent --add-masquerade
sudo firewall-cmd --permanent --add-source=10.244.0.0/16
sudo firewall-cmd --permanent --add-source=10.96.0.0/12
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show k0scontroller --property=MemoryCurrent
top -p "$(pidof k0s | tr ' ' ',')"
```

## Security Considerations

- Use least-privilege Kubernetes workloads and avoid running application containers as root when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `sudo journalctl -u k0scontroller -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured k0s Kubernetes Distribution on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
