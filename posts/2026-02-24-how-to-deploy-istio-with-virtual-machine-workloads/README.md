# How to Deploy Istio with Virtual Machine Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Virtual Machines, Kubernetes, Service Mesh, Hybrid

Description: A complete walkthrough for adding virtual machine workloads to your Istio service mesh so VMs and Kubernetes pods communicate seamlessly.

---

Not everything runs in Kubernetes. Legacy applications, databases, third-party software, and stateful workloads often live on virtual machines. Istio lets you bring these VMs into the mesh so they get the same traffic management, security, and observability features as your Kubernetes workloads. The VM gets a sidecar proxy that connects to Istiod, and from that point on, it is a first-class citizen in the mesh.

## How VM Integration Works

When you add a VM to an Istio mesh, here is what happens:

1. You create a WorkloadEntry resource in Kubernetes that represents the VM
2. The VM runs the Istio sidecar proxy (Envoy) managed by the istio-agent
3. The agent on the VM connects to Istiod to get its configuration and certificates
4. Other mesh services can call the VM by its service name, and the VM can call Kubernetes services by their DNS names

The VM needs network access to Istiod (typically through an east-west gateway) and to the pods it needs to communicate with (either directly or through gateways).

## Prerequisites

- A working Istio installation on Kubernetes
- A VM that can reach the Kubernetes cluster's east-west gateway
- DNS proxy enabled on the VM sidecar (so the VM can resolve Kubernetes service names)

## Step 1: Prepare the Mesh for VM Workloads

Install Istio with VM support enabled:

```yaml
# istio-vm-support.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
```

```bash
istioctl install -f istio-vm-support.yaml
```

Install the east-west gateway to expose Istiod to VMs:

```bash
samples/multicluster/gen-eastwest-gateway.sh --network network1 | istioctl install -f -
```

Expose Istiod through the gateway:

```bash
kubectl apply -f samples/multicluster/expose-istiod.yaml -n istio-system
```

The `expose-istiod.yaml` creates a Gateway that makes Istiod's xDS port (15012) available through the east-west gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: istiod-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
    - port:
        number: 15012
        name: tls-istiod
        protocol: TLS
      tls:
        mode: PASSTHROUGH
      hosts:
        - "*"
```

## Step 2: Create the VM Namespace and Service Account

```bash
kubectl create namespace vm-workloads
kubectl label namespace vm-workloads istio-injection=enabled
kubectl create serviceaccount vm-mysql -n vm-workloads
```

## Step 3: Create a WorkloadGroup

The WorkloadGroup is a template for VM workloads, similar to how a Deployment is a template for pods:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadGroup
metadata:
  name: mysql
  namespace: vm-workloads
spec:
  metadata:
    labels:
      app: mysql
      version: v1
  template:
    serviceAccount: vm-mysql
    network: vm-network
  probe:
    httpGet:
      port: 3306
    periodSeconds: 5
```

Apply it:

```bash
kubectl apply -f workloadgroup-mysql.yaml
```

## Step 4: Generate VM Configuration Files

Use `istioctl` to generate the files the VM needs:

```bash
istioctl x workload entry configure \
  -f workloadgroup-mysql.yaml \
  -o mysql-vm-files \
  --clusterID cluster1 \
  --autoregister
```

This creates a directory with:
- `cluster.env` - Environment variables for the istio-agent
- `istio-token` - Authentication token
- `mesh.yaml` - Mesh configuration
- `root-cert.pem` - Root CA certificate
- `hosts` - DNS entries for Istiod

## Step 5: Set Up the VM

Copy the generated files to the VM and install the Istio sidecar. The exact steps depend on your VM's OS.

For Debian/Ubuntu:

```bash
# On the VM
# Add the Istio package repository
curl -LO https://storage.googleapis.com/istio-release/releases/1.20.0/deb/istio-sidecar.deb
sudo dpkg -i istio-sidecar.deb

# Copy the configuration files
sudo mkdir -p /etc/certs
sudo cp root-cert.pem /etc/certs/root-cert.pem
sudo mkdir -p /var/run/secrets/tokens
sudo cp istio-token /var/run/secrets/tokens/istio-token
sudo cp cluster.env /var/lib/istio/envoy/cluster.env
sudo cp mesh.yaml /etc/istio/config/mesh

# Set ownership
sudo chown -R istio-proxy:istio-proxy /etc/certs /var/run/secrets /var/lib/istio /etc/istio

# Start the Istio sidecar
sudo systemctl start istio
sudo systemctl enable istio
```

Verify the sidecar is running and connected:

```bash
sudo systemctl status istio
sudo journalctl -u istio -f
```

Look for log messages indicating successful connection to Istiod: `"xds]connected"` or similar.

## Step 6: Create the WorkloadEntry and Service

If you used `--autoregister` in step 4, the WorkloadEntry is created automatically when the VM connects. Otherwise, create it manually:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: mysql-vm
  namespace: vm-workloads
spec:
  address: 192.168.1.100
  labels:
    app: mysql
    version: v1
  serviceAccount: vm-mysql
  network: vm-network
```

Create a Service that includes the VM:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
  namespace: vm-workloads
  labels:
    app: mysql
spec:
  ports:
    - port: 3306
      name: tcp-mysql
      targetPort: 3306
  selector:
    app: mysql
```

The selector `app: mysql` matches both the WorkloadEntry labels and any Kubernetes pods with the same label. This means you can have a mix of VM and pod endpoints behind the same service.

## Step 7: Test Connectivity

From a pod in the mesh:

```bash
kubectl exec -n sample -c sleep deploy/sleep -- \
  mysql -h mysql.vm-workloads.svc.cluster.local -u root -p
```

From the VM to a Kubernetes service:

```bash
# On the VM (DNS proxy resolves Kubernetes service names)
curl http://httpbin.default.svc.cluster.local:8000/headers
```

## Managing VM Lifecycle

**Scaling**: Add more VMs by creating additional WorkloadEntry resources or using auto-registration. Each VM gets its own WorkloadEntry.

**Health checking**: Configure health probes in the WorkloadGroup. Istio periodically checks the probe endpoint and removes unhealthy VMs from the load balancing pool.

**Decommissioning**: When taking a VM out of the mesh, stop the Istio sidecar service and delete the corresponding WorkloadEntry.

```bash
# On the VM
sudo systemctl stop istio

# In Kubernetes
kubectl delete workloadentry mysql-vm -n vm-workloads
```

## Security for VM Workloads

VM workloads get the same mTLS encryption as Kubernetes pods. The istio-agent on the VM handles certificate rotation automatically. You can apply AuthorizationPolicy rules that include VM workloads:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: mysql-access
  namespace: vm-workloads
spec:
  selector:
    matchLabels:
      app: mysql
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/backend/sa/api-server
```

This restricts access to the MySQL VM to only the `api-server` service account in the `backend` namespace.

VM integration in Istio is mature enough for production use. The setup is more involved than pure Kubernetes workloads, but the payoff is consistent security and observability across your entire infrastructure.
