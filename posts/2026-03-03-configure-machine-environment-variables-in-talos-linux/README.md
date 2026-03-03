# How to Configure Machine Environment Variables in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Environment Variable, Configuration, Kubernetes, Proxy

Description: A practical guide to setting machine-level environment variables in Talos Linux for proxies, runtime settings, and more.

---

Environment variables in Talos Linux work differently than in a traditional Linux distribution. Since there is no shell access and no `/etc/environment` file to edit, you configure machine-level environment variables through the Talos machine configuration. These variables affect all system services running on the node, which makes them particularly useful for proxy settings, custom paths, and runtime configuration.

This post explains how to set machine environment variables in Talos Linux, what they affect, and the most common use cases.

## Setting Environment Variables

Machine-level environment variables are set in the `machine.env` section of the Talos configuration:

```yaml
# machine-config.yaml
machine:
  env:
    # HTTP proxy settings
    http_proxy: "http://proxy.company.internal:3128"
    https_proxy: "http://proxy.company.internal:3128"
    no_proxy: "localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16,.company.internal"

    # Custom environment variables
    CUSTOM_VARIABLE: "some-value"
```

These variables are applied at the machine level, meaning they are available to all Talos system services, including containerd, kubelet, and the Talos apid service.

## What Machine Environment Variables Affect

It is important to understand the scope of machine environment variables in Talos. They affect:

- **containerd** - The container runtime used by Kubernetes. Proxy settings here ensure that containerd can pull images through corporate proxies.
- **kubelet** - The Kubernetes node agent. Environment variables are passed to kubelet, which can affect how it communicates with the API server.
- **Talos system services** - Internal services like apid, machined, and trustd all inherit these variables.
- **Extension services** - Any system extensions installed on the node also get these variables.

They do NOT directly affect your Kubernetes workloads (pods). For that, you need to set environment variables in your pod specs or use Kubernetes ConfigMaps and Secrets.

## Proxy Configuration - The Most Common Use Case

By far the most common reason to set machine environment variables is proxy configuration. In corporate environments, machines often need to route HTTP and HTTPS traffic through a proxy server.

```yaml
machine:
  env:
    # Standard proxy variables (lowercase is conventional)
    http_proxy: "http://proxy.corp.internal:3128"
    https_proxy: "http://proxy.corp.internal:3128"

    # Uppercase variants (some tools only check uppercase)
    HTTP_PROXY: "http://proxy.corp.internal:3128"
    HTTPS_PROXY: "http://proxy.corp.internal:3128"

    # Addresses that should bypass the proxy
    no_proxy: "localhost,127.0.0.1,.svc,.cluster.local,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
    NO_PROXY: "localhost,127.0.0.1,.svc,.cluster.local,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

Note that we set both lowercase and uppercase versions of the proxy variables. This is because different tools and libraries check different cases. Go programs typically check the uppercase versions, while many Unix tools check lowercase. Setting both ensures maximum compatibility.

The `no_proxy` list is critical. You need to exclude:

- Localhost addresses (`localhost`, `127.0.0.1`)
- Kubernetes internal addresses (`.svc`, `.cluster.local`)
- Your pod and service CIDR ranges
- Your node network range
- Any internal domains that should not go through the proxy

Getting `no_proxy` wrong is one of the most common issues in proxied environments. If Kubernetes internal traffic goes through the proxy, everything breaks.

## Applying Environment Variables

You can set environment variables when generating a new configuration:

```bash
# Using a config patch file
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @env-patch.yaml
```

Or apply them to a running node:

```bash
# Patch a running node's configuration
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"env": {"http_proxy": "http://proxy.corp.internal:3128", "https_proxy": "http://proxy.corp.internal:3128"}}}'
```

After applying, the node's services will pick up the new environment variables. Some services may need to restart, which Talos handles automatically.

## Verifying Environment Variables

To check that your environment variables are set correctly on a running node:

```bash
# View the current machine configuration
talosctl get machineconfig --nodes 192.168.1.10 -o yaml | grep -A 10 "env:"

# Check if containerd has the proxy settings
talosctl service containerd --nodes 192.168.1.10
```

You can also verify by trying to pull an image on the node:

```bash
# If proxy settings are correct, this should work
talosctl image pull --nodes 192.168.1.10 docker.io/library/busybox:latest
```

## Environment Variables for Extensions

If you are running Talos system extensions, they inherit the machine environment variables. This is useful for extensions that need to connect to external services:

```yaml
machine:
  env:
    # Variables for a monitoring extension
    METRICS_ENDPOINT: "https://metrics.company.internal:9090"
    LOG_LEVEL: "info"

    # Proxy settings that extensions will also use
    https_proxy: "http://proxy.corp.internal:3128"
```

## Differences from Kubernetes Pod Environment Variables

A common source of confusion is the difference between machine environment variables and Kubernetes pod environment variables. Here is a quick comparison:

Machine environment variables (set in `machine.env`):
- Affect Talos system services and the container runtime
- Applied at the node level
- Set in the Talos machine configuration
- Require a config apply to change

Kubernetes pod environment variables:
- Affect only the specific pod
- Set in pod specs, ConfigMaps, or Secrets
- Can be changed by redeploying the pod
- Do not affect node-level services

If your pods need proxy settings, you need to configure those separately in your pod specs or use a mutating webhook to inject them automatically.

## Using Environment Variables with talosctl

You can also pass environment variables inline when using `talosctl` to apply configuration patches:

```bash
# Create a patch file with environment variables
cat > /tmp/env-patch.yaml << 'EOF'
machine:
  env:
    http_proxy: "http://proxy.corp.internal:3128"
    https_proxy: "http://proxy.corp.internal:3128"
    no_proxy: "localhost,127.0.0.1,10.0.0.0/8"
EOF

# Apply the patch
talosctl apply-config --nodes 192.168.1.10 \
  --patch @/tmp/env-patch.yaml
```

## Removing Environment Variables

To remove an environment variable, you need to patch the configuration and omit the variable you want to remove. Since the `env` field is a map, you can use a JSON patch to remove specific keys:

```bash
# Remove a specific environment variable
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '[{"op": "remove", "path": "/machine/env/http_proxy"}]'
```

Or you can replace the entire `env` block with only the variables you want to keep:

```bash
# Replace all environment variables
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '{"machine": {"env": {"CUSTOM_VARIABLE": "keep-this-one"}}}'
```

## Best Practices

Keep your environment variables minimal. Only set what you actually need at the machine level. Overloading the machine environment with application-specific variables makes debugging harder.

Always set both uppercase and lowercase versions of proxy variables. This is a minor annoyance, but it prevents hard-to-diagnose connectivity issues.

Be thorough with your `no_proxy` list. Missing an entry causes mysterious failures where internal services cannot communicate.

Document your environment variables. When someone new joins the team, they should be able to understand why each variable is set without having to reverse-engineer it.

## Conclusion

Machine environment variables in Talos Linux are a straightforward mechanism for configuring node-level settings. While the most common use case is proxy configuration, they are useful any time you need to pass configuration to Talos system services. Set them in the machine config, verify they are applied, and remember that they do not flow down to Kubernetes pods automatically. Keep the list focused and well-documented, and you will have a clean, maintainable configuration.
