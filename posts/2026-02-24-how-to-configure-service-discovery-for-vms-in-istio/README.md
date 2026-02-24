# How to Configure Service Discovery for VMs in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Virtual Machines, Service Discovery, Kubernetes, Hybrid

Description: Integrate virtual machine workloads into Istio's service mesh so they participate in service discovery alongside Kubernetes pods.

---

Not everything runs in Kubernetes. You might have legacy applications on VMs, databases that can't be containerized yet, or third-party software that requires bare metal. Istio supports adding VM workloads to the mesh so they participate in service discovery just like Kubernetes pods. Services running on VMs get the same mTLS, traffic management, and observability as your containerized workloads.

## How VM Integration Works

When you add a VM to the Istio mesh, the VM runs a local Envoy proxy and connects to the Istio control plane. Istiod pushes configuration to the VM's proxy just like it does for Kubernetes sidecar proxies. The VM gets a SPIFFE identity, participates in mTLS, and appears in the service registry.

The key components are:

- **WorkloadEntry**: A Kubernetes resource that represents the VM workload in the mesh
- **WorkloadGroup**: A template for creating WorkloadEntry resources (similar to how a Deployment is a template for Pods)
- **Istio agent**: Runs on the VM and manages the Envoy proxy, certificates, and health checks

## Prerequisites

Before adding VMs to the mesh, make sure:

- Your Istio installation has VM support enabled
- The VM can reach the Istio control plane (istiod) over the network
- The VM can reach the east-west gateway (for cross-network setups)

Install Istio with VM support:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: cluster1
      network: network1
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

## Creating a WorkloadGroup

A WorkloadGroup defines the properties for VMs that will join the mesh. It's like a Deployment spec for VMs:

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadGroup
metadata:
  name: legacy-api
  namespace: backend
spec:
  metadata:
    labels:
      app: legacy-api
      version: v1
  template:
    serviceAccount: legacy-api
    network: vm-network
  probe:
    httpGet:
      path: /health
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 10
```

Create the corresponding service account:

```bash
kubectl create serviceaccount legacy-api -n backend
```

And a Kubernetes Service that selects these workloads:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-api
  namespace: backend
  labels:
    app: legacy-api
spec:
  ports:
  - port: 8080
    name: http
    targetPort: 8080
  selector:
    app: legacy-api
```

## Generating VM Bootstrap Files

Generate the files the VM needs to join the mesh:

```bash
istioctl x workload entry configure \
  --name legacy-api-vm1 \
  --namespace backend \
  --clusterID cluster1 \
  --externalIP 10.0.5.50 \
  --serviceAccount legacy-api \
  --output vm-files/
```

This generates several files in the `vm-files/` directory:

- `cluster.env`: Environment variables for the Istio agent
- `istio-token`: A bootstrap token for initial authentication
- `mesh.yaml`: Mesh configuration
- `root-cert.pem`: The root CA certificate
- `hosts`: Additional /etc/hosts entries

## Installing the Istio Agent on the VM

Copy the generated files to the VM and install the Istio sidecar:

```bash
# On the VM
# Download the Istio sidecar package
curl -LO https://storage.googleapis.com/istio-release/releases/1.22.0/deb/istio-sidecar.deb
sudo dpkg -i istio-sidecar.deb
```

Copy the bootstrap files:

```bash
sudo mkdir -p /etc/certs
sudo cp root-cert.pem /etc/certs/root-cert.pem

sudo mkdir -p /var/run/secrets/tokens
sudo cp istio-token /var/run/secrets/tokens/istio-token

sudo cp cluster.env /var/lib/istio/envoy/cluster.env
sudo cp mesh.yaml /etc/istio/config/mesh

sudo sh -c 'cat hosts >> /etc/hosts'
```

Start the Istio agent:

```bash
sudo systemctl start istio
sudo systemctl enable istio
```

Check that it's running:

```bash
sudo systemctl status istio
```

## Creating WorkloadEntry Resources

Once the VM agent connects to istiod, you need a WorkloadEntry to register it in the service registry:

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadEntry
metadata:
  name: legacy-api-vm1
  namespace: backend
spec:
  address: 10.0.5.50
  labels:
    app: legacy-api
    version: v1
  serviceAccount: legacy-api
  network: vm-network
```

If you have multiple VMs running the same service, create a WorkloadEntry for each:

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadEntry
metadata:
  name: legacy-api-vm2
  namespace: backend
spec:
  address: 10.0.5.51
  labels:
    app: legacy-api
    version: v1
  serviceAccount: legacy-api
  network: vm-network
```

Both VMs now appear as endpoints for the `legacy-api` service. Kubernetes pods calling `legacy-api.backend.svc.cluster.local` will have their requests load-balanced across both VMs.

## Automatic WorkloadEntry Registration

Manually creating WorkloadEntry resources for each VM is tedious. Istio supports automatic registration when VMs connect to the control plane. Enable it by setting the `PILOT_ENABLE_WORKLOAD_ENTRY_AUTOREGISTRATION` environment variable on istiod:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        PILOT_ENABLE_WORKLOAD_ENTRY_AUTOREGISTRATION: "true"
        PILOT_ENABLE_WORKLOAD_ENTRY_HEALTHCHECKS: "true"
```

With auto-registration, when a VM agent connects to istiod, a WorkloadEntry is automatically created based on the WorkloadGroup template.

## Verifying VM Service Discovery

Check that the VM workload is registered:

```bash
kubectl get workloadentry -n backend
```

Verify the endpoints:

```bash
kubectl get endpoints legacy-api -n backend
```

You should see the VM's IP address listed alongside any Kubernetes pod endpoints.

From a Kubernetes pod, test calling the VM service:

```bash
kubectl exec deploy/frontend -n frontend -- curl -s http://legacy-api.backend:8080/health
```

From the VM, test calling a Kubernetes service:

```bash
curl -s http://user-service.backend.svc.cluster.local:8080/health
```

Both directions should work. The VM is a full member of the mesh.

## Applying Policies to VM Workloads

Authorization policies work the same way for VMs as they do for pods:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: legacy-api-policy
  namespace: backend
spec:
  selector:
    matchLabels:
      app: legacy-api
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/frontend/sa/web-app"
    to:
    - operation:
        methods: ["GET", "POST"]
```

The VM's traffic is authenticated with mTLS just like pod traffic, so identity-based policies work correctly.

## Health Checks and Lifecycle

The WorkloadGroup's probe configuration tells Istio to health-check the VM. If the health check fails, the VM's WorkloadEntry is marked unhealthy and removed from the load balancing pool:

```yaml
spec:
  probe:
    httpGet:
      path: /health
      port: 8080
    initialDelaySeconds: 5
    periodSeconds: 10
    failureThreshold: 3
```

When the VM comes back healthy, it's automatically added back.

## Troubleshooting VM Discovery

If the VM isn't showing up in service discovery:

Check the Istio agent logs on the VM:

```bash
sudo journalctl -u istio -f
```

Check istiod logs for connection attempts:

```bash
kubectl logs deploy/istiod -n istio-system | grep "legacy-api"
```

Verify the VM can reach istiod:

```bash
# On the VM
curl -k https://istiod.istio-system.svc:15012/debug/endpointz
```

VM integration with Istio brings your entire infrastructure into one mesh. It's more work to set up than pure Kubernetes workloads, but the payoff is consistent security, observability, and traffic management across your hybrid environment.
