# How to Rotate Talos API CA Certificates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Certificate, PKI, Security, API

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
# View the current talosconfig details, including the CA in use
talosctl config info

# List the available resource definitions so you can find cert-related resources
talosctl -n 10.0.1.10 get rd | grep -i cert
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
# Generate a new CA using talosctl. The organization name is used as both
# the X.509 Organization and the output file prefix (talos.crt / talos.key).
talosctl gen ca --organization "talos" --hours 87600
# 87600 hours = 10 years (this is also the default)

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
# Generate a new admin client key pair and CSR, then sign it with the new CA
talosctl gen key --name admin
talosctl gen csr --key admin.key --ip 127.0.0.1
talosctl gen crt --ca talos --csr admin.csr --name admin --hours 8760
```

> If you prefer an automated, in-cluster rotation, Talos ships a `talosctl rotate-ca`
> command that performs all of the steps below for you. Run it first with
> `--dry-run=true` to inspect the plan:
>
> ```bash
> talosctl -n 10.0.1.10 rotate-ca --dry-run=true --talos=true --kubernetes=false
> ```
>
> The manual procedure that follows mirrors what `rotate-ca` does and is useful
> when you need fine-grained control.

## Performing the Rotation

The rotation process trusts both the old and new CA certificates simultaneously during the transition. Talos exposes a dedicated `machine.acceptedCAs` field for additional trusted CAs - it is separate from `machine.ca`, which holds the single issuing CA cert and key. We add the new CA to `acceptedCAs` first, then later promote it to `machine.ca`, and finally remove the old CA from `acceptedCAs`.

### Step 4: Add the New CA to Accepted CAs

Patch each node so that it trusts the new CA in addition to the existing issuing CA.

```yaml
# Patch fragment: add the new CA to the list of accepted CAs.
# acceptedCAs takes raw PEM-encoded certificates (not base64), one per list entry.
machine:
  acceptedCAs:
    - |
      -----BEGIN CERTIFICATE-----
      <contents of new talos.crt>
      -----END CERTIFICATE-----
```

Apply this patch to every node, starting with workers and then control plane nodes:

```bash
# Update worker nodes first
for worker in 10.0.2.10 10.0.2.11 10.0.2.12; do
  echo "Updating worker $worker..."
  talosctl -n $worker patch machineconfig --patch @accepted-cas-patch.yaml
  # Wait for the node to reconcile
  sleep 30
  # Verify the node is still healthy
  talosctl -n $worker health
done

# Then update control plane nodes one at a time
for cp in 10.0.1.10 10.0.1.11 10.0.1.12; do
  echo "Updating control plane $cp..."
  talosctl -n $cp patch machineconfig --patch @accepted-cas-patch.yaml
  # Wait and verify
  sleep 60
  talosctl -n $cp health
  talosctl -n $cp etcd status
done
```

### Step 5: Verify the Accepted-CAs Phase

After all nodes have the new CA in `acceptedCAs`, verify everything still works.

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
talosctl -n 10.0.1.10 etcd members
```

### Step 6: Update the Client Configuration

Build an intermediate `talosconfig` that uses the new client certificate (signed by the new CA) but still trusts the old CA as the server authority. Because nodes now trust both CAs, this intermediate config can connect successfully.

```bash
# Merge the new client certificate into your local talosconfig
talosctl config merge new-talosconfig.yaml

# Verify you can still connect
talosctl -n 10.0.1.10 version
```

### Step 7: Promote the New CA to the Issuing CA

Now swap `machine.ca` from the old CA to the new CA. Keep the old CA in `acceptedCAs` so existing connections using old client certs continue to work during the swap. Note that worker nodes' `machine.ca` only contains the certificate (no key), while control plane nodes contain both.

```yaml
# Control plane nodes: both crt and key
machine:
  ca:
    crt: <base64-encoded-new-CA-cert>
    key: <base64-encoded-new-CA-key>
  acceptedCAs:
    - |
      -----BEGIN CERTIFICATE-----
      <contents of old talos.crt>
      -----END CERTIFICATE-----

# Worker nodes: crt only (no key field)
machine:
  ca:
    crt: <base64-encoded-new-CA-cert>
  acceptedCAs:
    - |
      -----BEGIN CERTIFICATE-----
      <contents of old talos.crt>
      -----END CERTIFICATE-----
```

```bash
# Apply the swap to each node
for node in 10.0.2.10 10.0.2.11 10.0.2.12 10.0.1.10 10.0.1.11 10.0.1.12; do
  echo "Promoting new CA on $node..."
  talosctl -n $node apply-config --file final-config-${node}.yaml
  sleep 30
  talosctl -n $node health
done
```

Once all nodes are on the new issuing CA and all clients have been updated to the new PKI, remove the old CA from `acceptedCAs` with another patch so the cluster no longer trusts anything signed by it.

### Step 8: Update All Client Configurations

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
- **Partial update**: If some nodes were updated and others were not, having both CAs trusted via `acceptedCAs` means they can still communicate. Roll back by re-applying the original configuration.

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

Rotating the Talos API CA certificate is a sensitive operation that requires careful planning and execution. The key is using `machine.acceptedCAs` during the transition so that nodes trust both old and new certificates simultaneously while you swap the issuing CA. Always back up everything before starting, update nodes in a rolling fashion, and verify health at each step. With proper preparation, the rotation can be performed without any cluster downtime.
