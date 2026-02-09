# How to Implement Istio WorkloadEntry for VM Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Service Mesh, Virtual Machines, Kubernetes, Hybrid Cloud

Description: Learn how to integrate virtual machines into your Istio service mesh using WorkloadEntry resources for seamless hybrid cloud architectures.

---

Istio's WorkloadEntry resource allows you to bring virtual machines and bare-metal servers into your service mesh alongside Kubernetes workloads. This capability is essential for hybrid cloud deployments where you need consistent traffic management, security, and observability across both containerized and traditional workloads.

## Understanding WorkloadEntry

A WorkloadEntry represents a single non-Kubernetes workload in your service mesh. It tells Istio how to reach a VM or external service and how to apply mesh policies to it. Think of it as manually defining what a Kubernetes Pod would automatically provide - IP addresses, ports, labels, and service account information.

The key benefit is uniform policy enforcement. Your VMs get the same mutual TLS, traffic routing, and telemetry features as your Kubernetes pods without requiring containerization.

## Prerequisites for VM Integration

Before creating WorkloadEntry resources, you need to prepare your VMs. First, install the Istio sidecar proxy on each VM. The proxy handles all service mesh communication, just like it does in Kubernetes.

Download the Istio sidecar installation files to your VM:

```bash
# On your VM
curl -LO https://storage.googleapis.com/istio-release/releases/1.20.0/deb/istio-sidecar.deb
sudo dpkg -i istio-sidecar.deb
```

Next, configure the VM to connect to your Istio control plane. You need the mesh configuration and root certificates:

```bash
# Generate files from your Kubernetes cluster
istioctl x workload entry configure \
  -f workloadentry.yaml \
  -o vm-config \
  --clusterID "cluster1" \
  --autoregister
```

This command creates a configuration directory with everything the VM needs to join the mesh. Copy these files to your VM and place them in `/etc/certs` and `/var/run/secrets/istio`.

## Creating a Basic WorkloadEntry

Let's integrate a VM running a database into your mesh. First, define the WorkloadEntry resource:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: postgres-vm-1
  namespace: databases
spec:
  # The VM's IP address
  address: 10.10.1.50
  ports:
    postgres: 5432
  labels:
    app: postgres
    version: v14
    environment: production
  # Service account for mTLS identity
  serviceAccount: postgres-vm
```

The address field is critical - it must be reachable from your Kubernetes pods. If your VMs are in a different network, ensure proper routing or VPN connectivity exists.

Labels are equally important. Istio uses them for traffic routing and policy matching. Use the same label conventions as your Kubernetes services for consistency.

Apply this configuration:

```bash
kubectl apply -f workloadentry.yaml
```

## Associating WorkloadEntry with a Service

A WorkloadEntry alone does not make your VM discoverable. You need to associate it with a Kubernetes Service using label selectors:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: databases
spec:
  ports:
  - port: 5432
    name: postgres
    protocol: TCP
  selector:
    app: postgres
```

This Service selects both Kubernetes Pods and WorkloadEntry resources with the `app: postgres` label. Istio automatically includes your VM in the service endpoint pool. Traffic to `postgres.databases.svc.cluster.local` now load balances across both pods and VMs.

## Configuring Mutual TLS

For secure communication, configure mutual TLS for your VM workloads. First, create a ServiceAccount in Kubernetes:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: postgres-vm
  namespace: databases
```

Then update your WorkloadEntry to reference it:

```yaml
spec:
  serviceAccount: postgres-vm
```

On your VM, the Istio agent uses this identity to request certificates from the Istio CA. The agent automatically rotates certificates before expiration, maintaining secure connections without manual intervention.

Verify mTLS is working by checking the proxy logs on your VM:

```bash
# On the VM
sudo journalctl -u istio -f
```

Look for certificate rotation messages and successful connection events.

## Advanced WorkloadEntry Configuration

For production deployments, you will need more sophisticated configurations. Add health checks to ensure Istio only routes traffic to healthy VMs:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: postgres-vm-1
  namespace: databases
spec:
  address: 10.10.1.50
  ports:
    postgres: 5432
  labels:
    app: postgres
    version: v14
  serviceAccount: postgres-vm
  # Network identifier for multi-network scenarios
  network: vm-network
  # Locality for locality-aware routing
  locality: us-east-1/zone-a
  # Weight for load balancing
  weight: 100
```

