# Extend Istio Service Mesh to Include VM Workloads Outside the Kubernetes Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Kubernetes, Virtual Machine, Hybrid Cloud, Service Mesh

Description: Learn how to extend your Istio service mesh beyond Kubernetes to include virtual machine workloads, enabling unified traffic management, security policies.

---

Not all workloads migrate to Kubernetes immediately. Legacy applications, databases, and specialized services often run on virtual machines while new services run in Kubernetes. Istio lets you extend your service mesh to include these VM workloads, giving you consistent policies and observability across your hybrid infrastructure.

## Why Include VMs in Your Service Mesh

Running a service mesh that spans Kubernetes and VMs provides several benefits. You get unified mTLS encryption between all services regardless of where they run. Traffic policies work consistently across your infrastructure. Observability tools show the complete service graph including VM workloads.

This is especially valuable during migrations. You can move services from VMs to Kubernetes incrementally while maintaining service mesh features throughout the transition. The mesh handles service discovery automatically as workloads move between environments.

## Prerequisites

You need a Kubernetes cluster with Istio installed and VM instances that can reach the Istio ingress or east-west gateway. The VMs must have network connectivity to the exposed Istio control plane endpoint and be able to resolve DNS queries for Kubernetes services through Istio's DNS proxy or an external DNS configuration.

Check your Istio version supports VM workloads:

```bash
istioctl version
```

Use a currently supported Istio release. This guide uses the WorkloadGroup and WorkloadEntry APIs for virtual machine integration.

## Configuring Istio for VM Integration

First, install Istio with cluster metadata and enable WorkloadEntry auto-registration if you want VMs to register automatically. Update your IstioOperator configuration:

```yaml
# istio-vm-config.yaml

apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-vm-integration
  namespace: istio-system
spec:
  values:
    global:
      meshID: mesh1
      multiCluster:
        clusterName: Kubernetes
      network: ""
    pilot:
      env:
        PILOT_ENABLE_WORKLOAD_ENTRY_AUTOREGISTRATION: "true"
        PILOT_ENABLE_WORKLOAD_ENTRY_HEALTHCHECKS: "true"
```

Apply the configuration:

```bash
istioctl install -f istio-vm-config.yaml
```

Expose the control plane through an east-west gateway so VMs can reach `istiod`:

```bash
samples/multicluster/gen-eastwest-gateway.sh --single-cluster | istioctl install -y -f -
kubectl apply -n istio-system -f samples/multicluster/expose-istiod.yaml
```

## Creating a WorkloadGroup for VM Services

WorkloadGroups define templates for VM workloads. They specify labels, ports, and service account information that VMs will use.

```yaml
# workloadgroup-database.yaml
apiVersion: networking.istio.io/v1
kind: WorkloadGroup
metadata:
  name: database-vms
  namespace: default
spec:
  metadata:
    labels:
      app: postgres-db
      version: "14"
  template:
    ports:
      postgresql: 5432
    serviceAccount: database-sa
  probe:
    periodSeconds: 10
    initialDelaySeconds: 5
    httpGet:
      path: /health
      port: 8080
```

```bash
kubectl apply -f workloadgroup-database.yaml
```

Create the service account for your VM workloads:

```yaml
# serviceaccount-database.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: database-sa
  namespace: default
```

```bash
kubectl apply -f serviceaccount-database.yaml
```

## Generating Configuration for VM Installation

Generate the configuration files and certificates needed on your VM. Istio provides the istioctl x workload commands for this.

```bash
# Create a working directory for VM configs
mkdir -p vm-configs/database

# Generate configuration for the VM
istioctl x workload entry configure \
  -f workloadgroup-database.yaml \
  -o vm-configs/database \
  --ingressIP <ISTIO_INGRESS_IP> \
  --clusterID Kubernetes \
  --autoregister
```

Replace `<ISTIO_INGRESS_IP>` with the external IP of your Istio ingress gateway:

```bash
kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

This generates several files in the vm-configs/database directory:

- cluster.env - Environment variables for Istio
- mesh.yaml - Mesh configuration
- root-cert.pem - Root certificate for mTLS
- istio-token - JWT token for authentication
- hosts - Host entries that let the proxy reach istiod for xDS

## Installing Istio Sidecar on the VM

Copy the generated files to your VM and install the Istio sidecar. SSH to your VM and run these commands:

```bash
# Download Istio sidecar packages
curl -LO https://storage.googleapis.com/istio-release/releases/1.30.0/deb/istio-sidecar.deb

# Install the sidecar
sudo dpkg -i istio-sidecar.deb

# Copy configuration files to the correct location
sudo mkdir -p /etc/certs /var/run/secrets/tokens /var/lib/istio/envoy /etc/istio/config /etc/istio/proxy

sudo cp root-cert.pem /etc/certs/root-cert.pem
sudo cp istio-token /var/run/secrets/tokens/istio-token
sudo cp cluster.env /var/lib/istio/envoy/cluster.env
sudo cp mesh.yaml /etc/istio/config/mesh
sudo sh -c 'cat hosts >> /etc/hosts'

# Set ownership
sudo chown -R istio-proxy /var/lib/istio /etc/certs /etc/istio/proxy /etc/istio/config /var/run/secrets

