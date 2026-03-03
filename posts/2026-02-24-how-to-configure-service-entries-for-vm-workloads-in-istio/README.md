# How to Configure Service Entries for VM Workloads in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, Virtual Machine, WorkloadEntry, Service Mesh

Description: How to use ServiceEntry and WorkloadEntry resources to register VM-based workloads in Istio for proper service discovery and traffic management.

---

When you bring VM workloads into an Istio mesh, you need a way to tell Istio about them. Kubernetes services are automatically discovered, but VMs do not have a Kubernetes API registering them. Istio uses two resources for this: WorkloadEntry (to describe individual VM instances) and ServiceEntry (to group them into a logical service). Together, they make VM workloads look just like Kubernetes services to the rest of the mesh.

## WorkloadEntry vs ServiceEntry

Before jumping into configuration, it helps to understand how these two resources relate:

**WorkloadEntry** represents a single VM instance. It is like a Pod in Kubernetes - it has an IP address, labels, and a service account. If you have 3 VMs running the same application, you create 3 WorkloadEntries.

**ServiceEntry** represents a logical service. It is like a Kubernetes Service - it has a hostname, ports, and selects backends via labels. A ServiceEntry can select WorkloadEntries based on labels, just like a Service selects Pods.

When used together:

```text
ServiceEntry (legacy-db.vm-apps.svc.cluster.local)
  └── WorkloadEntry (vm-1: 10.0.1.10)
  └── WorkloadEntry (vm-2: 10.0.1.11)
  └── WorkloadEntry (vm-3: 10.0.1.12)
```

## Creating WorkloadEntries

Each VM gets a WorkloadEntry. You can create them manually or use autoregistration.

### Manual WorkloadEntry

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: legacy-db-vm1
  namespace: vm-apps
spec:
  address: 10.0.1.10
  labels:
    app: legacy-db
    version: v1
    instance: vm1
  serviceAccount: legacy-db-sa
  network: vm-network
```

Create one for each VM:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: legacy-db-vm2
  namespace: vm-apps
spec:
  address: 10.0.1.11
  labels:
    app: legacy-db
    version: v1
    instance: vm2
  serviceAccount: legacy-db-sa
  network: vm-network
---
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: legacy-db-vm3
  namespace: vm-apps
spec:
  address: 10.0.1.12
  labels:
    app: legacy-db
    version: v1
    instance: vm3
  serviceAccount: legacy-db-sa
  network: vm-network
```

### Autoregistration

If you used the `--autoregister` flag when generating VM bootstrap files, WorkloadEntries are created automatically when the VM's sidecar connects to Istiod. This is the easier approach for dynamic environments:

```bash
istioctl x workload entry configure \
  --name legacy-db \
  --namespace vm-apps \
  --serviceAccount legacy-db-sa \
  --clusterID cluster1 \
  --output /tmp/vm-config \
  --autoregister
```

When the VM starts its sidecar, Istiod creates the WorkloadEntry automatically. When the sidecar disconnects (VM shuts down), the WorkloadEntry gets a health status update.

Check autoregistered entries:

```bash
kubectl get workloadentries -n vm-apps
```

## Creating a ServiceEntry for VM Workloads

A ServiceEntry groups your WorkloadEntries into a discoverable service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: legacy-db
  namespace: vm-apps
spec:
  hosts:
  - legacy-db.vm-apps.svc.cluster.local
  location: MESH_INTERNAL
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: STATIC
  workloadSelector:
    labels:
      app: legacy-db
```

Key fields:

- **hosts**: The DNS name other services use to reach this service. Using the `svc.cluster.local` format makes it behave like a Kubernetes service.
- **location: MESH_INTERNAL**: Tells Istio this service is part of the mesh and should get mTLS.
- **resolution: STATIC**: Endpoints come from WorkloadEntries (static IPs).
- **workloadSelector**: Selects WorkloadEntries by label, just like a Service selects Pods.

## Using a Kubernetes Service Instead

Alternatively, you can skip ServiceEntry and use a regular Kubernetes Service with no selector. The WorkloadEntries still serve as the endpoints:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-db
  namespace: vm-apps
spec:
  ports:
  - port: 5432
    name: tcp-postgres
    targetPort: 5432
```

