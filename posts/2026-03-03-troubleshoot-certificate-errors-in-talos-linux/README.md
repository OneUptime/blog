# How to Troubleshoot Certificate Errors in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, TLS, Certificates, Kubernetes, Security, Troubleshooting

Description: Practical walkthrough for diagnosing and fixing TLS certificate errors on Talos Linux clusters, covering expired certs, CA mismatches, and SAN issues.

---

Talos Linux relies heavily on TLS certificates for securing communication between all cluster components. Every connection - from the API server to kubelet, from etcd peer-to-peer, from `talosctl` to the Talos API - uses mutual TLS authentication. When certificates break, the symptoms can be confusing because different components fail in different ways. This guide helps you identify what went wrong with your certificates and how to fix it.

## Understanding Talos Certificate Architecture

Talos manages several certificate authorities and their associated certificates:

- **Talos CA** - Used for `talosctl` communication with the Talos API
- **Kubernetes CA** - Used for Kubernetes API server, kubelet, and other Kubernetes components
- **etcd CA** - Used for etcd peer and client communication
- **Aggregation CA** - Used for the Kubernetes aggregation layer

Each of these has its own CA certificate and key, and each generates leaf certificates for the actual services. All of these are defined in the machine configuration.

## Identifying Certificate Errors

Certificate errors manifest differently depending on which component is affected:

```bash
# talosctl connection errors look like this:
talosctl -n 10.0.0.1 version
# rpc error: code = Unavailable desc = connection error: desc = "transport: authentication handshake failed: x509: certificate signed by unknown authority"

# kubectl errors look like this:
kubectl get nodes
# Unable to connect to the server: x509: certificate has expired or is not yet valid

# etcd errors in logs:
# "transport: authentication handshake failed: remote error: tls: bad certificate"
```

## Step 1: Check Certificate Expiration

The most common certificate issue is expiration. Talos certificates have a default validity period, and if they expire, everything stops working.

```bash
# Check certificate details on a node
talosctl -n <node-ip> get certificate

# Check the Kubernetes certificates
talosctl -n <cp-ip> get certificate kubelet
```

You can also check certificates from the client side:

```bash
# Check the API server certificate expiration
echo | openssl s_client -connect <cp-ip>:6443 2>/dev/null | openssl x509 -noout -dates

# Check the Talos API certificate
echo | openssl s_client -connect <node-ip>:50000 2>/dev/null | openssl x509 -noout -dates
```

If the certificates are expired, you need to rotate them.

## Step 2: Rotate Expired Certificates

Talos provides built-in certificate rotation. For Kubernetes certificates:

```bash
# Rotate Kubernetes certificates (this will restart affected services)
talosctl -n <cp-ip> rotate-certs
```

If `talosctl` itself cannot connect because the Talos API certificate is expired, you will need to use the insecure flag:

```bash
# Connect without TLS verification to apply new configuration
talosctl apply-config --insecure -n <node-ip> --file machine-config.yaml
```

## Step 3: Fix CA Mismatch

If you regenerated your cluster configuration but did not apply it to all nodes, some nodes will have a different CA than others. This causes authentication failures between components.

Check which CA each node is using:

```bash
# Get the CA from two different nodes and compare
talosctl -n <node-1-ip> get machineconfiguration -o yaml | grep -A2 "ca:"
talosctl -n <node-2-ip> get machineconfiguration -o yaml | grep -A2 "ca:"
```

If the CAs do not match, you need to re-apply the correct configuration to the nodes with the wrong CA.

## Step 4: Check Subject Alternative Names (SANs)

The API server certificate must include SANs for every way clients connect to it. If the endpoint IP or hostname is not in the SAN list, clients will reject the certificate:

```text
x509: certificate is valid for 10.0.0.1, not 10.0.0.100
```

Check the current SANs:

```bash
# View the API server certificate SANs
echo | openssl s_client -connect <cp-ip>:6443 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"
```

If your control plane endpoint IP is not listed, you need to add it to the machine configuration:

