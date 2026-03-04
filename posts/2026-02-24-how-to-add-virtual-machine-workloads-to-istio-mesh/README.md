# How to Add Virtual Machine Workloads to Istio Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Virtual Machines, Kubernetes, Service Mesh, VM Onboarding

Description: Complete guide to adding non-Kubernetes virtual machine workloads to your Istio service mesh for unified traffic management and security.

---

Not every workload runs in Kubernetes. You might have legacy applications on VMs, databases that cannot be containerized, or third-party software that needs to stay on traditional infrastructure. Istio supports adding these VM-based workloads to the mesh, giving them the same mTLS, traffic management, and observability benefits as your Kubernetes services.

This guide walks through the entire process of onboarding a VM into an Istio mesh.

## How VM Mesh Integration Works

When you add a VM to an Istio mesh, you install the Istio sidecar proxy (Envoy) directly on the VM. This sidecar connects to Istiod running in your Kubernetes cluster to get its configuration. From Istiod's perspective, the VM sidecar is just another proxy to manage.

The flow looks like:

1. You create a WorkloadEntry in Kubernetes that represents the VM
2. You generate bootstrap tokens and configuration for the VM
3. You install the Istio sidecar on the VM
4. The sidecar connects to Istiod, gets its certificate, and starts intercepting traffic
5. Kubernetes services can now discover and route to the VM, and vice versa

## Prerequisites

- An Istio mesh running in Kubernetes (version 1.14+)
- A VM with network access to the Istio control plane (either directly or through an east-west gateway)
- The VM should be able to reach Kubernetes pod IPs or the east-west gateway IP

Set up environment variables:

```bash
export CTX_CLUSTER=cluster1
export VM_APP="legacy-app"
export VM_NAMESPACE="vm-workloads"
export WORK_DIR="/tmp/istio-vm"
export SERVICE_ACCOUNT="legacy-app-sa"
```

## Step 1: Prepare the Kubernetes Side

Create a namespace and service account for the VM workload:

```bash
kubectl create namespace "${VM_NAMESPACE}" --context="${CTX_CLUSTER}"
kubectl create serviceaccount "${SERVICE_ACCOUNT}" -n "${VM_NAMESPACE}" --context="${CTX_CLUSTER}"
```

## Step 2: Create the WorkloadGroup

A WorkloadGroup is like a Deployment but for VMs. It defines the template for VM workloads:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadGroup
metadata:
  name: legacy-app
  namespace: vm-workloads
spec:
  metadata:
    labels:
      app: legacy-app
      version: v1
  template:
    serviceAccount: legacy-app-sa
    network: vm-network
  probe:
    httpGet:
      port: 8080
      path: /health
    initialDelaySeconds: 5
    periodSeconds: 10
```

Apply it:

```bash
kubectl apply -f workload-group.yaml --context="${CTX_CLUSTER}"
```

## Step 3: Generate VM Bootstrap Files

Use `istioctl` to generate the files the VM needs to join the mesh:

```bash
mkdir -p "${WORK_DIR}"

istioctl x workload entry configure \
  --name "${VM_APP}" \
  --namespace "${VM_NAMESPACE}" \
  --serviceAccount "${SERVICE_ACCOUNT}" \
  --clusterID cluster1 \
  --output "${WORK_DIR}" \
  --autoregister \
  --context="${CTX_CLUSTER}"
