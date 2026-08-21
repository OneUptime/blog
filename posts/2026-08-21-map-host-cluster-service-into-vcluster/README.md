# How to Map a Host Service into a vCluster Without Duplicating Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Service, Networking, Service Discovery

Description: Replicate a control-plane-cluster Service into a vCluster so tenant workloads can use normal Kubernetes DNS without copying the backend.

---

A shared database proxy, message broker, license server, or internal API may already run in the control plane cluster. Deploying a second copy inside every vCluster wastes capacity and creates another lifecycle to manage. vCluster's service replication creates a tenant-visible Service that points to the existing host Service.

This guide targets vCluster **0.36** with a container control plane on shared nodes. The feature is called `networking.replicateServices`; it is different from the default tenant-to-host Service sync used by tenant workloads.

## Understand What Is Replicated

Given this configuration:

```text
control plane: shared-services/postgres-proxy
                         |
                  service replication
                         v
tenant: platform-services/database
```

vCluster creates and maintains the tenant-side Service. The backing workload remains in `shared-services` on the control plane cluster. Tenant Pods call `database.platform-services.svc.cluster.local` as if it were an ordinary Service in their own cluster.

This does not copy Deployments, Pods, Secrets, NetworkPolicies, or credentials. It also does not bypass the host CNI: network policy and routing must allow the real traffic path.

## Check the Host Service First

Use the control plane cluster context:

```bash
kubectl get service postgres-proxy -n shared-services -o yaml
kubectl get endpointslice -n shared-services \
  -l kubernetes.io/service-name=postgres-proxy
```

Confirm the Service has the port tenants should use and at least one ready endpoint. Replicating a Service with no endpoints produces a valid-looking tenant object that still cannot connect.

For this example, assume the host Service exposes PostgreSQL on port 5432.

## Configure Host-to-Tenant Service Replication

Create `vcluster.yaml`:

```yaml
networking:
  replicateServices:
    fromHost:
      - from: shared-services/postgres-proxy
        to: platform-services/database
```

The `from` value is `host-namespace/host-service`. The `to` value is `tenant-namespace/tenant-service`. Using explicit namespaces makes the ownership clear and avoids relying on defaults.

Apply the configuration:

```bash
vcluster create team-a \
  --namespace team-a-vcluster \
  --upgrade \
  --connect=false \
  --values vcluster.yaml
```

When vCluster reconciles the mapping, it creates the target namespace and Service as needed. Treat that Service as controller-owned. If the mapping is removed, a `fromHost` replicated Service is automatically removed from the tenant cluster.

## Verify from the Tenant Cluster

Connect to the tenant and inspect the replicated object:

```bash
kubectl get service database -n platform-services -o yaml
kubectl get endpointslice -n platform-services \
  -l kubernetes.io/service-name=database
kubectl describe service database -n platform-services
```

Run a short DNS and TCP test:

```bash
kubectl run network-test \
  --namespace default \
  --image=busybox:1.37 \
  --restart=Never \
  --command -- sh -c '
    nslookup database.platform-services.svc.cluster.local
    nc -vz database.platform-services.svc.cluster.local 5432
  '

kubectl logs network-test
kubectl delete pod network-test
```

Use a pinned internal diagnostic image in restricted or air-gapped environments. A successful TCP connection verifies routing, not database authentication.

## Allow the Traffic Deliberately

If vCluster-managed network isolation is enabled, add only the necessary host destination. The official service replication example supports adding workload egress rules under `policies.networkPolicy`:

```yaml
policies:
  networkPolicy:
    enabled: true
    workload:
      publicEgress:
        enabled: false
      egress:
        - to:
            - namespaceSelector:
                matchLabels:
                  kubernetes.io/metadata.name: shared-services
          ports:
            - protocol: TCP
              port: 5432
```

Also inspect NetworkPolicies governing the real backend Pods in `shared-services`. Kubernetes policies are additive and enforced by the control plane cluster CNI; both source egress and destination ingress may need an allow rule.

Do not use a broad CIDR allow merely to make the test pass. Namespace and Pod selectors make the intended dependency visible, although your CNI's exact cross-namespace behavior should be tested.

## Handle DNS and Application Configuration

Give applications the tenant name, not the host namespace:

```yaml
env:
  - name: DATABASE_HOST
    value: database.platform-services.svc.cluster.local
  - name: DATABASE_PORT
    value: "5432"
```

Keep credentials separate. Sync only a narrowly scoped Secret if the application needs one, or use an external secret provider. Service replication exposes connectivity; it does not grant application-level authorization.

## Troubleshoot by Following the Chain

1. Verify host Service and EndpointSlices.
2. Confirm the `fromHost` mapping is present in the installed vCluster configuration.
3. Verify the tenant Service and EndpointSlices.
4. Test tenant DNS.
5. Test the TCP port.
6. Inspect host and vCluster-managed NetworkPolicies.
7. Only then debug the application protocol, TLS, or credentials.

If the tenant Service never appears, check the vCluster control-plane logs and RBAC for reading the source namespace. Mapping a Service from a namespace outside the vCluster release namespace requires the vCluster control plane to have the relevant host permissions.

Be careful with reverse replication. `networking.replicateServices.toHost` exposes a tenant Service to the control plane cluster and has different cleanup behavior: removing a `toHost` mapping does not automatically delete the host Service according to the vCluster documentation.

## Official Documentation

- [vCluster: Replicate networking services](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/networking/replicate-services)
- [vCluster: Networking configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/networking/)
- [vCluster: Network policy configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/policies/network-policy)
- [Kubernetes: Service discovery](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes: NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)

## Conclusion

Use `networking.replicateServices.fromHost` to give a host Service a stable tenant-local name while leaving its workload under platform ownership. Validate endpoints at both sides, permit the real CNI traffic path, and manage credentials independently so connectivity does not become accidental authorization.