With a selector-less Service, Istio uses the WorkloadEntries in the same namespace that match the service's labels. This approach is simpler and works well for services that you want to look exactly like Kubernetes services.

## ServiceEntry for External VMs (Not in Mesh)

If you have VMs that are NOT part of the mesh (no sidecar installed), use a ServiceEntry with explicit endpoints:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-legacy-api
  namespace: default
spec:
  hosts:
  - legacy-api.internal.example.com
  location: MESH_EXTERNAL
  ports:
  - number: 8443
    name: https
    protocol: HTTPS
  resolution: STATIC
  endpoints:
  - address: 10.0.2.50
    ports:
      https: 8443
  - address: 10.0.2.51
    ports:
      https: 8443
```

Note the differences:
- **location: MESH_EXTERNAL** - the service is outside the mesh, so no mTLS
- **endpoints** instead of **workloadSelector** - explicit IP addresses since there are no WorkloadEntries

## Combining VM and Kubernetes Endpoints

A powerful pattern is having a service with endpoints in both Kubernetes and VMs. For example, during a migration from VMs to Kubernetes:

```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: payments
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payment-service
  template:
    metadata:
      labels:
        app: payment-service
    spec:
      containers:
      - name: payment
        image: payment-service:v2
        ports:
        - containerPort: 8080
---
# VM WorkloadEntry
apiVersion: networking.istio.io/v1beta1
kind: WorkloadEntry
metadata:
  name: payment-vm
  namespace: payments
spec:
  address: 10.0.3.20
  labels:
    app: payment-service
    version: v1
  serviceAccount: payment-sa
  network: vm-network
---
# Service selecting both
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: payments
spec:
  ports:
  - port: 8080
    name: http
  selector:
    app: payment-service
```

Istio will load balance across both Kubernetes pods and the VM. You can use VirtualService routing to gradually shift traffic from the VM (v1) to Kubernetes (v2):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-migration
  namespace: payments
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
        subset: kubernetes
      weight: 80
    - destination:
        host: payment-service
        subset: vm
      weight: 20
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service
  namespace: payments
spec:
  host: payment-service
  subsets:
  - name: kubernetes
    labels:
      version: v2
  - name: vm
    labels:
      version: v1
```

## Health Checking VM WorkloadEntries

You can configure health probes in the WorkloadGroup:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: WorkloadGroup
metadata:
  name: legacy-db
  namespace: vm-apps
spec:
  template:
    serviceAccount: legacy-db-sa
    network: vm-network
  probe:
    httpGet:
      port: 8080
      path: /healthz
    initialDelaySeconds: 10
    periodSeconds: 15
    failureThreshold: 3
```

Istiod periodically probes the VM workload and marks unhealthy WorkloadEntries so traffic is not routed to them.

## Troubleshooting

**Service not discoverable**: Make sure the ServiceEntry host matches what clients use, and the workloadSelector labels match the WorkloadEntry labels:

```bash
kubectl get workloadentries -n vm-apps --show-labels
kubectl get serviceentries -n vm-apps -o yaml
```

**Traffic not routed to VM**: Check that the VM's sidecar is connected and SYNCED:

```bash
istioctl proxy-status | grep legacy-db
```

**DNS resolution fails**: If using `svc.cluster.local` hostnames for ServiceEntries, make sure DNS proxying is enabled or create a stub Service.

## Summary

ServiceEntry and WorkloadEntry are the resources that bring VM workloads into the Istio service mesh. WorkloadEntries represent individual VM instances, and ServiceEntries (or selector-less Kubernetes Services) group them into logical services. With autoregistration, WorkloadEntries are created automatically when the VM sidecar connects. The combination of these resources lets you mix VM and Kubernetes backends, do weighted traffic shifting for migrations, and apply the same traffic management policies to VMs as you do to Kubernetes workloads.