# Start the Istio agent
sudo systemctl enable istio
sudo systemctl start istio
```

Check the sidecar is running:

```bash
sudo systemctl status istio
```

## Verifying VM Registration

Back in your Kubernetes cluster, check that the VM registered automatically:

```bash
kubectl get workloadentry -n default
```

You should see an entry for your VM. Check the details:

```bash
kubectl get workloadentry <vm-workload-entry-name> -o yaml
```

The WorkloadEntry contains the VM's IP address, labels from the WorkloadGroup, and health status.

## Creating a Service for VM Workloads

Create a Kubernetes Service that includes your VM workloads. Use a selector that matches the WorkloadGroup labels:

```yaml
# service-database.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres-db
  namespace: default
spec:
  ports:
  - port: 5432
    targetPort: 5432
    protocol: TCP
    name: postgresql
  selector:
    app: postgres-db
```

```bash
kubectl apply -f service-database.yaml
```

Kubernetes services automatically include both pod and VM endpoints that match the selector. Check the endpoints:

```bash
kubectl get endpoints postgres-db
```

You should see both Kubernetes pod IPs and VM IPs in the endpoint list.

## Testing Connectivity from Kubernetes to VM

Deploy a client pod in Kubernetes to test connectivity to your VM service:

```yaml
# client-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres-client
  namespace: default
spec:
  containers:
  - name: postgres-client
    image: postgres:14
    command: ["/bin/sh"]
    args: ["-c", "while true; do sleep 3600; done"]
```

```bash
kubectl apply -f client-pod.yaml
```

Test the connection:

```bash
kubectl exec -it postgres-client -- psql -h postgres-db -U postgres -c "SELECT version();"
```

If the connection succeeds, traffic is flowing through the mesh with mTLS encryption.

## Configuring Traffic Policies for VM Workloads

Apply Istio traffic policies to VM workloads just like Kubernetes services. Create a DestinationRule for connection pooling and circuit breaking:

```yaml
# destinationrule-database.yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgres-db
  namespace: default
spec:
  host: postgres-db
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 10
        maxRequestsPerConnection: 2
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

```bash
kubectl apply -f destinationrule-database.yaml
```

## Enabling mTLS for VM Workloads

Configure PeerAuthentication to enforce mTLS between all workloads including VMs:

```yaml
# peerauthentication-strict.yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

```bash
kubectl apply -f peerauthentication-strict.yaml
```

With STRICT mode, workloads only accept mTLS traffic. The Istio sidecar on your VM handles this automatically using the root certificate and token you installed.

## Monitoring VM Workloads in the Service Mesh

VM workloads appear in Istio's telemetry just like pod workloads. Check metrics in Prometheus:

```promql
# TCP connection rate to VM database
sum(rate(istio_tcp_connections_opened_total{destination_service="postgres-db.default.svc.cluster.local"}[5m]))

# TCP traffic received by the database service
sum(rate(istio_tcp_received_bytes_total{destination_service="postgres-db.default.svc.cluster.local"}[5m]))
```

View the service graph in Kiali. Your VM workloads appear as nodes with traffic flowing from Kubernetes services.

## Health Checks for VM Workloads

Configure health checks so Istio removes unhealthy VMs from the load balancing pool. The WorkloadGroup probe setting defines the health check:

```yaml
# workloadgroup-with-health.yaml
apiVersion: networking.istio.io/v1
kind: WorkloadGroup
metadata:
  name: database-vms
  namespace: default
spec:
  metadata:
    labels:
      app: postgres-db
  template:
    ports:
      postgresql: 5432
    serviceAccount: database-sa
  probe:
    periodSeconds: 10
    initialDelaySeconds: 5
    httpGet:
      path: /health
      port: 8080
```

Your VM application must expose a health endpoint. For a PostgreSQL database, you could run a simple HTTP server:

```python
# health_server.py on the VM
from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess

class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            # Check if PostgreSQL is accepting connections
            result = subprocess.run(['pg_isready', '-U', 'postgres'],
                                    capture_output=True)
            if result.returncode == 0:
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'healthy')
            else:
                self.send_response(503)
                self.end_headers()
                self.wfile.write(b'unhealthy')

server = HTTPServer(('0.0.0.0', 8080), HealthHandler)
server.serve_forever()
```

Run this as a systemd service on your VM to provide health status to Istio.

## Adding Multiple VMs to the Same WorkloadGroup

To add more VMs running the same service, repeat the installation process on each VM. They'll all auto-register using the same WorkloadGroup template.

Each VM gets a unique WorkloadEntry in Kubernetes, but they share the same labels and appear as a single logical service. Istio load balances across all healthy instances automatically.

## Decommissioning VM Workloads

When migrating a service from VM to Kubernetes, the transition is seamless. Deploy the Kubernetes version with the same labels as the VM WorkloadGroup:

```yaml
# deployment-postgres-k8s.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-db
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: postgres-db
  template:
    metadata:
      labels:
        app: postgres-db
        version: k8s
    spec:
      containers:
      - name: postgres
        image: postgres:14
        ports:
        - containerPort: 5432
```

The service automatically load balances between VM and Kubernetes instances. Gradually shut down VMs as Kubernetes instances prove stable. Istio handles the transition transparently to clients.

## Conclusion

Extending Istio to VM workloads bridges the gap between legacy infrastructure and cloud-native applications. You get consistent security, traffic management, and observability across your entire service estate during migration and beyond.

The WorkloadGroup and WorkloadEntry APIs make VM integration straightforward. Auto-registration eliminates manual configuration as VMs join or leave the mesh. Health checks ensure only healthy instances receive traffic.

Start by adding critical services like databases to your mesh, then expand to include more VM workloads as you build confidence. This gives you a unified service mesh regardless of where workloads run.
