# How to Rotate Talos API CA Certificates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Certificates, PKI, Security, API

Description: Step-by-step guide to rotating Talos API CA certificates including preparation, rolling updates, and verification of the new certificate chain.

---

Talos Linux relies on mutual TLS (mTLS) for all API communication. The Talos API CA certificate is the root of trust for the entire Talos management plane. When this certificate expires or needs to be rotated for security reasons, you need to carefully update every node in the cluster and all client configurations. Doing this wrong can lock you out of your cluster entirely.

This guide walks through the process of rotating the Talos API CA certificate safely.

## Understanding the Talos PKI

Talos uses several certificate authorities, each with a distinct purpose:

- **Talos API CA**: Signs certificates for the Talos API server on each node and the client certificates used by `talosctl`.
- **Kubernetes CA**: Signs certificates for the Kubernetes API server, kubelet, and other Kubernetes components.
- **etcd CA**: Signs certificates for etcd peer and client communication.

This guide focuses specifically on the Talos API CA. The Kubernetes and etcd CAs have their own rotation procedures.

## Why Rotate the Talos API CA

There are several reasons you might need to rotate:

- The CA certificate is approaching expiration
- A team member with access has left the organization
- You suspect the CA private key may have been compromised
- Compliance requirements mandate regular rotation
- You are migrating from a shorter key length to a longer one

## Checking Current Certificate Status

Before starting rotation, check the current state of your certificates.

```bash
# Check Talos API certificate expiration
talosctl -n 10.0.1.10 get certificate

# View the current CA certificate details
talosctl config info

# Check certificate expiration dates more precisely
# Extract the CA from your talosconfig and decode it
talosctl config info | grep -A1 "CA"
```

You can also extract and inspect the certificate directly:

```bash
# Extract the CA certificate from talosconfig
talosctl config info > /tmp/config-info.txt

# If you have the raw CA cert, inspect it with openssl
echo "<base64-ca-cert>" | base64 -d | openssl x509 -text -noout

# Pay attention to:
# - Not After (expiration date)
# - Subject and Issuer
# - Key size
```

## Preparation Steps

### Step 1: Back Up Everything

Before making any changes, back up your current credentials and configurations.

```bash
# Back up the talosconfig
cp ~/.talos/config ~/.talos/config.backup-$(date +%Y%m%d)

# Back up all machine configs
for node in 10.0.1.10 10.0.1.11 10.0.1.12; do
  talosctl -n $node get machineconfig -o yaml > "machineconfig-${node}.backup.yaml"
done

# Take an etcd snapshot just in case
talosctl -n 10.0.1.10 etcd snapshot etcd-pre-rotation.snapshot
```

### Step 2: Generate the New CA

Generate a new Talos API CA certificate and key pair.

```bash
# Generate a new CA using talosctl
talosctl gen ca --name "talos" --hours 87600
# This creates talos.crt and talos.key
# 87600 hours = 10 years

# Verify the new CA certificate
openssl x509 -in talos.crt -text -noout
```

If you need the new CA in base64 format for configuration files:

```bash
# Encode the new CA certificate
NEW_CA_CRT=$(base64 -w0 talos.crt)
NEW_CA_KEY=$(base64 -w0 talos.key)

echo "New CA cert (base64): $NEW_CA_CRT"
```

### Step 3: Generate New Client Certificates

Create new client certificates signed by the new CA.

```bash
# Generate a new admin client certificate
talosctl gen key --name admin
talosctl gen csr --key admin.key --ip 127.0.0.1
talosctl gen crt --ca talos --csr admin.csr --name admin --hours 8760
```

## Performing the Rotation

The rotation process uses a bundle approach where both the old and new CA certificates are trusted simultaneously during the transition period. This prevents any disruption.

### Step 4: Create a Bundled CA

Combine the old and new CA certificates into a bundle so nodes trust both during the transition.

```bash
# Create a CA bundle containing both old and new CAs
# The bundle allows nodes to trust certificates signed by either CA
cat old-talos-ca.crt talos.crt > ca-bundle.crt
CA_BUNDLE=$(base64 -w0 ca-bundle.crt)
```

### Step 5: Update Machine Configurations with the CA Bundle

Update each node's machine configuration to trust both CAs.

```yaml
# Updated machine configuration with CA bundle
machine:
  ca:
    crt: <base64-encoded-CA-bundle>  # Contains both old and new CA
    key: <base64-encoded-new-CA-key>
```

Apply this configuration to each node, starting with workers and then control plane nodes:

