# Why Deployment Pods Lack Stable DNS and When to Use StatefulSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployment, StatefulSet, Headless Service, Stable DNS, Pod Identity

Description: Understand why a headless Service gives a Deployment a changing address set, then choose StatefulSet when every replica needs a durable DNS identity.

---

A headless Service gives a workload a stable **Service** name, but it does not make the selected Pods stable. For a Deployment named `api`, the name `api.default.svc.cluster.local` can consistently resolve to the currently published ready Pod IPs, subject to DNS caching. The individual Deployment Pods remain replaceable ReplicaSet members with generated names, generated identities, and potentially new IP addresses after every replacement.

That behavior is correct for stateless replicas. A client asks the Service for the current backend set and treats every answer as interchangeable. It becomes a problem only when an application tries to assign durable roles such as `member-0`, `member-1`, or `shard-2` to Deployment Pods.

## See What the Headless Service Actually Stabilizes

Consider a Deployment behind a headless Service:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: default
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: api
  ports:
    - name: http
      port: 8080
      targetPort: http
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: api
    spec:
      containers:
        - name: api
          image: registry.k8s.io/e2e-test-images/agnhost:2.53
          args:
            - netexec
            - --http-port=8080
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:
            tcpSocket:
              port: http
            periodSeconds: 5
~~~

Assuming the default `cluster.local` cluster domain, query the Service name from one of the Deployment Pods. The `agnhost` image includes `dig`, and an A query returns the published IPv4 Pod addresses:

~~~bash
kubectl rollout status deployment/api -n default

kubectl exec -n default deploy/api -- \
  dig +noall +answer api.default.svc.cluster.local. A

kubectl get pods -n default \
  -l app.kubernetes.io/name=api \
  -o 'custom-columns=NAME:.metadata.name,UID:.metadata.uid,IP:.status.podIP'
~~~

Delete one Pod and watch until the Deployment creates a ready replacement. Stop the watch, then compare the identities again:

~~~bash
kubectl delete pod <one-api-pod-name> -n default
kubectl get pods -n default \
  -l app.kubernetes.io/name=api \
  --watch

kubectl get pods -n default \
  -l app.kubernetes.io/name=api \
  -o 'custom-columns=NAME:.metadata.name,UID:.metadata.uid,IP:.status.podIP'
~~~

The Service name remains `api.default.svc.cluster.local`, but the replacement can have a different Pod name, UID, and IP. DNS records follow the new EndpointSlice state, although cached answers can briefly retain an old address; DNS does not preserve the removed Pod's identity.

## Endpoint-Scoped Names Are Not Stateful Identity

CoreDNS can expose endpoint-scoped records beneath a headless Service. When an EndpointSlice has an explicit endpoint `hostname`, that hostname is used. Without one, CoreDNS normally derives an endpoint name from the dashed IP address; with the optional `endpoint_pod_names` directive, it may prefer the targeted Pod's name.

Those records are useful diagnostics, but neither a dashed IP name nor a generated Deployment Pod name is a durable logical identifier. Both can change when the Deployment creates a replacement. Kubernetes defines endpoint-scoped records for headless Services, but does not define the fallback hostname format when an endpoint lacks `hostname`; the dashed-IP and optional Pod-name fallbacks are CoreDNS-specific.

Setting this in a Deployment template does not solve uniqueness:

~~~yaml
spec:
  template:
    spec:
      hostname: api
      subdomain: api
~~~

Every replica is created from the same template, so every replica would request the same hostname. A Deployment has no built-in ordinal substitution for `spec.hostname`. A mutating webhook or custom controller could assign names, but then that controller-not the Deployment or headless Service-is responsible for identity, collision handling, replacement behavior, and DNS consistency.

## Use StatefulSet for Stable Replica Names

StatefulSet preserves a sticky ordinal identity for every replica. The two workload examples are alternatives, so remove the earlier Deployment and its Service before applying the StatefulSet, then connect the StatefulSet to a governing headless Service with `spec.serviceName`:

~~~bash
kubectl delete deployment,service api -n default
~~~

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: api-peers
  namespace: default
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: api
  ports:
    - name: peer
      port: 8080
      targetPort: peer
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: api
  namespace: default
spec:
  serviceName: api-peers
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: api
  template:
    metadata:
      labels:
        app.kubernetes.io/name: api
    spec:
      containers:
        - name: api
          image: registry.k8s.io/e2e-test-images/agnhost:2.53
          args:
            - netexec
            - --http-port=8080
          ports:
            - name: peer
              containerPort: 8080
          readinessProbe:
            tcpSocket:
              port: peer
            periodSeconds: 5
~~~

The controller creates `api-0`, `api-1`, and `api-2`. Their stable service-scoped DNS names, published once each Pod is ready with this Service configuration, are:

~~~text
api-0.api-peers.default.svc.<cluster-domain>
api-1.api-peers.default.svc.<cluster-domain>
api-2.api-peers.default.svc.<cluster-domain>
~~~

If `api-1` is rescheduled, its Pod UID and IP can still change, but the replacement retains the ordinal name `api-1` and the same service-scoped DNS name. This is stable naming, not a promise of a permanent IP.

## Choose the Workload Controller from the Application Contract

Stay with a Deployment when:

- replicas are interchangeable;
- clients can use a regular Service ClusterIP or the changing set returned by a headless Service;
- configuration and data do not bind to a particular replica name;
- rollout flexibility matters more than ordered identity.

Use StatefulSet when:

- peers need predictable ordinal hostnames;
- storage must remain associated with a logical member;
- deployment, scaling, or rolling updates need the default ordering guarantees;
- a protocol stores member identities in cluster metadata.

A headless Service is not itself a reason to use StatefulSet. Stateless clients that can perform client-side discovery may legitimately use a Deployment plus headless Service. Conversely, using StatefulSet solely for a stable name adds sticky identity and, by default, ordered lifecycle behavior that the application must understand.

## Separate Peer Discovery from Client Traffic

Peer protocols often need DNS before readiness. Ordinary clients usually need only ready replicas. Two Services can select the same StatefulSet for different purposes:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: api-peers
  namespace: default
spec:
  clusterIP: None
  publishNotReadyAddresses: true
  selector:
    app.kubernetes.io/name: api
  ports:
    - name: peer
      port: 8080
      targetPort: peer
---
apiVersion: v1
kind: Service
metadata:
  name: api-client
  namespace: default
spec:
  selector:
    app.kubernetes.io/name: api
  ports:
    - name: http
      port: 80
      targetPort: peer
~~~

Use `api-peers` for identity and bootstrap; use `api-client` for readiness-gated client load balancing. Publishing not-ready peer addresses makes discovery possible, but it does not make those peers safe for general traffic.

## Verify the Governing Relationship

~~~bash
kubectl get statefulset api -n default \
  -o jsonpath='{.spec.serviceName}{"\n"}'

kubectl get endpointslice -n default \
  -l kubernetes.io/service-name=api-peers \
  -o yaml

kubectl exec -n default pod/api-0 -- \
  dig +noall +answer api-0.api-peers.default.svc.cluster.local. A
~~~

If the Service-wide lookup works but the ordinal name does not, check that `spec.serviceName` exactly matches the same-namespace headless Service, the selectors match the Pod template labels, and readiness permits publication. A previously cached negative answer can also delay a newly created record for a few seconds.

## Official Documentation

- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Kubernetes StatefulSet stable network identity](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [CoreDNS Kubernetes plugin](https://coredns.io/plugins/kubernetes/)

## Conclusion

A headless Service stabilizes the discovery name for a changing backend set; it does not stabilize Deployment Pods. Keep Deployment when replicas are fungible. Choose StatefulSet, a same-namespace governing headless Service, and ordinal FQDNs when the application's correctness depends on a durable per-replica network identity.
