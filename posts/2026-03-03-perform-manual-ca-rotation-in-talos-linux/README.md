# How to Perform Manual CA Rotation in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Certificate Rotation, PKI, Security, Manual Operations

Description: A detailed walkthrough of manually rotating certificate authority certificates in Talos Linux clusters with step-by-step commands and safety checks.

---

Sometimes you need to rotate CA certificates manually. Maybe your automation is not set up yet, or you are dealing with a one-off emergency rotation after a suspected compromise. Manual CA rotation in Talos Linux is straightforward if you follow the right sequence, but making a mistake can lock you out of your cluster. This guide gives you the exact steps to follow.

## Before You Start

Manual CA rotation is a multi-step process that touches every node in the cluster. Plan for at least a maintenance window, even though the process should not cause downtime if done correctly. Have a second person available to verify steps as you go.

### Gather Cluster Information

Document your current cluster state before making changes.

```bash
# Record all node IPs and roles
kubectl get nodes -o wide > cluster-nodes.txt

# Record etcd member list
talosctl -n 10.0.1.10 etcd member list > etcd-members.txt

# Record current certificate expiration dates
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.machine.ca.crt' | base64 -d | \
  openssl x509 -noout -dates
echo "---"
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.cluster.ca.crt' | base64 -d | \
  openssl x509 -noout -dates
```

### Create Backups

This is non-negotiable. Back up everything before you change anything.

```bash
# Back up talosconfig
cp ~/.talos/config ~/.talos/config.backup-$(date +%Y%m%d-%H%M%S)

# Back up kubeconfig
cp ~/.kube/config ~/.kube/config.backup-$(date +%Y%m%d-%H%M%S)

# Back up machine configurations for all nodes
mkdir -p backups-$(date +%Y%m%d)
for node in 10.0.1.10 10.0.1.11 10.0.1.12 10.0.2.10 10.0.2.11; do
  talosctl -n $node get machineconfig -o yaml > \
    "backups-$(date +%Y%m%d)/machineconfig-${node}.yaml"
done

# Take an etcd snapshot
talosctl -n 10.0.1.10 etcd snapshot \
  "backups-$(date +%Y%m%d)/etcd-snapshot.db"

echo "Backups saved to backups-$(date +%Y%m%d)/"
```

## Phase 1: Generate New Certificates

### Generate New Talos API CA

```bash
mkdir ca-rotation && cd ca-rotation

# Generate a new Talos API CA
# 10-year validity period
openssl genrsa -out talos-ca-new.key 4096
openssl req -x509 -new -nodes \
  -key talos-ca-new.key \
  -sha256 \
  -days 3650 \
  -out talos-ca-new.crt \
  -subj "/O=talos/CN=talos"

# Verify the certificate
openssl x509 -in talos-ca-new.crt -text -noout | head -15
```

### Generate New Kubernetes CA

```bash
# Generate a new Kubernetes CA
openssl genrsa -out k8s-ca-new.key 4096
openssl req -x509 -new -nodes \
  -key k8s-ca-new.key \
  -sha256 \
  -days 3650 \
  -out k8s-ca-new.crt \
  -subj "/CN=kubernetes"

# Verify
openssl x509 -in k8s-ca-new.crt -text -noout | head -15
```

### Extract Current CAs and Create Bundles

```bash
# Extract current Talos CA
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.machine.ca.crt' | base64 -d > talos-ca-old.crt

# Extract current Kubernetes CA
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.cluster.ca.crt' | base64 -d > k8s-ca-old.crt

# Create bundles containing both old and new CAs
cat talos-ca-old.crt talos-ca-new.crt > talos-ca-bundle.crt
cat k8s-ca-old.crt k8s-ca-new.crt > k8s-ca-bundle.crt

# Encode to base64
TALOS_BUNDLE=$(base64 -w0 talos-ca-bundle.crt)
TALOS_NEW_CRT=$(base64 -w0 talos-ca-new.crt)
TALOS_NEW_KEY=$(base64 -w0 talos-ca-new.key)
K8S_BUNDLE=$(base64 -w0 k8s-ca-bundle.crt)
K8S_NEW_CRT=$(base64 -w0 k8s-ca-new.crt)
K8S_NEW_KEY=$(base64 -w0 k8s-ca-new.key)
```

