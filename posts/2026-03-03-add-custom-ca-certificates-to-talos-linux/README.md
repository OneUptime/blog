# How to Add Custom CA Certificates to Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, CA Certificates, TLS, Security, Kubernetes

Description: Learn how to add custom Certificate Authority certificates to Talos Linux for trusting internal CAs, private registries, and corporate PKI infrastructure.

---

Many enterprise environments use internal Certificate Authorities to sign certificates for internal services, container registries, and API endpoints. When running Talos Linux in these environments, you need to add your custom CA certificates so that the system trusts connections to these services. Without proper CA configuration, pulls from private registries fail, webhook calls are rejected, and internal API communications break with TLS verification errors.

This guide shows you how to add custom CA certificates to Talos Linux nodes, covering both machine configuration and runtime approaches.

## Why Custom CA Certificates Matter

Talos Linux, like any modern operating system, maintains a trust store of Certificate Authority certificates. When a TLS connection is established, the system checks whether the server's certificate was signed by a trusted CA. If your organization uses a private CA - which most enterprises do - you need to explicitly add that CA to the trust store.

Common scenarios that require custom CA certificates:

- Private container registries using certificates signed by an internal CA
- Internal API endpoints with certificates from a corporate PKI
- Webhook servers for Kubernetes admission controllers
- Git servers used by GitOps tools like Flux or ArgoCD
- Internal monitoring and logging endpoints

## Adding CA Certificates via Machine Configuration

The recommended way to add CA certificates to Talos Linux is through the machine configuration. This ensures the certificates are present from boot and persist across reboots.

### Preparing Your CA Certificate

First, get your CA certificate in PEM format.

```bash
# If you have a DER-encoded certificate, convert to PEM

openssl x509 -inform DER -in my-ca.der -out my-ca.pem

# Verify the certificate
openssl x509 -in my-ca.pem -text -noout

# Base64 encode the certificate for the machine config
cat my-ca.pem | base64
```

### Adding to Machine Configuration

Edit your Talos machine configuration to include the CA certificate.

```yaml
# controlplane.yaml or worker.yaml
machine:
  files:
    - content: |
        -----BEGIN CERTIFICATE-----
        MIIDXTCCAkWgAwIBAgIJALOhSlRkSGFMMA0GCSqGSIb3DQEBCwUAMEUxCzAJ
        BgNVBAYTAlVTMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRl
        ... (your CA certificate content) ...
        -----END CERTIFICATE-----
      permissions: 0o644
      path: /etc/ssl/certs/ca-certificates
      op: append
```

The path `/etc/ssl/certs/ca-certificates` is the system trust bundle on Talos, and `op: append` adds your CA to the end of that file rather than replacing it. Writing the certificate to any other path under `/etc/ssl/certs/` will not make it trusted by the system. On Talos v1.9+ you can alternatively use a `TrustedRootsConfig` document, which is the modern equivalent of this pattern.

### Using Config Patches

If you are managing multiple nodes, config patches are a cleaner approach.

```bash
# Create a config patch file
cat > ca-patch.yaml << 'EOF'
machine:
  files:
    - content: |
        -----BEGIN CERTIFICATE-----
        MIIDXTCCAkWgAwIBAgIJALOhSlRkSGFMMA0GCSqGSIb3DQEBCwUAMEUxCzAJ
        BgNVBAYTAlVTMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRl
        ... (your CA certificate content) ...
        -----END CERTIFICATE-----
      permissions: 0o644
      path: /etc/ssl/certs/ca-certificates
      op: append
EOF

# Generate configs with the patch
talosctl gen config my-cluster https://10.0.0.1:6443 \
  --config-patch @ca-patch.yaml
```

### Adding Multiple CA Certificates

If you have multiple CAs, concatenate them in a single `content` block and append them to the system trust bundle.

```yaml
machine:
  files:
    # Bundle multiple CAs and append them to the system trust store
    - content: |
        -----BEGIN CERTIFICATE-----
        ... (First CA certificate) ...
        -----END CERTIFICATE-----
        -----BEGIN CERTIFICATE-----
        ... (Second CA certificate) ...
        -----END CERTIFICATE-----
        -----BEGIN CERTIFICATE-----
        ... (Third CA certificate) ...
        -----END CERTIFICATE-----
      permissions: 0o644
      path: /etc/ssl/certs/ca-certificates
      op: append
```

## Configuring for Container Registries

When your private container registry uses a certificate signed by a custom CA, you need to configure both the system trust store and the container runtime.

### CRI Configuration for Registry Trust

```yaml
machine:
  files:
    - content: |
        -----BEGIN CERTIFICATE-----
        ... (your CA certificate) ...
        -----END CERTIFICATE-----
      permissions: 0o644
      path: /etc/ssl/certs/ca-certificates
      op: append
  registries:
    mirrors:
      registry.example.com:
        endpoints:
          - https://registry.example.com
    config:
      registry.example.com:
        tls:
          ca: |
            -----BEGIN CERTIFICATE-----
            ... (your CA certificate) ...
            -----END CERTIFICATE-----
```