```

This generates several files in the work directory:

- `cluster.env` - environment variables for the sidecar
- `istio-token` - JWT token for authentication with Istiod
- `mesh.yaml` - mesh configuration
- `root-cert.pem` - root certificate for mTLS trust
- `hosts` - host entries if needed

Check what was generated:

```bash
ls -la "${WORK_DIR}"
```

## Step 4: Configure Istiod Exposure

The VM needs to reach Istiod. If the VM is on the same network as your Kubernetes cluster, you can expose Istiod via a LoadBalancer. If not, use the east-west gateway.

Expose Istiod through the east-west gateway:

```bash
kubectl apply -f samples/multicluster/expose-istiod.yaml -n istio-system --context="${CTX_CLUSTER}"
```

Get the address:

```bash
ISTIOD_ADDR=$(kubectl get svc istio-eastwestgateway -n istio-system --context="${CTX_CLUSTER}" -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Istiod reachable at: ${ISTIOD_ADDR}"
```

## Step 5: Install the Sidecar on the VM

Transfer the generated files to the VM:

```bash
scp "${WORK_DIR}"/* user@vm-host:/tmp/istio-vm/
```

On the VM, install the Istio sidecar. For Debian/Ubuntu:

```bash
# Add the Istio apt repository
curl -LO https://storage.googleapis.com/istio-release/releases/1.20.0/deb/istio-sidecar.deb

# Install
sudo dpkg -i istio-sidecar.deb
```

For RPM-based systems:

```bash
curl -LO https://storage.googleapis.com/istio-release/releases/1.20.0/rpm/istio-sidecar.rpm
sudo rpm -i istio-sidecar.rpm
```

## Step 6: Configure the Sidecar on the VM

Copy the generated files to the correct locations:

```bash
sudo mkdir -p /etc/certs
sudo cp /tmp/istio-vm/root-cert.pem /etc/certs/root-cert.pem

sudo mkdir -p /var/run/secrets/tokens
sudo cp /tmp/istio-vm/istio-token /var/run/secrets/tokens/istio-token

sudo cp /tmp/istio-vm/cluster.env /var/lib/istio/envoy/cluster.env
sudo cp /tmp/istio-vm/mesh.yaml /etc/istio/config/mesh

# Set proper ownership
sudo chown -R istio-proxy:istio-proxy /etc/certs /var/run/secrets/tokens /var/lib/istio/envoy /etc/istio/config
```

Check the `cluster.env` file:

```bash
cat /var/lib/istio/envoy/cluster.env
```

It should contain entries like:

```text
ISTIO_META_CLUSTER_ID=cluster1
ISTIO_META_MESH_ID=mesh1
ISTIO_META_NETWORK=vm-network
CANONICAL_SERVICE=legacy-app
CANONICAL_REVISION=v1
```

## Step 7: Start the Sidecar

```bash
sudo systemctl start istio
sudo systemctl enable istio
```

Check the sidecar status:

```bash
sudo systemctl status istio
```

Check the sidecar logs:

```bash
sudo journalctl -u istio -f
```

Look for messages about successful connection to Istiod and certificate issuance.

## Step 8: Create a Service for the VM Workload

Create a Kubernetes Service that points to the VM workload. This lets Kubernetes-based services discover and call the VM:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-app
  namespace: vm-workloads
  labels:
    app: legacy-app
spec:
  ports:
  - port: 8080
    name: http
    targetPort: 8080
  selector:
    app: legacy-app
```

Apply it:

```bash
kubectl apply -f vm-service.yaml --context="${CTX_CLUSTER}"
```

## Step 9: Verify the VM Is in the Mesh

Check if the VM's proxy appears in Istiod's proxy status:

```bash
istioctl proxy-status --context="${CTX_CLUSTER}"
```

You should see the VM workload listed alongside your Kubernetes pods.

Check if the WorkloadEntry was auto-registered:

```bash
kubectl get workloadentries -n vm-workloads --context="${CTX_CLUSTER}"
```

Test connectivity from Kubernetes to the VM:

```bash
kubectl exec -n sample -c sleep deployment/sleep --context="${CTX_CLUSTER}" -- \
  curl -sS legacy-app.vm-workloads:8080
```

And from the VM to a Kubernetes service:

```bash
# On the VM
curl -sS reviews.bookinfo:9080/reviews/1
```

## Troubleshooting

**Sidecar cannot connect to Istiod**: Check that the VM can reach the Istiod address (east-west gateway or LoadBalancer IP) on ports 15012 and 15017.

**Certificate errors**: Make sure root-cert.pem on the VM matches the root CA in your mesh.

**Service not discoverable**: Verify the WorkloadEntry was created and the Service selector matches the WorkloadEntry labels.

```bash
kubectl get workloadentries -n vm-workloads -o yaml --context="${CTX_CLUSTER}"
```

## Summary

Adding VMs to an Istio mesh involves creating a WorkloadGroup, generating bootstrap configuration with `istioctl`, installing the Istio sidecar on the VM, and creating a Kubernetes Service to make the VM discoverable. Once connected, the VM workload gets the same mTLS, traffic routing, and observability as any Kubernetes pod in the mesh. The process has several steps, but each one is straightforward when you follow them in order.