## Phase 2: Deploy CA Bundles

The bundle phase is where both old and new CAs are trusted simultaneously. This is the critical safety step that prevents disruption.

### Prepare Bundle Configurations

For each node, create a configuration that includes the CA bundles. Start by getting the current config and modifying it.

```bash
# For a control plane node
talosctl -n 10.0.1.10 get machineconfig -o yaml > cp1-config.yaml

# Edit the config to use CA bundles
# Replace machine.ca.crt with the Talos CA bundle
# Replace cluster.ca.crt with the Kubernetes CA bundle
# Replace machine.ca.key with the new Talos CA key
# Replace cluster.ca.key with the new Kubernetes CA key
```

The relevant sections in the config look like this:

```yaml
machine:
  ca:
    crt: <TALOS_BUNDLE>   # Both old and new Talos CAs
    key: <TALOS_NEW_KEY>   # New Talos CA key
cluster:
  ca:
    crt: <K8S_BUNDLE>     # Both old and new Kubernetes CAs
    key: <K8S_NEW_KEY>    # New Kubernetes CA key
```

### Apply Bundle to Worker Nodes First

Workers are safer to update first because they do not affect etcd or the API server directly.

```bash
# Worker 1
echo "Updating worker 10.0.2.10..."
talosctl -n 10.0.2.10 apply-config --file worker1-bundle-config.yaml

# Wait and check
sleep 30
talosctl -n 10.0.2.10 health
kubectl get node worker-1

# Worker 2
echo "Updating worker 10.0.2.11..."
talosctl -n 10.0.2.11 apply-config --file worker2-bundle-config.yaml
sleep 30
talosctl -n 10.0.2.11 health
kubectl get node worker-2
```

### Apply Bundle to Control Plane Nodes

Go one node at a time and verify everything between each update.

```bash
# Control plane 1
echo "Updating control plane 10.0.1.10..."
talosctl -n 10.0.1.10 apply-config --file cp1-bundle-config.yaml
sleep 60

# Thorough checks after each CP node
talosctl -n 10.0.1.10 health
talosctl -n 10.0.1.10 etcd status
kubectl get nodes
echo "CP-1 updated successfully"
echo "---"

# Control plane 2
echo "Updating control plane 10.0.1.11..."
talosctl -n 10.0.1.11 apply-config --file cp2-bundle-config.yaml
sleep 60
talosctl -n 10.0.1.11 health
talosctl -n 10.0.1.11 etcd status
talosctl -n 10.0.1.10 etcd member list
kubectl get nodes
echo "CP-2 updated successfully"
echo "---"

# Control plane 3
echo "Updating control plane 10.0.1.12..."
talosctl -n 10.0.1.12 apply-config --file cp3-bundle-config.yaml
sleep 60
talosctl -n 10.0.1.12 health
talosctl -n 10.0.1.12 etcd status
kubectl get nodes
echo "CP-3 updated successfully"
```

### Verify Bundle Phase

```bash
echo "=== Bundle Phase Verification ==="

# All nodes healthy
kubectl get nodes
echo "---"

# etcd fully healthy
talosctl -n 10.0.1.10 etcd member list
talosctl -n 10.0.1.10 etcd status
echo "---"

# Test workload deployment
kubectl run test-rotation --image=busybox --restart=Never -- echo "bundle phase OK"
kubectl wait --for=condition=completed pod/test-rotation --timeout=60s
kubectl logs test-rotation
kubectl delete pod test-rotation
echo "---"

echo "Bundle phase complete. All nodes trust both old and new CAs."
```

## Phase 3: Update Client Credentials

Generate a new talosconfig and kubeconfig using the new CA.

