# How to Reach Headless Services Across Namespaces with an FQDN

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Headless Service, Namespace, DNS, FQDN, CoreDNS

Description: Address a headless Service and its individual endpoints from another namespace without relying on the caller's DNS search path.

---

Kubernetes resolves an unqualified Service name in the caller Pod's namespace. If a Pod in `frontend` asks for `database`, the resolver normally expands that name to `database.frontend.svc.<cluster-domain>`. It does not search every namespace for a Service with that name.

To reach a headless Service in `data`, include the Service's namespace:

~~~text
database.data.svc.<cluster-domain>
~~~

To reach a particular endpoint that has a stable hostname, put that hostname in front:

~~~text
database-0.database.data.svc.<cluster-domain>
~~~

With the conventional cluster domain, the absolute names are `database.data.svc.cluster.local.` and `database-0.database.data.svc.cluster.local.`. The final dot makes each name absolute and prevents a resolver from appending its search suffixes.

## Create a Stable Service Domain

A StatefulSet plus its governing headless Service is the usual way to give each replica a durable DNS identity:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: database
  namespace: data
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: database
  ports:
    - name: client
      port: 5432
      targetPort: client
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  namespace: data
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: database
  template:
    metadata:
      labels:
        app.kubernetes.io/name: database
    spec:
      containers:
        - name: database
          image: postgres:17
          env:
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: password
          ports:
            - name: client
              containerPort: 5432
          readinessProbe:
            tcpSocket:
              port: client
            periodSeconds: 5
~~~

Ensure the `data` and `frontend` namespaces exist, and create `database-credentials` with a `password` key in `data` through your normal secret-management workflow before applying the example. A production PostgreSQL readiness probe should use a database-aware check such as `pg_isready`; the TCP probe here keeps the networking example focused. This DNS-focused manifest does not configure PostgreSQL replication or persistent storage.

The StatefulSet sets each Pod's hostname from its name and sets its subdomain from `spec.serviceName`. The resulting endpoint names are:

~~~text
database-0.database.data.svc.<cluster-domain>
database-1.database.data.svc.<cluster-domain>
database-2.database.data.svc.<cluster-domain>
~~~

The Service-level name `database.data.svc.<cluster-domain>` returns the ready address set. Use it when the application makes members interchangeable and any ready member is acceptable. Use an endpoint-specific name only when the protocol requires a particular ordinal, such as a known leader, bootstrap member, or shard.

## Query from Another Namespace

Start a DNS test Pod in `frontend` and keep it running long enough to inspect its configuration:

~~~bash
kubectl -n frontend run dnsutils \
  --image=registry.k8s.io/e2e-test-images/agnhost:2.53 \
  --restart=Never

kubectl -n frontend wait --for=condition=Ready pod/dnsutils --timeout=60s
kubectl -n frontend exec dnsutils -- cat /etc/resolv.conf
~~~

Now compare the names:

~~~bash
# Looks in frontend and should not find the data namespace Service.
kubectl -n frontend exec dnsutils -- \
  dig +search +noall +answer database A

# In a typical Linux ClusterFirst Pod, this relative name works through the search list.
kubectl -n frontend exec dnsutils -- \
  dig +search +noall +answer database.data A

# The absolute Service FQDN does not depend on search expansion.
kubectl -n frontend exec dnsutils -- \
  dig +noall +answer database.data.svc.cluster.local. A

# Address one StatefulSet member directly.
kubectl -n frontend exec dnsutils -- \
  dig +noall +answer database-0.database.data.svc.cluster.local. A
~~~

Replace `cluster.local` with the configured cluster domain. These commands query IPv4 `A` records; query `AAAA` on an IPv6-only cluster, or query both types for a dual-stack Service. `database.data` is a convenient relative name in a typical Linux `ClusterFirst` Pod. For configuration, allowlists, and monitoring, prefer the full Service name. Add the final dot in DNS tools and other consumers that accept absolute-name syntax so the resolver cannot append search suffixes; for an X.509 DNS SAN, use the FQDN without the presentation-form final dot, such as `database.data.svc.cluster.local`.

