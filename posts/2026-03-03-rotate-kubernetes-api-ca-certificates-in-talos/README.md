# How to Rotate Kubernetes API CA Certificates in Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Certificates, PKI, Security

Description: Learn how to safely rotate the Kubernetes API CA certificates in a Talos Linux cluster with a rolling update strategy and zero downtime.

---

The Kubernetes API CA certificate is the foundation of trust for your entire Kubernetes cluster. Every component that communicates with the API server - kubelets, controllers, scheduler, and your kubectl clients - relies on this certificate chain for authentication. When the CA approaches expiration or you need to rotate it for security reasons, the process must be handled carefully to avoid breaking cluster communication.

Talos Linux manages Kubernetes certificates as part of its machine configuration, which means the rotation process goes through the Talos API rather than through manual file edits.

## The Kubernetes Certificate Hierarchy

In a Talos Linux cluster, the Kubernetes PKI includes several certificate authorities:

- **Kubernetes CA**: Signs the API server certificate, kubelet client certificates, and controller-manager certificates
- **Front Proxy CA**: Signs certificates used for API aggregation
- **Service Account Key**: Used to sign and verify service account tokens

All of these are embedded in the Talos machine configuration for control plane nodes.

```bash
# View the current Kubernetes certificates on a control plane node
talosctl -n 10.0.1.10 get certificate

# Check the Kubernetes API server certificate expiration
talosctl -n 10.0.1.10 read /etc/kubernetes/pki/apiserver.crt | \
  openssl x509 -text -noout | grep "Not After"
```

## When to Rotate

Common triggers for Kubernetes CA rotation include:

- CA certificate is within 6 months of expiration
- Security audit requires rotation
- Suspected compromise of the CA private key
- Team member departure who had access to cluster credentials
- Moving to stronger cryptographic algorithms

## Pre-Rotation Checklist

Before starting, make sure you have covered these bases:

```bash
# 1. Back up the current talosconfig
cp ~/.talos/config ~/.talos/config.pre-k8s-rotation

# 2. Back up the kubeconfig
cp ~/.kube/config ~/.kube/config.pre-k8s-rotation

# 3. Back up all control plane machine configs
for node in 10.0.1.10 10.0.1.11 10.0.1.12; do
  talosctl -n $node get machineconfig -o yaml > "backup-cp-${node}.yaml"
done

# 4. Take an etcd snapshot
talosctl -n 10.0.1.10 etcd snapshot etcd-pre-k8s-ca-rotation.snapshot

# 5. Verify current cluster health
kubectl get nodes
kubectl get cs
talosctl -n 10.0.1.10 etcd status
```

## Step 1: Generate a New Kubernetes CA

Create the new CA certificate and key pair.

```bash
# Generate a new Kubernetes CA
openssl genrsa -out new-k8s-ca.key 4096

openssl req -x509 -new -nodes \
  -key new-k8s-ca.key \
  -sha256 \
  -days 3650 \
  -out new-k8s-ca.crt \
  -subj "/CN=kubernetes"

# Verify the new certificate
openssl x509 -in new-k8s-ca.crt -text -noout

# Convert to base64 for Talos configuration
NEW_K8S_CA_CRT=$(base64 -w0 new-k8s-ca.crt)
NEW_K8S_CA_KEY=$(base64 -w0 new-k8s-ca.key)
```

## Step 2: Create the CA Bundle

During the transition period, both the old and new CAs need to be trusted. Create a bundle containing both certificates.

```bash
# Extract the current CA from your existing configuration
# (from the backup you made earlier)
talosctl -n 10.0.1.10 get machineconfig -o yaml | \
  yq '.cluster.ca.crt' | base64 -d > old-k8s-ca.crt

# Create the bundle
cat old-k8s-ca.crt new-k8s-ca.crt > k8s-ca-bundle.crt
K8S_CA_BUNDLE=$(base64 -w0 k8s-ca-bundle.crt)
```

## Step 3: Update Control Plane Configurations with the Bundle

Create updated machine configurations that include the CA bundle.

```yaml
# control-plane-config-bundle.yaml (relevant section)
cluster:
  ca:
    crt: <K8S_CA_BUNDLE>  # Both old and new CA certificates
    key: <NEW_K8S_CA_KEY>  # New CA key for signing new certificates
  apiServer:
    certSANs:
      - 10.0.1.10
      - 10.0.1.11
      - 10.0.1.12
      - k8s.example.com
```

Apply the bundle configuration to control plane nodes one at a time:

```bash
# Update first control plane node
talosctl -n 10.0.1.10 apply-config --file cp-bundle-config-1.yaml

# Wait for the node to reconcile and verify health
echo "Waiting for node to reconcile..."
sleep 60

# Verify the node is healthy
talosctl -n 10.0.1.10 health
kubectl get nodes

# Check that the API server is serving a certificate chain
# that includes the new CA
talosctl -n 10.0.1.10 etcd status

# Proceed with the next control plane node
talosctl -n 10.0.1.11 apply-config --file cp-bundle-config-2.yaml
sleep 60
talosctl -n 10.0.1.11 health

# And the third
talosctl -n 10.0.1.12 apply-config --file cp-bundle-config-3.yaml
sleep 60
talosctl -n 10.0.1.12 health
```

## Step 4: Update Worker Nodes

Worker nodes also need to trust the CA bundle so they can communicate with the API server during and after the transition.

```bash
# Update worker configurations to trust the CA bundle
for worker in 10.0.2.10 10.0.2.11 10.0.2.12; do
  echo "Updating worker $worker..."
  talosctl -n $worker apply-config --file worker-bundle-config.yaml
  sleep 30

  # Verify the kubelet is healthy
  NODE_NAME=$(kubectl get nodes -o wide | grep $worker | awk '{print $1}')
  kubectl get node $NODE_NAME
done
```

