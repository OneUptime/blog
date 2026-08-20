# Point a Selectorless Headless Service at an External IP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Selectorless Service, Headless Service, EndpointSlice, External IP, CoreDNS

Description: Publish a reachable non-Pod IP through Kubernetes DNS with a selectorless headless Service and a manually managed EndpointSlice.

---

To give an external IP a Kubernetes Service DNS name without proxying through a ClusterIP, create two objects in the same namespace:

1. a headless Service with no selector;
2. an EndpointSlice labeled with that Service's name.

The control plane does not create EndpointSlices for a selectorless Service. You or a controller own the addresses, health state, updates, and cleanup.

## Create the Service and EndpointSlice

This example publishes a database reachable at `10.50.0.25:5432`:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: external-db
  namespace: data
spec:
  clusterIP: None
  ports:
    - name: postgres
      protocol: TCP
      port: 5432
      targetPort: 5432
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: external-db-manual-ipv4
  namespace: data
  labels:
    kubernetes.io/service-name: external-db
    endpointslice.kubernetes.io/managed-by: cluster-admins
addressType: IPv4
ports:
  - name: postgres
    protocol: TCP
    port: 5432
endpoints:
  - addresses:
      - 10.50.0.25
    conditions:
      ready: true
    hostname: primary
~~~

There is deliberately no `spec.selector`. Adding one delegates EndpointSlice management to the Kubernetes controller and can conflict with manually managed discovery.

For a headless Service without a selector, Kubernetes requires Service `port` to equal `targetPort`. The EndpointSlice port is the port at the actual endpoint. Keep the Service port name and EndpointSlice port name aligned so SRV discovery also works.

## Use the Required Association Labels

CoreDNS and other consumers find all slices for a Service through:

~~~yaml
kubernetes.io/service-name: external-db
~~~

The label value must exactly match the Service name, and both objects must be in the same namespace.

Manually authored slices should also identify their manager:

~~~yaml
endpointslice.kubernetes.io/managed-by: cluster-admins
~~~

Use a stable value that identifies the human process, operator, or controller responsible for updates. Do not use the reserved control-plane manager identity or a vague value that invites another reconciler to modify the same slice.

An owner reference is optional for manual management. If an automation adds one, it must use the real Service UID rather than a copied placeholder. Decide deliberately whether deleting the Service should garbage-collect the slice.

## Choose a Valid, Reachable Address

The EndpointSlice `addressType` must match every address in that object. Use a separate slice with `addressType: IPv6` for IPv6 addresses.

Endpoint addresses must not be loopback or link-local addresses, and they must not be another Kubernetes Service's ClusterIP. Most importantly, the address must be routable from the client Pods. Creating DNS data does not create routes, VPNs, firewall rules, NAT, or cloud security-group access.

Test connectivity from a representative Pod before declaring the endpoint ready:

~~~bash
kubectl -n data run network-test --rm -it --restart=Never \
  --image=busybox:1.36.1 \
  --command -- \
  nc -vz -w 3 10.50.0.25 5432
~~~

NetworkPolicy behavior for traffic to external IPs depends on the policy and CNI implementation. Verify egress policy with the deployed plugin.

## Apply and Verify Discovery

Ensure that the `data` namespace exists. Save both resources in `external-db.yaml`, then apply them:

~~~bash
kubectl apply -f external-db.yaml

kubectl -n data get service external-db -o wide
kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=external-db -o yaml
~~~

Assuming the cluster uses the common `cluster.local` DNS domain, query the Service record from inside the cluster. If your cluster uses a different domain, replace that suffix in the following queries:

~~~bash
dig +noall +answer external-db.data.svc.cluster.local. A
~~~

It should return the ready EndpointSlice address, `10.50.0.25`, rather than a ClusterIP.

Because the endpoint has `hostname: primary`, CoreDNS can also publish an endpoint-specific name:

~~~bash
dig +noall +answer primary.external-db.data.svc.cluster.local. A
~~~

The named port produces an SRV query path:

~~~bash
dig +noall +answer \
  _postgres._tcp.external-db.data.svc.cluster.local. SRV
~~~

The SRV answer provides the endpoint target and port. Clients that query only A records must already know to connect on port 5432.

## Manage Health Yourself

Kubernetes has no Pod readiness probe for an external address. In a manually managed EndpointSlice, `conditions.ready` is your health assertion.

A production controller should:

- check health using a protocol-specific signal;
- use timeouts and failure thresholds to avoid rapid flapping;
- set `ready: false` before planned maintenance;
- update addresses when the external system fails over;
- preserve a last-known-good state only under an explicit policy;
- expose reconciliation and health-check metrics;
- use leader election or another single-writer mechanism.

The EndpointSlice API interprets an omitted `ready` value as true. Set it explicitly so an incomplete manifest does not accidentally publish an unhealthy address.

For planned replacement, add the new healthy address as a separate `endpoints` entry, wait for DNS and client convergence, then mark or remove the old endpoint. Clients still need bounded retries because DNS and connection pools can retain the previous IP.

## Use Multiple Slices When Needed

All endpoints in one EndpointSlice share its address family and port set. Use distinct slices for:

- IPv4 and IPv6 addresses;
- endpoints that listen on different ports;
- separately managed endpoint groups.

Consumers join every slice carrying the matching Service label. Never fetch one guessed slice name and assume it is the complete backend set.

## Understand the Security Boundary

Kubernetes intentionally prevents API-server proxying to selectorless Service endpoints that are not mapped to Pods. Commands such as `kubectl port-forward service/external-db ...` fail for this case. This prevents the API server from becoming an authorization bypass to arbitrary IPs.

That restriction does not block ordinary Pod network traffic. Control access with external firewall rules, Kubernetes egress policy where supported, database authentication, and transport encryption. A Service DNS name is not an identity or trust guarantee.

## Prefer EndpointSlice over Legacy Endpoints

The legacy Endpoints API is deprecated and lacks EndpointSlice features such as dual-stack grouping and explicit conditions. Create EndpointSlices directly for new selectorless integrations.

Do not use `type: ExternalName` with a numeric IP string as a shortcut. Kubernetes treats `externalName` as a DNS name and returns a CNAME; IP-looking values do not become A records. ExternalName is appropriate when the target is a hostname and its HTTP Host or TLS name implications are acceptable.

## Official Documentation

- [Kubernetes Services without selectors and custom EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/service/#services-without-selectors)
- [Kubernetes headless Services without selectors](https://kubernetes.io/docs/concepts/services-networking/service/#without-selectors)
- [Kubernetes EndpointSlice API and management labels](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes EndpointSlice v1 reference](https://kubernetes.io/docs/reference/kubernetes-api/service-resources/endpoint-slice-v1/)
- [Kubernetes ExternalName Service caveats](https://kubernetes.io/docs/concepts/services-networking/service/#externalname)

## Conclusion

A selectorless headless Service plus a manually managed EndpointSlice publishes a reachable external IP through cluster DNS without a virtual IP or platform proxy. Match namespace, Service label, port name, port number, and address family exactly, then own health, routing, security, updates, and cleanup as part of the external integration.