Remove the diagnostic Pod when finished:

~~~bash
kubectl -n frontend delete pod dnsutils
~~~

## Do Not Confuse Service and Endpoint Names

The Service FQDN and endpoint FQDN answer different questions:

| Query | Expected answer | Appropriate use |
| --- | --- | --- |
| `database.data.svc.<domain>` | All published endpoint IPs | Select any interchangeable member |
| `database-0.database.data.svc.<domain>` | The current IP for ordinal 0 | Select one stable StatefulSet identity |
| `_client._tcp.database.data.svc.<domain>` | SRV targets and port for the named Service port | Discover both endpoint names and port |

Do not assume arbitrary Deployment Pod names appear beneath the Service name. A predictable, portable hostname-based Pod record needs a hostname/subdomain relationship or an EndpointSlice endpoint hostname. StatefulSet supplies this relationship automatically when `spec.serviceName` points to the governing headless Service.

## Readiness Controls the Published Set

By default, the Service name and per-Pod names publish ready endpoints. During startup, `database-0` can exist and have an IP while its DNS record is still absent because its readiness probe has not passed.

For peer discovery that must include existing Pods before they become ready, consider:

~~~yaml
spec:
  clusterIP: None
  publishNotReadyAddresses: true
  selector:
    app.kubernetes.io/name: database
~~~

That choice causes DNS to publish A/AAAA and SRV records for otherwise unready endpoints. In Kubernetes-generated EndpointSlices, it also forces `conditions.ready` to `true`; `conditions.serving` continues to reflect the backing Pod's actual Ready condition. It does not make the database healthy. If a StatefulSet Pod cannot become ready until later replicas exist, also set `spec.podManagementPolicy: Parallel` on the StatefulSet; the default `OrderedReady` policy waits for each predecessor to become Running and Ready before creating the next replica. Keep a separate readiness-gated Service for ordinary client traffic when sending clients to booting members would be unsafe.

## DNS Does Not Grant Network Access

Namespace qualification solves naming only. A successful lookup can still be followed by a timeout when a NetworkPolicy, service mesh authorization rule, host firewall, or application listener blocks the connection.

For clusters enforcing NetworkPolicy, allow the actual destination Pods and port. NetworkPolicies are namespaced: the top-level `podSelector` below selects database Pods in `data`, while the `namespaceSelector` allows callers from the namespace identified by Kubernetes' standard, immutable namespace-name label:

~~~yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-database
  namespace: data
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: database
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: frontend
      ports:
        - protocol: TCP
          port: 5432
~~~

The network plugin must implement NetworkPolicy for this resource to have effect. If Pods in `frontend` are also isolated for egress, their egress policies must allow TCP port 5432 to the database Pods as well.

## Diagnose a Cross-Namespace Failure

Check each layer explicitly:

~~~bash
kubectl -n data get service database -o yaml

kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=database \
  -o yaml

kubectl -n data get pods \
  -l app.kubernetes.io/name=database \
  -o wide

kubectl -n frontend exec dnsutils -- \
  dig +noall +answer database.data.svc.cluster.local. A

kubectl -n frontend run tcp-check --rm -i --restart=Never \
  --image=busybox:1.36 --command -- \
  nc -vz -w 3 database-0.database.data.svc.cluster.local. 5432
~~~

An empty DNS answer points toward a wrong name or address family, no published endpoints, readiness gating, or DNS configuration. A correct address followed by a failed TCP test points toward routing, policy, or application health. Also remember that earlier negative responses can remain cached briefly after a Pod becomes publishable.

## Official Documentation

- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes namespaces and DNS](https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#namespaces-and-dns)
- [Kubernetes headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes StatefulSet stable network identity](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes NetworkPolicy](https://kubernetes.io/docs/concepts/services-networking/network-policies/)

## Conclusion

Cross-namespace headless discovery uses the destination Service's namespace, not the caller's: `<service>.<namespace>.svc.<cluster-domain>`. Add the endpoint hostname in front when selecting one stable member, use the absolute trailing-dot form in DNS-aware consumers when search-path independence matters, and treat DNS resolution and network authorization as separate checks.
