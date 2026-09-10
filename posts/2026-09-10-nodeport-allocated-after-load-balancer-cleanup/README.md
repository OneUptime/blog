# How to Diagnose NodePort Allocation After Load Balancer Cleanup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cloud, Load Balancing, Networking, Troubleshooting

Description: Find the Kubernetes Service still holding a NodePort after cloud load balancer cleanup and distinguish finalizer delays from allocator problems.

---

Deleting a cloud load balancer does not release a Kubernetes NodePort. The port belongs to the Kubernetes Service allocation, while the external load balancer belongs to the cloud provider. Confusing those two lifecycles commonly produces a replacement Service that fails with `provided port is already allocated` even though the cloud console looks empty.

The useful first question is which Kubernetes object still owns the requested port. Work outward from that object before investigating allocator corruption or deleting more cloud resources.

## Record the exact port and Service state

Get the full API error from the failed apply operation. A standard LoadBalancer Service normally receives NodePorts for forwarding to nodes, and a Service using `externalTrafficPolicy: Local` can also have a `healthCheckNodePort`.

Read the existing object, if any:

```bash
kubectl -n production get service web -o json | jq '{
  uid: .metadata.uid,
  deleting: .metadata.deletionTimestamp,
  finalizers: .metadata.finalizers,
  type: .spec.type,
  ports: .spec.ports,
  healthCheckNodePort: .spec.healthCheckNodePort,
  loadBalancer: .status.loadBalancer
}'
```

The Service UID helps distinguish an old object from a recreated one with the same name. A deletion timestamp means Kubernetes accepted the delete request, not that deletion has finished.

The [Service documentation](https://kubernetes.io/docs/concepts/services-networking/service/#type-nodeport) describes explicit NodePort allocation and rejection when a requested port conflicts. This allocation is cluster-wide, so inspecting only the application's namespace can miss the owner.

## Search both ordinary and health-check allocations

Use a cluster-wide read with the conflicting port substituted below:

```bash
kubectl get services --all-namespaces -o json | jq --argjson port 32080 '
  .items[]
  | select(
      any(.spec.ports[]?; .nodePort == $port) or
      .spec.healthCheckNodePort == $port
    )
  | {
      namespace: .metadata.namespace,
      name: .metadata.name,
      uid: .metadata.uid,
      deleting: .metadata.deletionTimestamp,
      finalizers: .metadata.finalizers,
      ports: .spec.ports,
      healthCheckNodePort: .spec.healthCheckNodePort
    }'
```

This query deliberately includes terminating Services. An old release can remain in that state after a cloud API outage, preventing a new release from reusing its explicit NodePort.

If the owner is an unrelated active Service, the allocation is valid. Choose another port, or remove the explicit `nodePort` from the new Service and let Kubernetes allocate one. When the external load balancer is managed by a controller, clients generally depend on the load balancer's frontend port, not a particular backend NodePort.

Review Helm values, generated manifests, and GitOps history too. Reusing a fixed NodePort across blue and green releases in different namespaces still causes a conflict. The namespaces do not partition the allocation range.

## Let cloud cleanup finish through its controller

A Service with `service.kubernetes.io/load-balancer-cleanup` is protected until its controller finishes removing the associated load balancer. The [external load balancer guide](https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/#garbage-collecting-load-balancers) documents this finalizer.

Inspect the terminating Service and its controller:

```bash
kubectl -n production describe service web
kubectl -n kube-system get deployments,daemonsets,pods
kubectl -n kube-system logs pod/CLOUD_CONTROLLER_POD --since=30m
```

Typical blockers include lost cloud credentials, Kubernetes RBAC failures, an unreachable cloud API, a cloud resource stuck deleting, or a controller that is no longer running. Restore the failing dependency and let reconciliation complete.

If someone already removed the load balancer directly through the cloud API, the controller still needs to observe the resulting state and complete the Service lifecycle. It may also manage listeners, security groups, or other related resources. A missing top-level load balancer alone is insufficient evidence that all cleanup obligations are complete.

After reconciliation succeeds, wait for the actual Kubernetes object to disappear:

```bash
kubectl -n production wait --for=delete service/web --timeout=180s
```

A timeout here is evidence to continue diagnosing deletion. Do not interpret it as permission to strip every finalizer from the object. Removing a finalizer is a recovery procedure only after ownership and remaining cloud resources have been explicitly accounted for.

## Investigate an allocation with no visible owner

If the all-namespace query returns nothing, first verify that you have permission to list every Service and that the error came from the same cluster context:

```bash
kubectl config current-context
kubectl auth can-i list services --all-namespaces
kubectl get services --all-namespaces
```

Repeat the read after any concurrent rollout settles. A controller may have recreated the Service between your earlier read and apply request. Inspect admission responses and the complete rendered manifest for another fixed port, including a health-check port, rather than relying on a shortened deployment log.

A persistent reservation with no corresponding Service can require control-plane investigation of the Service port allocator and its repair loop. Gather timestamps, API server version, audit evidence, and the exact rejected manifest for the cluster operator. Directly editing etcd allocation records is not a routine application-level fix.

Finally, setting `allocateLoadBalancerNodePorts: false` is appropriate only for a load balancer implementation that supports routing without NodePorts. Kubernetes documents that changing this field on an existing Service does not automatically remove existing `nodePort` fields. It is not a general cleanup switch.

## Conclusion

A NodePort becomes reusable when Kubernetes releases its Service allocation. Identify the owning Service, resolve any controller cleanup failure, and verify deletion before retrying a replacement that requires the same port.

## Official Documentation

- [Kubernetes Service and NodePort allocation](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Load balancer cleanup finalizers](https://kubernetes.io/docs/tasks/access-application-cluster/create-external-load-balancer/#garbage-collecting-load-balancers)
- [Kubernetes finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