This configuration tells the container runtime to trust your CA specifically for the `registry.example.com` endpoint. Appending the CA to `/etc/ssl/certs/ca-certificates` additionally makes the certificate trusted by other Talos components that rely on the system trust store.

### Registry with Authentication

If your registry also requires authentication, combine the TLS and auth configuration.

```yaml
machine:
  registries:
    config:
      registry.example.com:
        auth:
          username: myuser
          password: mypassword
        tls:
          ca: |
            -----BEGIN CERTIFICATE-----
            ... (your CA certificate) ...
            -----END CERTIFICATE-----
```

## Applying CA Certificates to Running Nodes

You can add CA certificates to nodes that are already running without reinstalling.

```bash
# Create a patch with the CA certificate
cat > ca-patch.yaml << 'EOF'
machine:
  files:
    - content: |
        -----BEGIN CERTIFICATE-----
        ... (your CA certificate) ...
        -----END CERTIFICATE-----
      permissions: 0o644
      path: /etc/ssl/certs/ca-certificates
      op: append
EOF

# Apply the patch to a running node
talosctl -n 10.0.0.10 patch machineconfig \
  --patch @ca-patch.yaml

# The change takes effect after a reboot
talosctl -n 10.0.0.10 reboot
```

For changes to the registry TLS configuration specifically, a reboot may not always be required, but it is the safest approach.

## Verifying CA Certificate Installation

After configuring your CA certificates, verify they are properly installed.

```bash
# Read the system trust bundle and confirm your CA is in it
talosctl -n 10.0.0.10 read /etc/ssl/certs/ca-certificates | tail -n 40

# Test by pulling an image from your private registry
kubectl run test-pull --image=registry.example.com/myimage:latest
kubectl get pods test-pull
```

You can also verify from within a pod.

```bash
# Deploy a debug pod
kubectl run debug --image=busybox --command -- sleep 3600

# Exec into it and test
kubectl exec -it debug -- wget -O /dev/null \
  https://registry.example.com/v2/
```

## Using Config Maps for Kubernetes Components

Some Kubernetes components like webhook servers and API aggregation layers also need to trust your custom CA. These are typically configured through Kubernetes resources.

```yaml
# Create a ConfigMap with your CA bundle
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-ca-bundle
  namespace: kube-system
data:
  ca-bundle.crt: |
    -----BEGIN CERTIFICATE-----
    ... (your CA certificate) ...
    -----END CERTIFICATE-----
```

For Kubernetes API server CA configuration, you can mount the host trust bundle into the API server static pod.

```yaml
cluster:
  apiServer:
    extraVolumes:
      - hostPath: /etc/ssl/certs/ca-certificates
        mountPath: /etc/ssl/certs/ca-certificates
        readonly: true
```

## Rotating CA Certificates

When your CA certificate is being rotated, you need to plan for a transition period where both the old and new CA are trusted.

```bash
# Append the new CA alongside the old one so both are trusted during the transition
cat > ca-rotation-patch.yaml << 'EOF'
machine:
  files:
    - content: |
        -----BEGIN CERTIFICATE-----
        ... (NEW CA certificate) ...
        -----END CERTIFICATE-----
      permissions: 0o644
      path: /etc/ssl/certs/ca-certificates
      op: append
EOF

# Apply to all nodes
for node in 10.0.0.10 10.0.0.11 10.0.0.12; do
  talosctl -n $node patch machineconfig --patch @ca-rotation-patch.yaml
done

# Reboot nodes one at a time
talosctl -n 10.0.0.10 reboot
# Wait for the node to be ready, then proceed to the next
```

The old CA stays trusted because it was already appended in a previous patch; the new patch adds the new CA next to it. Once all services have been migrated to certificates signed by the new CA, remove the old CA by editing the previously applied patch (or `TrustedRootsConfig` document on Talos v1.9+) and re-applying it, then rebooting the nodes.

## Troubleshooting Certificate Issues

When things go wrong with CA certificates, the errors are usually TLS-related.

```bash
# Check logs for TLS errors
talosctl -n 10.0.0.10 dmesg | grep -i tls
talosctl -n 10.0.0.10 logs kubelet | grep -i certificate

# Verify the certificate chain
openssl s_client -connect registry.example.com:443 \
  -CAfile my-ca.pem -showcerts

# Check if the CA file is properly formatted
openssl x509 -in /path/to/ca.pem -text -noout
```

Common issues include incorrectly formatted PEM files (missing newlines), intermediate CA certificates not being included in the bundle, and certificate files not having the right permissions.

## Conclusion

Adding custom CA certificates to Talos Linux is straightforward through the machine configuration system. Whether you need to trust a corporate CA for internal registries, configure TLS for private API endpoints, or set up mutual TLS authentication, the machine config provides a declarative way to manage trust. The key is to plan your certificate management strategy early, bundle your CAs properly, and verify the configuration after deployment. With proper CA configuration, your Talos Linux nodes can securely communicate with all your internal services without TLS errors getting in the way.
