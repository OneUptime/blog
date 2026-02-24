# How to Configure All ServiceEntry Fields in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, External Services, Kubernetes, Service Mesh

Description: Complete guide to every ServiceEntry field in Istio for registering external services, configuring DNS resolution, endpoints, and workload selectors.

---

ServiceEntry is how you bring external services into Istio's internal service registry. Without it, your mesh workloads cannot reach services outside the mesh when outbound traffic is set to REGISTRY_ONLY mode. Even when you allow all outbound traffic, ServiceEntry is still valuable because it lets Istio apply traffic policies, monitoring, and security controls to external calls. This post goes through every field you can configure.

## Top-Level Structure

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - api.external.com
  location: MESH_EXTERNAL
  resolution: DNS
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  exportTo:
    - "."
```

That is the minimal viable ServiceEntry for an external HTTPS service. But there are many more fields available under the spec.

## Hosts

```yaml
spec:
  hosts:
    - api.external.com
    - "*.external.com"
```

The `hosts` field is a list of hostnames associated with this service entry. These are the names your mesh workloads use to reach the service. Wildcards are supported for DNS-based entries. If you use `resolution: NONE`, the hosts are used only for matching, not for DNS.

For HTTP traffic, these hosts are matched against the HTTP Host header. For non-HTTP traffic with TLS, they match against the SNI.

## Addresses

```yaml
spec:
  hosts:
    - external-db
  addresses:
    - 192.168.1.100
    - 10.0.0.0/24
```

The `addresses` field assigns virtual IPs to the service entry. This is useful for TCP services that do not have DNS names, or when you want to give a service a stable IP within the mesh. CIDR notation is supported. If addresses are provided, traffic to those IPs is captured by the sidecar and handled according to the ServiceEntry's configuration.

One common pattern is using addresses for services that share the same port but have different hosts. Without unique addresses, TCP services on the same port would be ambiguous.

## Location

```yaml
spec:
  location: MESH_EXTERNAL
```

Two options:

- `MESH_EXTERNAL` - the service is outside the mesh. mTLS is not expected on the connection, and policies are enforced on the client side.
- `MESH_INTERNAL` - the service is part of the mesh but is not discovered automatically. It is expected to have sidecars and participate in mTLS.

Use `MESH_INTERNAL` when you have services in another cluster that your mesh should treat as internal, or for VMs that have been enrolled in the mesh.

## Ports

```yaml
spec:
  ports:
    - number: 80
      name: http
      protocol: HTTP
      targetPort: 8080
    - number: 443
      name: https
      protocol: HTTPS
    - number: 3306
      name: tcp-mysql
      protocol: TCP
    - number: 27017
      name: mongo
      protocol: MONGO
    - number: 9090
      name: grpc
      protocol: GRPC
```

Each port entry has:

- `number` - the port the service is accessed on
- `name` - a label for the port (must be unique within the ServiceEntry)
- `protocol` - how Envoy processes traffic on this port. Supported values: `HTTP`, `HTTPS`, `HTTP2`, `GRPC`, `MONGO`, `TCP`, `TLS`
- `targetPort` - the actual port on the backend (if different from `number`)

The protocol choice matters a lot. For example, `HTTP` enables Envoy's HTTP filter chain with full routing and observability. `TCP` gives you only L4 handling. `TLS` means Envoy expects TLS on the connection but does not terminate it.

## Resolution

```yaml
spec:
  resolution: DNS
```

The `resolution` field tells Istio how to resolve the service entry's hosts to IP addresses:

- `NONE` - assume the incoming connection already has the correct destination IP. No resolution is done. Good for transparent proxying scenarios.
- `STATIC` - use the IP addresses specified in the `endpoints` section. No DNS lookup.
- `DNS` - perform an asynchronous DNS lookup for the host at connection time.
- `DNS_ROUND_ROBIN` - similar to DNS but returns only one IP at a time from the DNS results, cycling through them.

```yaml
# Static resolution with explicit endpoints
spec:
  hosts:
    - my-database
  resolution: STATIC
  endpoints:
    - address: 192.168.1.10
    - address: 192.168.1.11