```bash
# Update worker nodes first
for worker in 10.0.2.10 10.0.2.11 10.0.2.12; do
  echo "Updating worker $worker..."
  talosctl -n $worker apply-config --file worker-config-bundle.yaml
  # Wait for the node to reconcile
  sleep 30
  # Verify the node is still healthy
  talosctl -n $worker health
done

# Then update control plane nodes one at a time
for cp in 10.0.1.10 10.0.1.11 10.0.1.12; do
  echo "Updating control plane $cp..."
  talosctl -n $cp apply-config --file cp-config-bundle.yaml
  # Wait and verify
  sleep 60
  talosctl -n $cp health
  talosctl -n $cp etcd status
done
```

### Step 6: Verify Bundle Phase

After all nodes are updated with the CA bundle, verify everything works.

```bash
# Verify all nodes are healthy
talosctl -n 10.0.1.10 health
talosctl -n 10.0.1.11 health
talosctl -n 10.0.1.12 health

# Verify Kubernetes is healthy
kubectl get nodes
kubectl get cs

# Verify etcd is healthy
talosctl -n 10.0.1.10 etcd status
talosctl -n 10.0.1.10 etcd member list
```

### Step 7: Update the Client Configuration

Update your `talosconfig` to use the new client certificate signed by the new CA, while still trusting both CAs.

```bash
# Update talosconfig with new credentials
talosctl config merge new-talosconfig.yaml

# Verify you can still connect
talosctl -n 10.0.1.10 version
```

### Step 8: Remove the Old CA

Once all nodes and clients are using certificates signed by the new CA, remove the old CA from the bundle.

```yaml
# Final machine configuration with only the new CA
machine:
  ca:
    crt: <base64-encoded-new-CA-only>
    key: <base64-encoded-new-CA-key>
```

```bash
# Apply final configuration to each node
for node in 10.0.2.10 10.0.2.11 10.0.2.12 10.0.1.10 10.0.1.11 10.0.1.12; do
  echo "Finalizing $node..."
  talosctl -n $node apply-config --file final-config-${node}.yaml
  sleep 30
  talosctl -n $node health
done
```

### Step 9: Update All Client Configurations

Make sure every team member and CI/CD pipeline using `talosctl` has the updated configuration with the new CA and client certificates.

```bash
# Distribute the new talosconfig
# This contains the new CA cert and new client certificates

# Verify with the new config
talosctl -n 10.0.1.10 version
talosctl -n 10.0.1.10 health
```

## Post-Rotation Verification

Run a full verification after completing the rotation.

```bash
#!/bin/bash
# verify-rotation.sh

echo "Checking all nodes..."
for node in 10.0.1.10 10.0.1.11 10.0.1.12 10.0.2.10 10.0.2.11 10.0.2.12; do
  echo "Node: $node"
  if talosctl -n $node version > /dev/null 2>&1; then
    echo "  Talos API: OK"
  else
    echo "  Talos API: FAILED"
  fi
done

echo "Checking Kubernetes..."
if kubectl get nodes > /dev/null 2>&1; then
  echo "  Kubernetes API: OK"
else
  echo "  Kubernetes API: FAILED"
fi

echo "Checking etcd..."
if talosctl -n 10.0.1.10 etcd status > /dev/null 2>&1; then
  echo "  etcd: OK"
else
  echo "  etcd: FAILED"
fi
```

## Handling Rotation Failures

If something goes wrong during rotation:

- **Lost API access**: If you cannot reach the Talos API, you may need physical or console access to the node. Boot into maintenance mode and apply a corrected configuration.
- **etcd issues**: If etcd becomes unhealthy, prioritize restoring etcd from a snapshot taken before the rotation.
- **Partial update**: If some nodes were updated and others were not, the CA bundle approach means they can still communicate. Roll back by re-applying the original configuration.

```bash
# Emergency: revert to backup configuration
talosctl apply-config --insecure \
  --nodes 10.0.1.10 \
  --file machineconfig-10.0.1.10.backup.yaml
```

## Automation Considerations

For large clusters, automate the rotation process with proper health checks between each step. Never update all nodes simultaneously. Always use a rolling approach and verify health after each node update.

```bash
# Wait for node health before proceeding
wait_for_health() {
  local node=$1
  local max_attempts=30
  for i in $(seq 1 $max_attempts); do
    if talosctl -n $node health --wait-timeout 10s 2>/dev/null; then
      return 0
    fi
    sleep 10
  done
  return 1
}
```

## Conclusion

Rotating the Talos API CA certificate is a sensitive operation that requires careful planning and execution. The key is using a CA bundle during the transition so that nodes trust both old and new certificates simultaneously. Always back up everything before starting, update nodes in a rolling fashion, and verify health at each step. With proper preparation, the rotation can be performed without any cluster downtime.
