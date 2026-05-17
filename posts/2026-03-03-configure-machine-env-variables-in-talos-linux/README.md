# How to Configure Machine Env Variables in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Environment Variable, Machine Configuration, Kubernetes, Proxy

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
    https_proxy: http://proxy.company.com:8080
    http_proxy: http://proxy.company.com:8080
    no_proxy: localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16,.svc,.cluster.local
```

These variables are set on PID 1 and propagated to every Talos service at service start time. The set of recognized keys is limited - the Talos documentation lists exactly five: `GRPC_GO_LOG_VERBOSITY_LEVEL`, `GRPC_GO_LOG_SEVERITY_LEVEL`, `http_proxy`, `https_proxy`, and `no_proxy`. Other keys pass schema validation but have no consumers inside Talos.

Note: As of Talos v1.13, `machine.env` is deprecated in favor of a dedicated `EnvironmentConfig` document, but the field continues to work for backward compatibility.

## Proxy Configuration

The most frequent use of `machine.env` is configuring proxy settings. In enterprise environments, nodes often need to route external traffic through an HTTP proxy. Without proper proxy configuration, your nodes will not be able to pull container images, download updates, or communicate with external APIs.

```yaml
# Complete proxy configuration for enterprise environments
machine:
  env:
    http_proxy: http://squid.internal.company.com:3128
    https_proxy: http://squid.internal.company.com:3128
    no_proxy: >-
      localhost,
      127.0.0.1,
      10.0.0.0/8,
      172.16.0.0/12,
      192.168.0.0/16,
      .svc,
      .cluster.local,
      .company.internal
```

The `no_proxy` variable is critical. It tells services which addresses should bypass the proxy entirely. You always want to include your pod and service CIDRs, the cluster domain, localhost, and any internal domains. Forgetting to set `no_proxy` correctly is one of the most common causes of mysterious networking failures in proxied environments.

Let me break down what each entry in `no_proxy` does:

```yaml
machine:
  env:
    no_proxy: >-
      localhost,           # Loopback hostname
      127.0.0.1,           # Loopback IP
      10.0.0.0/8,          # RFC 1918 private range covering common pod/node networks
      172.16.0.0/12,       # RFC 1918 private range
      192.168.0.0/16,      # RFC 1918 private range
      .svc,                # Kubernetes service DNS suffix
      .cluster.local,      # Kubernetes cluster DNS domain
      .company.internal    # Internal company domain
```

A note on CIDR notation: Go's `net/http` client honors CIDR blocks in `no_proxy`, but not every consumer does. If you have a tool in the loop that only matches on hostnames or exact IPs, you may need to list specific addresses or domains explicitly. The Talos default pod CIDR is `10.244.0.0/16` and the default service CIDR is `10.96.0.0/12` - replace the broad ranges above with your actual cluster CIDRs if you want a tighter bypass list.

## How Environment Variables Propagate

When you set variables in `machine.env`, they are set on PID 1 and inherited by every Talos service at start time. In practice this means:

1. Containerd picks them up, which means image pulls respect proxy settings
2. The kubelet inherits them, so node-to-API-server communication goes through the proxy if needed
3. Talos system services like `apid`, `machined`, and `trustd` use them for any outbound connections

Because propagation only happens at service start, changing these variables requires the affected services (or the node) to restart for the new values to take effect.

These variables do not automatically propagate into pods. Pods need their own environment variable configuration through Kubernetes manifests, ConfigMaps, or mutating webhooks. This is an important distinction that trips people up.

```yaml
# These machine-level env vars affect system services, NOT pods
machine:
  env:
    http_proxy: http://proxy:3128

# For pods, you need Kubernetes-level configuration:
# - Pod env vars in manifests
# - A mutating webhook that injects proxy vars
# - ConfigMaps mounted into pods
```

## Beyond Proxy Settings: gRPC Logging

Aside from the three proxy variables, the other recognized keys in `machine.env` tune gRPC logging in Talos system services. These are useful when you need to debug API or control-plane communication issues:

```yaml
# Increase gRPC logging verbosity on Talos services
machine:
  env:
    GRPC_GO_LOG_SEVERITY_LEVEL: info
    GRPC_GO_LOG_VERBOSITY_LEVEL: "99"
```

`GRPC_GO_LOG_SEVERITY_LEVEL` accepts the standard severity levels (`info`, `warning`, `error`). `GRPC_GO_LOG_VERBOSITY_LEVEL` is a numeric verbosity - higher numbers produce more output. Leave these unset in normal operation; chatty gRPC logs make `talosctl logs` harder to read.

Setting arbitrary keys (anything outside the five recognized values) passes schema validation and will be exported to PID 1, but Talos itself does not consume them, so the effect on system behavior is essentially nil unless you are also running a custom extension that reads them.

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
    https_proxy: http://proxy-us-east.company.com:3128
    http_proxy: http://proxy-us-east.company.com:3128
    no_proxy: localhost,127.0.0.1,10.0.0.0/8,.cluster.local
```

```yaml
# proxy-eu-west.yaml - patch for EU West nodes
machine:
  env:
    https_proxy: http://proxy-eu-west.company.com:3128
    http_proxy: http://proxy-eu-west.company.com:3128
    no_proxy: localhost,127.0.0.1,10.0.0.0/8,.cluster.local
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

If this succeeds, your proxy configuration is working. If it fails, check the proxy server logs to see if the request reached the proxy, and verify your `no_proxy` settings are not accidentally bypassing the proxy for the registry.

## Troubleshooting Common Issues

The most common problem with machine environment variables is getting `no_proxy` wrong. If you forget to include the Kubernetes service CIDR in `no_proxy`, the kubelet will try to reach the API server through the proxy, which usually fails because the proxy does not know how to route internal cluster traffic.

Another common issue is case sensitivity. The Talos documentation lists the proxy keys as lowercase (`http_proxy`, `https_proxy`, `no_proxy`), and Go's `net/http` proxy lookup checks both cases, so lowercase is the safe choice. If you also need to cover non-Go consumers running on the node that only look at uppercase variants, you can set both - schema validation accepts arbitrary POSIX-compliant keys, even though Talos itself only recognizes the lowercase forms:

```yaml
# Cover both cases for maximum compatibility
machine:
  env:
    http_proxy: http://proxy:3128
    HTTP_PROXY: http://proxy:3128
    https_proxy: http://proxy:3128
    HTTPS_PROXY: http://proxy:3128
    no_proxy: localhost,127.0.0.1,10.0.0.0/8
    NO_PROXY: localhost,127.0.0.1,10.0.0.0/8
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

Machine environment variables in Talos Linux are a simple mechanism for configuring system-level behavior, but the set of recognized keys is intentionally narrow: proxy settings (`http_proxy`, `https_proxy`, `no_proxy`) and gRPC log tuning (`GRPC_GO_LOG_VERBOSITY_LEVEL`, `GRPC_GO_LOG_SEVERITY_LEVEL`). Use them primarily for proxy settings in enterprise environments, and be meticulous about your `no_proxy` configuration. Remember that these variables affect Talos system services only - not your Kubernetes pods. Test your settings on a single node before rolling them out to the entire cluster, and always verify with an image pull test after applying proxy configuration. If you are on Talos v1.13 or newer, prefer the new `EnvironmentConfig` document over `machine.env`, which is now deprecated.
