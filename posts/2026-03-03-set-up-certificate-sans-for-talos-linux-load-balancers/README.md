# How to Set Up Certificate SANs for Talos Linux Load Balancers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, TLS, Certificate, Load Balancer, Security, Kubernetes

Description: Learn how to configure certificate Subject Alternative Names in Talos Linux to support load balancers, DNS names, and virtual IPs for production access.

---

When you place a load balancer in front of your Talos Linux control plane nodes, TLS certificate validation becomes a critical concern. The load balancer presents its own IP address or DNS name to clients, but the certificates on the Talos nodes need to include those addresses as Subject Alternative Names (SANs). Without the correct SANs, every connection through the load balancer will fail with a certificate verification error. This guide explains how to configure SANs correctly for load balancer setups.

## Understanding the TLS Chain in Talos

Talos Linux uses mutual TLS (mTLS) for its API. When you connect with `talosctl`, both the client and server verify each other's certificates. The server certificate on each Talos node includes SANs that list the addresses the node should be reachable at.

By default, when you generate configurations with `talosctl gen config`, the node certificates include:

- The node's IP address (once assigned)
- `localhost`
- The cluster endpoint address

When you add a load balancer, the traffic path changes. Clients connect to the load balancer's address, but the TLS certificate they receive was issued by the Talos node behind the load balancer. If the load balancer's IP or DNS name is not in that certificate's SANs, the TLS handshake fails.

## Adding SANs During Initial Config Generation

The simplest time to add SANs is when generating your initial cluster configuration:

```bash
# Generate configs with additional SANs for the load balancer
talosctl gen config my-cluster https://lb.example.com:6443 \
    --additional-sans lb.example.com \
    --additional-sans 10.0.1.100 \
    --additional-sans talos-api.example.com
```

You can specify multiple `--additional-sans` flags. Each one adds an entry to the certificate SANs. Both IP addresses and DNS names are supported.

The resulting certificates will include these additional names, allowing clients to connect through any of them without TLS errors.

## Adding SANs via Machine Configuration Patches

If you prefer to manage SANs through configuration patches (which is better for version control), use the `machine.certSANs` field:

```yaml
# cert-sans-patch.yaml
machine:
  certSANs:
    - lb.example.com
    - 10.0.1.100
    - talos-api.example.com
    - 192.168.1.200
```

Apply this patch when generating configs:

```bash
talosctl gen config my-cluster https://lb.example.com:6443 \
    --config-patch @cert-sans-patch.yaml
```

Or apply it to a running cluster:

```bash
# Apply to each control plane node
talosctl apply-config --nodes 10.0.1.10 --patch @cert-sans-patch.yaml
talosctl apply-config --nodes 10.0.1.11 --patch @cert-sans-patch.yaml
talosctl apply-config --nodes 10.0.1.12 --patch @cert-sans-patch.yaml
```

## Common Load Balancer Scenarios

Let us walk through the SAN configuration for several common load balancer setups.

### Hardware Load Balancer with Virtual IP

When using a hardware load balancer (like F5 or HAProxy on dedicated hardware) with a virtual IP:

```yaml
machine:
  certSANs:
    - 10.0.1.100        # Virtual IP of the load balancer
    - api.cluster.local  # Internal DNS name
```

### Cloud Load Balancer (AWS NLB)

For an AWS Network Load Balancer:

```yaml
machine:
  certSANs:
    - my-cluster-api-abc123.elb.us-east-1.amazonaws.com  # NLB DNS name
    - api.mycluster.example.com                            # Custom DNS CNAME
```

AWS NLB IPs are dynamic, so always use the DNS name rather than IP addresses.

### HAProxy on a Dedicated Server

For a self-managed HAProxy instance:

```yaml
machine:
  certSANs:
    - 10.0.1.100             # HAProxy server IP
    - haproxy.example.com    # HAProxy DNS name
    - api.cluster.example.com # Friendly cluster API name
```

### Talos VIP (Virtual IP)

Talos Linux supports built-in Virtual IP addresses that float between control plane nodes. When using this feature, include the VIP in the SANs:

```yaml
machine:
  certSANs:
    - 10.0.1.100  # The VIP address
  network:
    interfaces:
      - interface: eth0
        dhcp: false
        addresses:
          - 10.0.1.10/24
        vip:
          ip: 10.0.1.100  # Floating VIP
```

## Kubernetes API Server SANs

The Kubernetes API server also needs SANs for load balancer access. Talos handles this through the `cluster.controlPlane.endpoint` setting and the `certSANs` field:

```yaml
cluster:
  controlPlane:
    endpoint: https://lb.example.com:6443
  apiServer:
    certSANs:
      - lb.example.com
      - 10.0.1.100
      - api.mycluster.example.com
machine:
  certSANs:
    - lb.example.com
    - 10.0.1.100
```

Note that `machine.certSANs` affects the Talos API certificates, while `cluster.apiServer.certSANs` affects the Kubernetes API server certificates. You typically need both when using a load balancer.

## Verifying SANs on Running Nodes

After applying the configuration, verify that the certificates have the correct SANs:

```bash
# Connect through the load balancer and check the certificate
openssl s_client -connect lb.example.com:50000 -showcerts 2>/dev/null | \
    openssl x509 -noout -text | grep -A1 "Subject Alternative Name"
```

This should show all your configured SANs. If a SAN is missing, the configuration was not applied correctly.

You can also check from the Talos side:

```bash
# View the current certificate configuration
talosctl get machineconfig --nodes 10.0.1.10 -o yaml | grep -A 10 "certSANs"
```

## Updating SANs on an Existing Cluster

When you need to add new SANs to an existing cluster (for example, adding a new load balancer endpoint), the process requires updating the configuration and regenerating certificates:

```yaml
# updated-sans-patch.yaml
machine:
  certSANs:
    - lb.example.com
    - 10.0.1.100
    - new-lb.example.com     # New load balancer
    - 10.0.2.100             # New load balancer IP
```

```bash
# Apply the updated SANs to each control plane node
talosctl apply-config --nodes 10.0.1.10 --patch @updated-sans-patch.yaml
talosctl apply-config --nodes 10.0.1.11 --patch @updated-sans-patch.yaml
talosctl apply-config --nodes 10.0.1.12 --patch @updated-sans-patch.yaml
```

After applying, the node will regenerate its certificates to include the new SANs. This may require a brief service restart but should not require a full reboot.

## Planning SANs for Future Growth

It is much easier to include SANs from the beginning than to add them later. When setting up a new cluster, think about all the ways the API might be accessed:

```yaml
machine:
  certSANs:
    # Current load balancer
    - lb.example.com
    - 10.0.1.100

    # Friendly DNS names
    - api.mycluster.example.com
    - talos.mycluster.example.com

    # Future DR load balancer
    - dr-lb.example.com

    # VPN access point
    - vpn-api.mycluster.example.com
```

Adding extra SANs has no performance cost and prevents future reconfiguration work. Be generous with SANs at setup time.

## Troubleshooting SAN Issues

The most common error when SANs are missing is:

```text
rpc error: code = Unavailable desc = connection error:
tls: failed to verify certificate: x509: certificate is valid for
10.0.1.10, not lb.example.com
```

This error clearly tells you that the certificate does not include the address you are connecting to. The fix is to add the missing address to `certSANs` and reapply the configuration.

If you get a certificate error and are not sure what SANs the certificate has, use openssl to inspect it:

```bash
# Check SANs on the Talos API port
echo | openssl s_client -connect 10.0.1.10:50000 2>/dev/null | \
    openssl x509 -noout -ext subjectAltName
```

This shows the complete list of SANs in the presented certificate.

## Multiple Load Balancers

In multi-site or high-availability setups, you might have multiple load balancers. Include all of them in the SANs:

```yaml
machine:
  certSANs:
    # Primary site load balancer
    - lb-primary.example.com
    - 10.0.1.100
    # Secondary site load balancer
    - lb-secondary.example.com
    - 10.0.2.100
    # Global load balancer (DNS-based)
    - api.global.example.com
```

This allows clients to connect through any load balancer without certificate issues.

## Wildcard SANs

Talos does not support wildcard entries in `certSANs` for the Talos API certificates. Each address must be explicitly listed. This is a security design choice that prevents overly broad certificate scope.

If you have many subdomains, list each one individually:

```yaml
machine:
  certSANs:
    - api-east.example.com
    - api-west.example.com
    - api-central.example.com
```

## Conclusion

Configuring certificate SANs correctly is essential when deploying Talos Linux behind load balancers. The key is to include every IP address and DNS name that clients might use to reach the cluster, in both `machine.certSANs` for the Talos API and `cluster.apiServer.certSANs` for the Kubernetes API. Plan ahead and include SANs for future access paths when setting up a new cluster. If you do need to update SANs later, apply the change to all control plane nodes and verify the new certificates are being presented. With correct SANs in place, your load balancer setup will work seamlessly with TLS verification.