## Step 5: Verify the Bundle Phase

After all nodes are running with the CA bundle, verify that everything is working correctly.

```bash
# Full cluster health check
echo "Checking all nodes..."
kubectl get nodes
echo ""

echo "Checking component status..."
kubectl get cs
echo ""

echo "Checking etcd health..."
talosctl -n 10.0.1.10 etcd member list
talosctl -n 10.0.1.10 etcd status
echo ""

echo "Testing workload scheduling..."
kubectl run rotation-test --image=alpine --restart=Never -- echo "CA rotation bundle working"
kubectl wait --for=condition=completed pod/rotation-test --timeout=60s
kubectl delete pod rotation-test
echo ""

echo "Testing service account tokens..."
kubectl auth can-i get pods --as=system:serviceaccount:default:default
```

## Step 6: Regenerate Kubeconfig

Generate a new kubeconfig with client certificates signed by the new CA.

```bash
# Talos can generate a new kubeconfig
talosctl -n 10.0.1.10 kubeconfig ~/.kube/config --force

# Verify kubectl works with the new kubeconfig
kubectl get nodes
kubectl cluster-info
```

## Step 7: Remove the Old CA

Once all components are using certificates signed by the new CA, remove the old CA from the configuration.

```yaml
# Final configuration with only the new CA
cluster:
  ca:
    crt: <NEW_K8S_CA_CRT>  # Only the new CA certificate
    key: <NEW_K8S_CA_KEY>
```

```bash
# Apply final configs - control plane nodes first
for cp in 10.0.1.10 10.0.1.11 10.0.1.12; do
  echo "Finalizing control plane $cp..."
  talosctl -n $cp apply-config --file cp-final-config.yaml
  sleep 60
  talosctl -n $cp health
  kubectl get nodes
done

# Then worker nodes
for worker in 10.0.2.10 10.0.2.11 10.0.2.12; do
  echo "Finalizing worker $worker..."
  talosctl -n $worker apply-config --file worker-final-config.yaml
  sleep 30
done
```

## Step 8: Update Service Account Tokens

Existing service account tokens were signed with the old key. They need to be refreshed.

```bash
# Delete existing service account token secrets
# Kubernetes will automatically regenerate them
kubectl get secrets --all-namespaces -o json | \
  jq -r '.items[] | select(.type=="kubernetes.io/service-account-token") | "\(.metadata.namespace) \(.metadata.name)"' | \
  while read ns name; do
    echo "Deleting token: $ns/$name"
    kubectl delete secret -n $ns $name
  done

# Restart pods that may be caching old tokens
kubectl rollout restart deployment --all-namespaces
```

## Step 9: Post-Rotation Validation

Run a comprehensive validation to confirm the rotation was successful.

```bash
#!/bin/bash
# validate-k8s-ca-rotation.sh

ERRORS=0

# Check all nodes are Ready
NOT_READY=$(kubectl get nodes --no-headers | grep -v "Ready" | wc -l)
if [ "$NOT_READY" -gt 0 ]; then
  echo "FAIL: $NOT_READY nodes are not Ready"
  ERRORS=$((ERRORS + 1))
else
  echo "PASS: All nodes are Ready"
fi

# Check all system pods are running
FAILING_PODS=$(kubectl get pods -n kube-system --no-headers | grep -v "Running\|Completed" | wc -l)
if [ "$FAILING_PODS" -gt 0 ]; then
  echo "FAIL: $FAILING_PODS system pods are not running"
  ERRORS=$((ERRORS + 1))
else
  echo "PASS: All system pods are healthy"
fi

# Check etcd health
if talosctl -n 10.0.1.10 etcd status > /dev/null 2>&1; then
  echo "PASS: etcd is healthy"
else
  echo "FAIL: etcd is unhealthy"
  ERRORS=$((ERRORS + 1))
fi

# Check certificate expiration
CERT_EXPIRY=$(talosctl -n 10.0.1.10 read /etc/kubernetes/pki/ca.crt | \
  openssl x509 -noout -enddate | cut -d= -f2)
echo "INFO: New CA expires: $CERT_EXPIRY"

# Verify API server is using new certificate
echo "INFO: API server certificate info:"
echo | openssl s_client -connect 10.0.1.10:6443 2>/dev/null | \
  openssl x509 -noout -issuer -dates

if [ "$ERRORS" -gt 0 ]; then
  echo "RESULT: $ERRORS validation failures detected"
  exit 1
else
  echo "RESULT: All validations passed"
fi
```

## Handling Issues During Rotation

### API Server Becomes Unreachable

If the API server becomes unreachable after applying a config:

```bash
# Try to reach through Talos API
talosctl -n 10.0.1.10 logs kube-apiserver

# Roll back to backup configuration
talosctl -n 10.0.1.10 apply-config --file backup-cp-10.0.1.10.yaml
```

### Kubelet Certificate Errors

If kubelets cannot authenticate after the rotation:

```bash
# Check kubelet logs
talosctl -n 10.0.2.10 logs kubelet

# The kubelet might need to re-bootstrap
# This happens automatically when the node config is applied
```

## Conclusion

Rotating the Kubernetes API CA certificates in a Talos Linux cluster requires a careful multi-step approach. The CA bundle strategy ensures zero downtime by allowing both old and new certificates to coexist during the transition. Always back up everything before starting, take it one node at a time, and verify health at each step. Post-rotation, make sure to refresh service account tokens and validate the entire certificate chain. With proper planning, this process can be completed smoothly even on production clusters.