The network field is crucial for multi-network meshes. If your VMs are in a separate network from your Kubernetes cluster, specify the network name. Istio uses this information to make intelligent routing decisions and avoid cross-network calls when possible.

Locality enables geographic traffic distribution. Set it to match your cloud provider's region and zone structure. Istio can prefer local endpoints to reduce latency and costs.

## Managing Multiple VMs

For services running on multiple VMs, create a WorkloadEntry for each instance:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: postgres-vm-1
  namespace: databases
spec:
  address: 10.10.1.50
  ports:
    postgres: 5432
  labels:
    app: postgres
    version: v14
    instance: vm-1
  serviceAccount: postgres-vm
---
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: postgres-vm-2
  namespace: databases
spec:
  address: 10.10.1.51
  ports:
    postgres: 5432
  labels:
    app: postgres
    version: v14
    instance: vm-2
  serviceAccount: postgres-vm
```

Both VMs share the same labels and service account but have unique names and addresses. The Service selector picks up both entries, and Istio load balances across them.

## Implementing Automatic Registration

Manual WorkloadEntry creation becomes tedious with many VMs. Istio supports automatic registration where VMs register themselves when the sidecar starts:

```bash
# On your Kubernetes cluster, create a WorkloadGroup template
apiVersion: networking.istio.io/v1beta1
kind: WorkloadGroup
metadata:
  name: postgres-vms
  namespace: databases
spec:
  metadata:
    labels:
      app: postgres
      version: v14
  template:
    ports:
      postgres: 5432
    serviceAccount: postgres-vm
```

Configure your VMs with auto-registration enabled:

```bash
istioctl x workload entry configure \
  -f workloadgroup.yaml \
  -o vm-config \
  --autoregister
```

When the VM's Istio agent starts, it contacts the control plane and registers itself. The control plane creates a WorkloadEntry automatically based on the WorkloadGroup template. This approach scales better and reduces configuration drift.

## Troubleshooting VM Integration

When VMs do not appear in your service mesh, check several common issues. First, verify network connectivity from the VM to the Istio control plane:

```bash
# Test from the VM
curl -v https://istiod.istio-system.svc.cluster.local:15012/version
```

If this fails, check firewall rules and DNS resolution. The VM must reach the control plane's service endpoint.

Next, check the WorkloadEntry status:

```bash
kubectl get workloadentry postgres-vm-1 -n databases -o yaml
```

Look for conditions and events that indicate problems. Common issues include certificate expiration, incorrect service account references, or IP address mismatches.

Monitor the Istio agent logs on your VM for errors:

```bash
sudo journalctl -u istio --no-pager | grep -i error
```

Certificate issues often appear here first. If certificates fail to provision, verify the service account exists and has proper permissions.

## Performance Considerations

VM integration adds network hops for east-west traffic. The sidecar proxy on the VM intercepts traffic and enforces policies, adding latency compared to direct connections. Measure this impact in your environment.

For latency-sensitive workloads, consider using locality-aware routing to keep traffic within the same datacenter or availability zone. Configure appropriate DestinationRule policies:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: postgres
  namespace: databases
spec:
  host: postgres.databases.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
        - from: us-east-1/zone-a/*
          to:
            "us-east-1/zone-a/*": 80
            "us-east-1/zone-b/*": 20
```

This configuration prefers local VMs but gracefully falls back to other zones if needed.

WorkloadEntry enables true hybrid cloud architectures where VMs and containers coexist in a unified service mesh. The configuration requires careful planning but delivers consistent security and observability across your entire infrastructure.