```bash
# Generate new client certificates for Talos API
talosctl gen config rotation-cluster https://k8s.example.com:6443 \
  --with-secrets secrets-bundle.yaml

# Or manually update the talosconfig
# The config needs the new CA cert and new client cert/key

# Get a new kubeconfig
talosctl -n 10.0.1.10 kubeconfig ~/.kube/config --force

# Verify both work
talosctl -n 10.0.1.10 version
kubectl get nodes
```

## Phase 4: Deploy Final Configuration

Now remove the old CA from the configuration, leaving only the new one.

```yaml
# Final configuration sections
machine:
  ca:
    crt: <TALOS_NEW_CRT>  # Only the new Talos CA
    key: <TALOS_NEW_KEY>
cluster:
  ca:
    crt: <K8S_NEW_CRT>    # Only the new Kubernetes CA
    key: <K8S_NEW_KEY>
```

```bash
# Same process: workers first, then control plane one at a time

# Workers
for worker_ip in 10.0.2.10 10.0.2.11; do
  echo "Finalizing worker $worker_ip..."
  talosctl -n $worker_ip apply-config --file worker-final-${worker_ip}.yaml
  sleep 30
  talosctl -n $worker_ip health
done

# Control plane nodes
for cp_ip in 10.0.1.10 10.0.1.11 10.0.1.12; do
  echo "Finalizing control plane $cp_ip..."
  talosctl -n $cp_ip apply-config --file cp-final-${cp_ip}.yaml
  sleep 60
  talosctl -n $cp_ip health
  talosctl -n $cp_ip etcd status
  kubectl get nodes
done
```

## Phase 5: Final Validation

Run a comprehensive check to confirm everything is working with only the new certificates.

```bash
echo "=== Final Validation ==="

# Node status
echo "Nodes:"
kubectl get nodes
echo ""

# etcd health
echo "etcd:"
talosctl -n 10.0.1.10 etcd member list
echo ""

# System pods
echo "System pods:"
kubectl get pods -n kube-system
echo ""

# Test API operations
echo "API test:"
kubectl create namespace rotation-test
kubectl run test -n rotation-test --image=alpine --restart=Never -- echo "rotation complete"
kubectl wait -n rotation-test --for=condition=completed pod/test --timeout=60s
kubectl delete namespace rotation-test
echo ""

# Check new certificate dates
echo "New certificate expiration:"
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.machine.ca.crt' | base64 -d | \
  openssl x509 -noout -dates
echo ""

echo "CA rotation complete."
```

## Emergency Rollback

If anything goes wrong at any point, revert to the backup configurations.

```bash
# Rollback using backups
BACKUP_DIR="backups-$(date +%Y%m%d)"

for node in 10.0.1.10 10.0.1.11 10.0.1.12 10.0.2.10 10.0.2.11; do
  echo "Rolling back $node..."
  talosctl -n $node apply-config --file "${BACKUP_DIR}/machineconfig-${node}.yaml"
  sleep 30
done

# Restore the old talosconfig
cp ~/.talos/config.backup-* ~/.talos/config

# Restore the old kubeconfig
cp ~/.kube/config.backup-* ~/.kube/config

# Verify
talosctl -n 10.0.1.10 health
kubectl get nodes
```

## Post-Rotation Cleanup

After a successful rotation, clean up sensitive files and update documentation.

```bash
# Securely delete old CA keys
shred -u talos-ca-old.key k8s-ca-old.key 2>/dev/null || true

# Store new CA materials securely
# (use a secrets manager, not plain files)

# Update any documentation that references certificate fingerprints
# Update monitoring thresholds for the new expiration dates
```

## Conclusion

Manual CA rotation in Talos Linux follows a predictable pattern: back up, generate new certs, deploy the CA bundle, verify, deploy the final config, and verify again. The CA bundle step is the key safety mechanism that prevents disruption during the transition. Take your time, verify after every step, and always have your backups ready. Once you have done it successfully once, the process becomes routine.