```

```yaml
# DNS resolution
spec:
  hosts:
    - api.external.com
  resolution: DNS
```

```yaml
# DNS round robin
spec:
  hosts:
    - multi-ip-service.example.com
  resolution: DNS_ROUND_ROBIN
```

`DNS_ROUND_ROBIN` is useful for services that return multiple A records and you want simple round-robin across them, rather than connecting to all resolved IPs.

## Endpoints

```yaml
spec:
  hosts:
    - my-service
  resolution: STATIC
  endpoints:
    - address: 10.0.0.1
      ports:
        http: 8080
        https: 8443
      labels:
        version: v1
        region: us-west
      locality: us-west1/zone-a
      weight: 80
      network: network-1
      serviceAccount: my-service-sa
    - address: 10.0.0.2
      ports:
        http: 8080
      labels:
        version: v2
      locality: us-east1/zone-b
      weight: 20
      network: network-2
```

Each endpoint has:

- `address` - the IP or hostname of the endpoint. Can be an IP for STATIC resolution, or a hostname for DNS.
- `ports` - a map of port name to port number, overriding the ServiceEntry's port definitions. The keys must match the port names defined in the spec.
- `labels` - arbitrary labels applied to this endpoint. Can be used for subset routing via DestinationRule.
- `locality` - the locality of the endpoint in `region/zone/subzone` format. Used for locality-aware load balancing.
- `weight` - traffic weight for this endpoint relative to others (0-4294967295).
- `network` - identifies the network this endpoint belongs to. Important in multi-cluster/multi-network setups.
- `serviceAccount` - the service account associated with the workload at this endpoint. Used for authorization policies.

## Workload Selector

```yaml
spec:
  hosts:
    - my-vm-service
  workloadSelector:
    labels:
      app: my-vm-app
```

The `workloadSelector` lets you associate Kubernetes-registered workload entries with this ServiceEntry. Instead of listing explicit endpoints, Istio discovers them dynamically based on WorkloadEntry resources that match the labels. This is particularly useful for VM workloads.

Note that `workloadSelector` and `endpoints` are mutually exclusive. You use one or the other.

## SubjectAltNames

```yaml
spec:
  hosts:
    - secure-api.example.com
  subjectAltNames:
    - "spiffe://cluster.local/ns/external/sa/secure-api"
```

The `subjectAltNames` field specifies the expected SANs on the server certificate when connecting with TLS. This is used to validate the identity of the external service.

## Export To

```yaml
spec:
  exportTo:
    - "."
    - "istio-system"
    - "*"
```

Controls which namespaces can see this ServiceEntry:

- `.` means the declaring namespace only
- `*` means all namespaces
- A specific namespace name limits visibility to that namespace

## Complete Examples

### External HTTPS API

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-payment-api
  namespace: payments
spec:
  hosts:
    - api.stripe.com
  location: MESH_EXTERNAL
  resolution: DNS
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  exportTo:
    - "."
```

### On-Premise Database Cluster

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: onprem-database
  namespace: backend
spec:
  hosts:
    - onprem-mysql
  location: MESH_EXTERNAL
  resolution: STATIC
  addresses:
    - 172.16.0.100
    - 172.16.0.101
  ports:
    - number: 3306
      name: tcp-mysql
      protocol: TCP
  endpoints:
    - address: 172.16.0.100
      labels:
        role: primary
      locality: us-west1/zone-a
    - address: 172.16.0.101
      labels:
        role: replica
      locality: us-west1/zone-b
  exportTo:
    - "."
    - "istio-system"
```

### Multi-Cluster Internal Service

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: remote-reviews
  namespace: bookinfo
spec:
  hosts:
    - reviews.bookinfo.global
  location: MESH_INTERNAL
  resolution: DNS
  ports:
    - number: 80
      name: http
      protocol: HTTP
  endpoints:
    - address: reviews.bookinfo.svc.cluster-2.example.com
      locality: us-east1/zone-a
      network: cluster-2
```

ServiceEntry is one of those resources that seems simple at first but has a lot of depth. Whether you are connecting to an external API, integrating on-premise infrastructure, or building a multi-cluster mesh, understanding all the available fields helps you model your service topology accurately and apply the right policies everywhere.
