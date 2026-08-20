# Keep Terminating Pod IPs Out of Headless Service Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Headless Service, Pod Termination, EndpointSlice, DNS Caching, Connection Draining

Description: Combine EndpointSlice conditions, graceful shutdown, readiness-gated discovery, and client retries to survive terminating Pod IPs.

---

Kubernetes marks a terminating Pod's EndpointSlice entry before it removes that entry. With `publishNotReadyAddresses` disabled, the `ready` condition becomes false and ordinary Service consumers normally avoid the endpoint. A headless Service is different because the client receives Pod IPs from DNS and connects directly, without kube-proxy selecting a backend.

Default DNS publication helps, but it cannot recall an IP from a client cache or close an existing connection. Safe rolling updates require cooperation between Kubernetes, DNS, the application, and the client.

## Read All Three Endpoint Conditions

EndpointSlice exposes three related conditions:

- `serving` indicates whether an endpoint is currently able to serve;
- `terminating` indicates that its Pod has a deletion timestamp;
- `ready` is normally equivalent to serving and not terminating.

During graceful Pod deletion, an endpoint can look like this:

~~~yaml
conditions:
  ready: false
  serving: true
  terminating: true
~~~

That means the process can still drain existing work, but it is not a candidate for new connections. A custom EndpointSlice consumer should prefer endpoints that are ready and explicitly exclude `terminating: true`. Do not select an endpoint merely because `serving` remains true.

Inspect the live conditions:

~~~bash
kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=ledger-client-headless \
  -o jsonpath='{range .items[*].endpoints[*]}{.targetRef.name}{"\t"}{.addresses[*]}{"\tready="}{.conditions.ready}{"\tserving="}{.conditions.serving}{"\tterminating="}{.conditions.terminating}{"\n"}{end}'
~~~

API clients must also follow the EndpointSlice API's nil semantics: absent `ready` and `serving` mean true, while absent `terminating` means false. Controller-generated slices usually make the relevant state explicit, but manual slices might not.

## Keep `publishNotReadyAddresses` Off the Client Service

A readiness-gated headless client Service looks like this:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: ledger-client-headless
  namespace: data
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: ledger
  ports:
    - name: client
      protocol: TCP
      port: 8080
      targetPort: client
~~~

Do not set `publishNotReadyAddresses: true` here. That field makes the controller represent endpoints as ready for this Service even when Pods are not ready. It is useful for peer bootstrap but defeats readiness-based filtering for a client discovery name and can keep terminating addresses visible.

If peer bootstrap needs early discovery, create a second headless Service for peers and reserve the readiness-gated name for clients.

## Make Pod Shutdown Long Enough to Drain

The application should stop accepting new work and allow in-flight work to complete within `terminationGracePeriodSeconds`:

~~~yaml
spec:
  terminationGracePeriodSeconds: 60
  containers:
    - name: ledger
      image: example.invalid/ledger:1.0.0
      ports:
        - name: client
          containerPort: 8080
      readinessProbe:
        httpGet:
          path: /ready
          port: client
        periodSeconds: 5
        failureThreshold: 2
      lifecycle:
        preStop:
          exec:
            command:
              - /bin/sh
              - -c
              - /opt/ledger/bin/start-drain && sleep 10
~~~

The image, endpoint, and drain command are placeholders. Implement `start-drain` so repeated calls are safe, new application requests are rejected or redirected appropriately, and existing requests can finish. Size both the short propagation allowance and the total grace period from measurements, not from the example values.

Pod shutdown and EndpointSlice updates happen concurrently. A `preStop` sleep alone is not proof that every cache has expired, and an overly long hook consumes the same grace period available to the process. The application must also handle the container's configured stop signal (`SIGTERM` by default) and stop before the grace period ends.

## Design DNS Clients for Membership Changes

A correct headless-Service client treats every DNS answer as a temporary endpoint set:

1. resolve the complete A and AAAA RRsets;
2. select a candidate rather than always taking the first address;
3. connect with a bounded timeout;
4. on a connection failure, try a different address from the current set;
5. re-resolve after failures and at a TTL-aware interval;
6. remove failed or absent endpoints from new connection pools;
7. drain, then close, existing pooled connections according to application policy.

DNS record expiry does not close TCP, HTTP/2, gRPC, or database connections. A pool can use a deleted Pod IP long after the resolver has fresh data unless it has maximum connection age, idle eviction, failure detection, or an application-level drain signal.

Retries must be safe. Preserve request deadlines and idempotency keys, avoid retrying non-repeatable operations blindly, and cap attempts so a rollout does not become a retry storm.

## Distinguish DNS Lag from Endpoint Lag

Watch the API and DNS at the same time during a controlled deletion:

~~~bash
kubectl -n data delete pod ledger-1 --wait=false

watch -n 1 'kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=ledger-client-headless -o yaml'
~~~

From a separate DNS toolbox Pod:

~~~bash
while true; do
  date -Is
  dig +noall +answer ledger-client-headless.data.svc.cluster.local. A
  sleep 1
done
~~~

Interpret the boundary:

- if the EndpointSlice still reports the old state, investigate controller and API propagation;
- if the slice changed but CoreDNS still answers with the address, inspect CoreDNS and node-local caches;
- if DNS is fresh but the application still connects to the old IP, inspect its resolver and connection pool;
- if the connection was already open, DNS is no longer involved.

Do not use this one-second loop as permanent monitoring. High-frequency polling can overload cluster DNS.

## Do Not Rely on kube-proxy Termination Behavior

Kubernetes has special proxy behavior for some terminating endpoints of `NodePort` and `LoadBalancer` Services with local traffic policy. That does not make a headless Service a proxy. Headless clients connect to the returned Pod IP themselves, so client selection and draining remain application responsibilities.

If you want Kubernetes to choose a ready backend for ordinary client connections, use a separate ClusterIP Service. Keep headless DNS for cases that genuinely require individual endpoint identity.

## Test the Full Rollout Window

In a staging cluster, repeatedly roll or delete one Pod while generating both short and long-lived traffic. Verify:

- the endpoint becomes `terminating: true` and `ready: false`;
- new DNS answers stop publishing it when client discovery is readiness-gated;
- clients move new connections to other addresses;
- old connections finish or fail within a documented bound;
- forced termination after the grace period does not corrupt requests;
- negative and positive caches converge when the replacement appears;
- retry volume stays bounded.

Also test a rollout while one other replica is unhealthy. A design that succeeds only with every spare replica ready has little failure margin.

## Official Documentation

- [Kubernetes EndpointSlice conditions](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#conditions)
- [Kubernetes Pod lifecycle and termination](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)
- [Kubernetes Pod and endpoint termination flow](https://kubernetes.io/docs/tutorials/services/pods-and-endpoint-termination-flow/)
- [Kubernetes DNS records for headless Services](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes virtual IPs and terminating endpoints](https://kubernetes.io/docs/reference/networking/virtual-ips/#traffic-to-terminating-endpoints)

## Conclusion

Keep client discovery readiness-gated, exclude terminating endpoints when consuming EndpointSlices, and give applications time to drain. Because a headless Service returns direct Pod IPs, clients must refresh membership, rotate connection pools, and retry safely. DNS removal alone cannot protect traffic already cached or connected.
