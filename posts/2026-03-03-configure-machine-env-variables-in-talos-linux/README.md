# How to Configure Machine Env Variables in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Environment Variables, Machine Configuration, Kubernetes, Proxy

Description: A complete guide to setting machine-level environment variables in Talos Linux for proxy settings, runtime configuration, and system tuning.

---

Environment variables at the machine level in Talos Linux control how system services behave. Unlike pod-level environment variables that you set in Kubernetes manifests, machine environment variables affect the Talos OS itself and its core services, including containerd, the kubelet, and the Talos API server. The most common reason to set machine-level environment variables is to configure HTTP proxy settings for nodes that sit behind a corporate proxy, but there are other uses as well.

This guide walks through how to configure, apply, and troubleshoot machine environment variables in Talos Linux.

## The Machine Env Configuration

Machine environment variables are defined under `machine.env` in the Talos machine configuration. The syntax is straightforward - it is a map of key-value pairs:

```yaml
# Set machine-level environment variables
machine:
  env:
    HTTPS_PROXY: http://proxy.company.com:8080
    HTTP_PROXY: http://proxy.company.com:8080
    NO_PROXY: localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16,.svc,.cluster.local
```

These variables are set at the system level and are available to all Talos-managed services. They take effect when the node boots and persist across reboots.

## Proxy Configuration

The most frequent use of `machine.env` is configuring proxy settings. In enterprise environments, nodes often need to route external traffic through an HTTP proxy. Without proper proxy configuration, your nodes will not be able to pull container images, download updates, or communicate with external APIs.

```yaml
# Complete proxy configuration for enterprise environments
machine:
  env:
    HTTP_PROXY: http://squid.internal.company.com:3128
    HTTPS_PROXY: http://squid.internal.company.com:3128
    NO_PROXY: >-
      localhost,
      127.0.0.1,
      10.0.0.0/8,
      172.16.0.0/12,
      192.168.0.0/16,
      .svc,
      .cluster.local,
      .company.internal
```

The `NO_PROXY` variable is critical. It tells services which addresses should bypass the proxy entirely. You always want to include your pod and service CIDRs, the cluster domain, localhost, and any internal domains. Forgetting to set `NO_PROXY` correctly is one of the most common causes of mysterious networking failures in proxied environments.

Let me break down what each entry in `NO_PROXY` does:

```yaml
machine:
  env:
    NO_PROXY: >-
      localhost,          # Loopback hostname
      127.0.0.1,          # Loopback IP
      10.0.0.0/8,         # Common pod CIDR range
      172.16.0.0/12,      # Common service CIDR range
      192.168.0.0/16,     # Common node network range
      .svc,               # Kubernetes service DNS suffix
      .cluster.local,     # Kubernetes cluster DNS domain
      .internal.company   # Internal company domain
```

## How Environment Variables Propagate

When you set variables in `machine.env`, they flow into several system components:

1. The CRI (containerd) picks them up, which means image pulls respect proxy settings
2. The kubelet inherits them, so node-to-API-server communication goes through the proxy if needed
3. The Talos apid service uses them for any outbound connections

However, these variables do not automatically propagate into pods. Pods need their own environment variable configuration through Kubernetes manifests, ConfigMaps, or mutating webhooks. This is an important distinction that trips people up.

```yaml
# These machine-level env vars affect system services, NOT pods
machine:
  env:
    HTTP_PROXY: http://proxy:3128

# For pods, you need Kubernetes-level configuration:
# - Pod env vars in manifests
# - A mutating webhook that injects proxy vars
# - ConfigMaps mounted into pods
```

## Setting Custom Variables

Beyond proxy settings, you can set any environment variable that system services might need:

```yaml
# Custom environment variables for system tuning
machine:
  env:
    # Increase containerd log verbosity
    CONTAINERD_LOG_LEVEL: debug

    # Set a custom DNS resolver for system services
    GODEBUG: netdns=go

    # Custom variable for extensions or scripts
    TALOS_ENV: production
    DATACENTER: us-east-1
```

