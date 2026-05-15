# How to Install and Configure k9s Terminal UI for Kubernetes on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Kubernetes, Linux

Description: Step-by-step guide on install and configure k9s terminal ui for kubernetes using Red Hat Enterprise Linux 9.

---

k9s Terminal UI for Kubernetes can be installed and configured on RHEL to provide robust functionality for your infrastructure. This guide walks through the installation, basic configuration, and verification steps.

## Prerequisites

- RHEL with a valid subscription or CentOS Stream 9
- Root or sudo access
- A terminal session
- A running Kubernetes cluster
- `kubectl` installed and configured
- A valid kubeconfig file for the cluster, typically at `~/.kube/config`

## Step 1: Install k9s

```bash
# Update the system first

sudo dnf update -y

# Install k9s from the official RPM release for x86_64/amd64 systems
sudo dnf install -y https://github.com/derailed/k9s/releases/latest/download/k9s_linux_amd64.rpm
```

Use the RPM that matches your system architecture if you are not on x86_64/amd64.

## Step 2: Configure k9s

k9s uses your Kubernetes kubeconfig to connect to the cluster. Confirm that your current context points to the cluster you want to manage:

```bash
# Check the current Kubernetes context
kubectl config current-context
```

k9s stores its own configuration under `~/.config/k9s` on Linux. You can inspect the active paths with:

```bash
# Show k9s configuration and data locations
k9s info
```

Adjust the settings according to your requirements in `~/.config/k9s/config.yaml`. Key parameters to configure include refresh rate, UI settings, and namespace preferences.

## Step 3: Start k9s

```bash
# Start k9s using the default kubeconfig
k9s

# Or start k9s with a specific kubeconfig
k9s --kubeconfig ~/.kube/config

# Check the installed version
k9s version
```


## Verification

Confirm everything is working by checking Kubernetes access and k9s startup information:

```bash
# Check Kubernetes API access with your current kubeconfig
kubectl cluster-info

# Review k9s configuration and log locations
k9s info
```

## Troubleshooting

- If k9s cannot connect to the cluster, verify the current context with `kubectl config current-context`.
- Ensure k9s is installed: `rpm -qa | grep k9s`.
- If you use a non-default kubeconfig, start k9s with `k9s --kubeconfig /path/to/config` or set the `KUBECONFIG` environment variable.

## Conclusion

You have successfully completed the setup described in this guide. Remember to review the k9s logs regularly to catch issues early. For production environments, always test changes in a staging environment first and keep your RHEL system updated with the latest security patches.
