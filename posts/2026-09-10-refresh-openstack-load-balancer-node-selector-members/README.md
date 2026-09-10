# How to Refresh OpenStack Load Balancer Members After Label Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenStack, Load Balancing, Networking, Troubleshooting

Description: Update OCCM backend node selection safely, trigger reconciliation when custom label changes are not noticed, and verify the actual Octavia pool members.

---

Changing a node label can make the node match an OpenStack load balancer selector without immediately changing Octavia's member list. The selector describes eligibility; the controller still needs an event that causes it to evaluate that eligibility again.

This distinction matters when moving ingress traffic between node groups. A successful `kubectl label` command proves the Node object changed, but it does not prove the external load balancer has started using the new group.

## Separate the two selectors

A Service's ordinary `spec.selector` selects application pods. OCCM's `loadbalancer.openstack.org/node-selector` annotation filters nodes eligible to become load balancer backends. They operate at different layers.

For example:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: production
  annotations:
    loadbalancer.openstack.org/node-selector: "ingress-pool=public"
spec:
  type: LoadBalancer
  selector:
    app: web
  ports:
    - name: http
      port: 80
      targetPort: 8080
      protocol: TCP
```

The application pods need `app: web`; the intended backend nodes need `ingress-pool=public`. Adding the node label to pods will not select additional load balancer members.

The [OCCM annotation reference](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/expose-applications-using-loadbalancer-type-service.md#service-annotations) documents a comma-separated set of key/value filters and key-existence checks. Do not assume this provider-specific parser supports every expression accepted by Kubernetes' full set-based selector syntax.

## Compare desired and observed membership

Read the Service's annotation and list matching nodes:

```bash
kubectl -n production get service web \
  -o jsonpath='{.metadata.annotations.loadbalancer\.openstack\.org/node-selector}{"\n"}'
kubectl get nodes -l ingress-pool=public -o wide
kubectl get nodes -L ingress-pool,node.kubernetes.io/exclude-from-external-load-balancers
```

Check readiness, provider IDs, addresses, and the standard exclusion label. OCCM receives nodes after the Kubernetes service controller applies its own eligibility rules, then applies the provider selector. Matching the custom label does not override a global exclusion.

Compare that desired set with Octavia:

```bash
kubectl -n production get service web \
  -o jsonpath='{.metadata.annotations.loadbalancer\.openstack\.org/load-balancer-id}{"\n"}'
openstack loadbalancer pool list --loadbalancer LOAD_BALANCER_ID
openstack loadbalancer member list POOL_ID
```

Use node addresses and member names to map the observed pool back to Kubernetes. Record the initial list so you can tell whether a later controller event actually changes it.

## Make the label change and request reconciliation

Label the additional node only after confirming that it can serve the relevant NodePort and pass health checks:

```bash
kubectl label node worker-3 ingress-pool=public --overwrite
```

Custom Node label changes do not necessarily trigger the standard service controller's node synchronization path. The [OCCM configuration guide](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md#load-balancer) explicitly describes this limitation.

A targeted way to re-evaluate one Service is to change a harmless annotation:

```bash
kubectl -n production annotate service web \
  operations.example.com/backend-refresh=pool-change-2026-09-10 --overwrite
```

Use a value different from the previous one and an annotation domain your organization owns. The [standard service controller](https://github.com/kubernetes/kubernetes/blob/v1.34.0/staging/src/k8s.io/cloud-provider/controllers/service/controller.go) treats an annotation change as a reason to update a LoadBalancer Service. Reapplying identical YAML may produce no relevant event.

If the provider selector itself is changing, apply the new selector annotation directly. That is already a Service annotation update; an additional refresh annotation is usually unnecessary.

## Treat the exclusion-label workaround as version-sensitive

OCCM's documentation also describes using `node.kubernetes.io/exclude-from-external-load-balancers=false` to stimulate node reconciliation. The meaning of the false value changed in Kubernetes v1.34: older service-controller implementations can exclude a node based on the label's presence, even when its value is `false`.

For that reason, the Service annotation refresh is easier to scope to one load balancer. Do not add a false exclusion label across an older cluster without checking the Kubernetes cloud-provider library bundled into your CCM image. The API server version alone does not establish the behavior of an independently versioned controller binary.

If a node is intentionally excluded with the standard label, do not remove that protection merely to force an update. First decide whether it should join external load balancers at all.

## Move traffic in a controlled order

When replacing a node group, add the new eligible nodes and reconcile first. Wait until their Octavia members are healthy and application requests succeed. Then remove the old nodes' selector labels and reconcile again:

```bash
kubectl label node worker-old ingress-pool-
kubectl -n production annotate service web \
  operations.example.com/backend-refresh=old-pool-removed-2026-09-10 --overwrite
```

For `externalTrafficPolicy: Local`, place ready application endpoints on the new backend nodes before expecting their health checks to pass. Merely adding nodes to the pool cannot create local pods.

Inspect every relevant pool after the change, since a multiport Service can have multiple listeners and pools. Ensure removed nodes disappear and new members become healthy. Keep watching application latency and errors through the transition rather than treating the first successful request as proof that all members work.

## Conclusion

Node labels determine the desired backend set, while controller events determine when it is applied. Update the intended nodes, trigger a scoped Service reconciliation where necessary, and verify Octavia's members before removing the old traffic path.

## Official Documentation

- [OCCM node selectors and refresh caveat](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/docs/openstack-cloud-controller-manager/using-openstack-cloud-controller-manager.md#load-balancer)
- [Kubernetes v1.34 service controller predicates](https://github.com/kubernetes/kubernetes/blob/v1.34.0/staging/src/k8s.io/cloud-provider/controllers/service/controller.go)
- [Kubernetes external load balancer exclusion label](https://kubernetes.io/docs/reference/labels-annotations-taints/#node-kubernetes-io-exclude-from-external-load-balancers)
