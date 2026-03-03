# How to Configure Corporate HTTP Proxies in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, HTTP Proxy, Corporate Networking, Kubernetes, Configuration

Description: A complete guide to configuring HTTP and HTTPS proxy settings in Talos Linux for corporate environments with restricted internet access.

---

Many corporate networks route all outbound HTTP and HTTPS traffic through a proxy server. This is done for security monitoring, content filtering, and compliance. If your Talos Linux cluster runs in one of these environments, you need to configure proxy settings at the machine level so that system services can pull container images, sync time, and communicate with external APIs.

Getting proxy configuration right in Talos is not difficult, but getting it wrong causes frustrating failures. Image pulls time out, NTP sync fails, and the cluster cannot bootstrap. This post walks through the complete proxy setup for Talos Linux in corporate environments.

## Where Proxy Settings Are Configured

Proxy settings in Talos Linux are configured as machine environment variables:

```yaml
# machine-config.yaml
machine:
  env:
    http_proxy: "http://proxy.corp.internal:3128"
    https_proxy: "http://proxy.corp.internal:3128"
    no_proxy: "localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16,.svc,.cluster.local,.corp.internal"
```

These environment variables are inherited by all Talos system services, including containerd (which pulls container images), kubelet, and the Talos API daemon.

## The Three Proxy Variables

There are three proxy-related environment variables, and you typically need all of them:

**http_proxy** - Used for plain HTTP requests. Set this to your proxy server's URL.

**https_proxy** - Used for HTTPS requests. Despite the name, the value is usually an HTTP URL (the connection to the proxy itself is HTTP, but the proxied traffic is HTTPS). Some proxies support HTTPS connections to the proxy itself, in which case you would use an HTTPS URL.

**no_proxy** - A comma-separated list of addresses, domains, and CIDR ranges that should bypass the proxy. This is the most important and most commonly misconfigured setting.

## Setting Both Uppercase and Lowercase

Different tools check different cases of these variables. Go programs (which include many Kubernetes components) check uppercase. Many Unix tools check lowercase. Set both to be safe:

```yaml
machine:
  env:
    http_proxy: "http://proxy.corp.internal:3128"
    https_proxy: "http://proxy.corp.internal:3128"
    no_proxy: "localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16,.svc,.cluster.local"
    HTTP_PROXY: "http://proxy.corp.internal:3128"
    HTTPS_PROXY: "http://proxy.corp.internal:3128"
    NO_PROXY: "localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16,.svc,.cluster.local"
```

Yes, this is redundant. But it prevents subtle issues where one component uses the proxy and another does not because they check different variable names.

## Getting no_proxy Right

The `no_proxy` list is critical. If you forget to exclude internal addresses, Kubernetes components will try to reach each other through the proxy, which fails. Here is what you should include:

```yaml
no_proxy: >-
  localhost,
  127.0.0.1,
  10.0.0.0/8,
  172.16.0.0/12,
  192.168.0.0/16,
  .svc,
  .svc.cluster.local,
  .cluster.local,
  .corp.internal
```

Let me break down each entry:

- **localhost, 127.0.0.1** - Loopback addresses. Local services communicate through these.
- **10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16** - Private IP ranges. Cover your node IPs, pod CIDRs, and service CIDRs. Being broad here is safer than being precise.
- **.svc, .svc.cluster.local, .cluster.local** - Kubernetes internal DNS domains. Service-to-service communication must bypass the proxy.
- **.corp.internal** - Your corporate domain. Internal services should be reached directly.

If your pod CIDR or service CIDR uses non-standard ranges, make sure those ranges are included too.

## Proxy Authentication

Some corporate proxies require authentication. Talos supports this through the standard proxy URL format:

```yaml
machine:
  env:
    http_proxy: "http://username:password@proxy.corp.internal:3128"
    https_proxy: "http://username:password@proxy.corp.internal:3128"
```

Be aware that the credentials are stored in plain text in the machine configuration. If you need to protect these credentials, consider using a proxy that supports IP-based authentication instead of username/password.

## Applying Proxy Configuration

For new clusters:

```bash
# Create a proxy patch file
cat > proxy-patch.yaml << 'EOF'
machine:
  env:
    http_proxy: "http://proxy.corp.internal:3128"
    https_proxy: "http://proxy.corp.internal:3128"
    no_proxy: "localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local,.corp.internal"
    HTTP_PROXY: "http://proxy.corp.internal:3128"
    HTTPS_PROXY: "http://proxy.corp.internal:3128"
    NO_PROXY: "localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local,.corp.internal"
EOF

# Generate config with proxy settings
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --config-patch @proxy-patch.yaml
```

For existing clusters:

```bash
# Apply proxy settings to a running node
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch @proxy-patch.yaml
```

## Verifying Proxy Configuration