Be careful about which variables you set. Some variables affect Go runtime behavior (like `GODEBUG`, `GOGC`, `GOMAXPROCS`), and changing them without understanding the implications can degrade performance or cause unexpected behavior.

## Applying Environment Variable Changes

Apply the configuration to your node:

```bash
# Apply config with environment variables to a new node
talosctl apply-config --insecure \
  --nodes 192.168.1.100 \
  --file worker.yaml
```

For existing nodes, you can apply changes without a reboot in most cases:

```bash
# Update environment variables on a running node
talosctl apply-config \
  --nodes 192.168.1.100 \
  --file worker.yaml
```

Some environment variable changes require a reboot to fully take effect, particularly those that affect early boot services. Talos will tell you if a reboot is needed after applying the config.

## Using Config Patches

If you have different proxy settings for different network segments, config patches are the way to go:

```yaml
# proxy-us-east.yaml - patch for US East nodes
machine:
  env:
    HTTPS_PROXY: http://proxy-us-east.company.com:3128
    HTTP_PROXY: http://proxy-us-east.company.com:3128
    NO_PROXY: localhost,127.0.0.1,10.0.0.0/8,.cluster.local
```

```yaml
# proxy-eu-west.yaml - patch for EU West nodes
machine:
  env:
    HTTPS_PROXY: http://proxy-eu-west.company.com:3128
    HTTP_PROXY: http://proxy-eu-west.company.com:3128
    NO_PROXY: localhost,127.0.0.1,10.0.0.0/8,.cluster.local
```

Apply the right patch to each node:

```bash
# Apply config with region-specific proxy settings
talosctl apply-config --insecure \
  --nodes 192.168.1.100 \
  --file worker.yaml \
  --config-patch @proxy-us-east.yaml
```

## Verifying Environment Variables

After applying the configuration, verify that the variables are set correctly:

```bash
# Check the current machine env configuration
talosctl get machineconfig --nodes 192.168.1.100 -o yaml | grep -A 20 "env:"
```

You can also check if a specific service is picking up the environment variables by looking at its runtime environment:

```bash
# Check environment of a system service
talosctl dmesg --nodes 192.168.1.100 | grep -i proxy
```

To test that the proxy is actually working for image pulls:

```bash
# Try pulling an image through the proxy
talosctl image pull --nodes 192.168.1.100 docker.io/library/busybox:latest
```

If this succeeds, your proxy configuration is working. If it fails, check the proxy server logs to see if the request reached the proxy, and verify your `NO_PROXY` settings are not accidentally bypassing the proxy for the registry.

## Troubleshooting Common Issues

The most common problem with machine environment variables is getting `NO_PROXY` wrong. If you forget to include the Kubernetes service CIDR in `NO_PROXY`, the kubelet will try to reach the API server through the proxy, which usually fails because the proxy does not know how to route internal cluster traffic.

Another common issue is case sensitivity. Some tools respect `HTTP_PROXY` while others look for `http_proxy` (lowercase). Talos passes the variables as-is, so you might need to set both:

```yaml
# Cover both cases for maximum compatibility
machine:
  env:
    HTTP_PROXY: http://proxy:3128
    http_proxy: http://proxy:3128
    HTTPS_PROXY: http://proxy:3128
    https_proxy: http://proxy:3128
    NO_PROXY: localhost,127.0.0.1,10.0.0.0/8
    no_proxy: localhost,127.0.0.1,10.0.0.0/8
```

## Removing Environment Variables

To remove an environment variable, simply delete it from the config and reapply. Talos will reconcile the state and remove variables that are no longer in the configuration:

```yaml
# Config with proxy removed - just omit the env section
machine:
  # env section removed or empty
  env: {}
```

Apply the updated config, and the variables will be cleaned up on the node.

## Summary

Machine environment variables in Talos Linux are a simple but powerful mechanism for configuring system-level behavior. Use them primarily for proxy settings in enterprise environments, and be meticulous about your `NO_PROXY` configuration. Remember that these variables affect system services only - not your Kubernetes pods. Test your settings on a single node before rolling them out to the entire cluster, and always verify with an image pull test after applying proxy configuration.