```yaml
cluster:
  apiServer:
    certSANs:
      - 10.0.0.100        # Load balancer IP
      - cluster.example.com # DNS name
      - 10.0.0.1           # Control plane node 1
      - 10.0.0.2           # Control plane node 2
      - 10.0.0.3           # Control plane node 3
```

Apply the updated configuration:

```bash
# Apply the updated config to all control plane nodes
talosctl apply-config -n <cp-1-ip> --file controlplane.yaml
talosctl apply-config -n <cp-2-ip> --file controlplane.yaml
talosctl apply-config -n <cp-3-ip> --file controlplane.yaml
```

## Step 5: Fix talosctl Client Certificate Issues

If `talosctl` cannot authenticate, the issue may be with your client configuration (talosconfig):

```bash
# Check your current talosconfig
talosctl config info
```

Make sure the talosconfig was generated from the same cluster secrets as the machine configuration. If you regenerated the cluster configuration, you also need a new talosconfig:

```bash
# Generate fresh talosconfig
talosctl gen config my-cluster https://<endpoint>:6443

# The talosconfig file will be generated alongside the machine configs
# Move it to the right location
cp talosconfig ~/.talos/config
```

## Step 6: Fix etcd Certificate Issues

etcd peer certificates are particularly sensitive. If one control plane node has different etcd certificates, it will be rejected by the other members:

```bash
# Check etcd logs for certificate errors
talosctl -n <cp-ip> logs etcd | grep -i "tls\|cert\|handshake"
```

If etcd certificates are the issue, you may need to remove the problematic member and re-add it:

```bash
# Remove the member with bad certificates
talosctl -n <healthy-cp-ip> etcd remove-member <member-id>

# Reset the problematic node
talosctl -n <broken-cp-ip> reset --graceful=false

# Re-apply configuration
talosctl apply-config --insecure -n <broken-cp-ip> --file controlplane.yaml
```

## Step 7: Time-Related Certificate Failures

Certificates have a "not before" and "not after" time. If the node clock is significantly off, perfectly valid certificates will fail validation:

```bash
# Check the node time
talosctl -n <node-ip> time
```

If the time is wrong, check your NTP configuration:

```yaml
machine:
  time:
    servers:
      - time.cloudflare.com
      - pool.ntp.org
    bootTimeout: 2m0s
```

A clock skew of more than a few minutes will cause certificate validation to fail on nearly every TLS connection.

## Step 8: Debugging with Verbose TLS Output

When you are not sure which certificate is causing the problem, you can get detailed TLS information:

```bash
# Verbose TLS connection test to the API server
openssl s_client -connect <cp-ip>:6443 -showcerts -CAfile ca.crt 2>&1

# Check the full certificate chain
echo | openssl s_client -connect <cp-ip>:6443 2>/dev/null | openssl x509 -noout -text
```

This will show you the complete certificate chain, including which CA signed the certificate and all the certificate details.

## Complete Cluster Certificate Reset

If certificates are thoroughly broken and piecemeal fixes are not working, you may need to regenerate everything. This is disruptive but thorough:

```bash
# 1. Generate completely new cluster configuration
talosctl gen config my-cluster https://<endpoint>:6443

# 2. Apply to all control plane nodes
talosctl apply-config --insecure -n <cp-1-ip> --file controlplane.yaml
talosctl apply-config --insecure -n <cp-2-ip> --file controlplane.yaml

# 3. Apply to all worker nodes
talosctl apply-config --insecure -n <worker-1-ip> --file worker.yaml
talosctl apply-config --insecure -n <worker-2-ip> --file worker.yaml

# 4. Update your kubeconfig
talosctl -n <cp-1-ip> kubeconfig --force
```

Certificate management is one of the trickier aspects of running Talos Linux, but once you understand the certificate hierarchy and how Talos manages it, diagnosing issues becomes straightforward. Always keep your machine configurations consistent across nodes, and set up monitoring for certificate expiration to catch problems before they cause outages.