After applying the configuration, verify that the proxy settings are working:

```bash
# Check the machine configuration
talosctl get machineconfig --nodes 192.168.1.10 -o yaml | grep -A 10 "env:"

# Test image pull through the proxy
talosctl image pull --nodes 192.168.1.10 docker.io/library/busybox:latest
```

If the image pull succeeds, the proxy is working for containerd. If it fails with a timeout or connection refused error, check the proxy address and ensure the node can reach the proxy server.

## Proxy and containerd Registry Configuration

In some corporate environments, you might need additional containerd configuration for specific registries that require special proxy handling or mirror settings:

```yaml
machine:
  registries:
    mirrors:
      docker.io:
        endpoints:
          - https://registry-mirror.corp.internal
      gcr.io:
        endpoints:
          - https://gcr-mirror.corp.internal
```

This tells containerd to try the corporate mirror first before going to the upstream registry (through the proxy). Using mirrors reduces proxy load and speeds up image pulls.

## Proxy for Kubernetes Pods

Machine-level proxy settings do NOT automatically apply to Kubernetes pods. If your workloads need proxy access, you have several options:

### Option 1 - Set proxy in pod specs

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: app
      env:
        - name: http_proxy
          value: "http://proxy.corp.internal:3128"
        - name: https_proxy
          value: "http://proxy.corp.internal:3128"
        - name: no_proxy
          value: "localhost,127.0.0.1,.svc,.cluster.local"
```

### Option 2 - Use a mutating webhook

Deploy a mutating webhook that automatically injects proxy environment variables into all pods. This is the cleanest approach for large clusters.

### Option 3 - Use transparent proxy

Configure your network so that all HTTP/HTTPS traffic is transparently intercepted by the proxy. This does not require any configuration on the pods, but it requires network infrastructure support.

## Proxy with TLS Interception

Some corporate proxies perform TLS interception (also called SSL inspection or MITM). They decrypt HTTPS traffic, inspect it, and re-encrypt it with a corporate CA certificate. For this to work, all clients must trust the corporate CA.

In Talos, you can add custom CA certificates:

```yaml
machine:
  files:
    - content: |
        -----BEGIN CERTIFICATE-----
        MIIDxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        ... (corporate CA certificate) ...
        -----END CERTIFICATE-----
      permissions: 0644
      path: /etc/ssl/certs/corporate-ca.crt
      op: create
```

This ensures that Talos system services trust the proxy's re-signed certificates.

## Troubleshooting Proxy Issues

**Image pull timeouts** - The node cannot reach the proxy. Check that the proxy address is correct and the node's network can reach it. Try pinging the proxy from the node.

**Certificate errors** - If the proxy does TLS interception, the corporate CA certificate needs to be trusted. See the TLS interception section above.

**Kubernetes services cannot communicate** - The `no_proxy` list is missing internal addresses. Add the pod CIDR, service CIDR, and `.cluster.local` domain.

**etcd cluster formation fails** - Control plane nodes cannot reach each other. Make sure node IPs are in the `no_proxy` list (the private IP ranges should cover this).

**NTP sync fails** - If your NTP servers are external, NTP traffic (UDP port 123) does not go through HTTP proxies. Make sure the firewall allows direct NTP traffic, or use internal NTP servers.

```bash
# Check for proxy-related errors in logs
talosctl logs machined --nodes 192.168.1.10 | grep -i proxy
talosctl logs containerd --nodes 192.168.1.10 | grep -i proxy
```

## Testing Without a Proxy

If you need to verify that something works without the proxy (for debugging), you can temporarily remove the proxy settings:

```bash
# Remove proxy settings
talosctl patch machineconfig --nodes 192.168.1.10 \
  --patch '[{"op": "remove", "path": "/machine/env"}]'
```

Remember to add them back after testing.

## Best Practices

Set proxy configuration early, ideally during initial cluster creation. Retrofitting proxy settings onto a running cluster requires touching every node.

Be generous with `no_proxy`. It is better to exclude too many addresses than too few. Missing an entry causes hard-to-debug failures.

Test proxy connectivity before bootstrapping the cluster. A node that cannot pull images through the proxy will fail to start Kubernetes.

Document the proxy configuration. Include the proxy address, what the `no_proxy` list covers, and any authentication requirements. New team members will need this information.

Monitor proxy health. If the proxy goes down, all image pulls and external communications from your nodes will fail. Set up monitoring and alerting for the proxy infrastructure.

## Conclusion

Configuring HTTP proxies in Talos Linux is primarily about setting the right environment variables in the machine configuration. The proxy address itself is straightforward - the `no_proxy` list is where the complexity lives. Be thorough in excluding internal addresses, set both uppercase and lowercase variable names, and test connectivity before deploying your cluster. With proper proxy configuration, Talos nodes work seamlessly in even the most locked-down corporate networks.
