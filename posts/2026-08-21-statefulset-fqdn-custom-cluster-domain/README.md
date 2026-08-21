# How to Build StatefulSet FQDNs with a Custom Cluster Domain

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, StatefulSet, Headless Service, Cluster Domain, FQDN, CoreDNS

Description: Discover a custom Kubernetes cluster domain and construct absolute StatefulSet Pod names without hard-coding `cluster.local`.

---

`cluster.local` is the conventional Kubernetes cluster domain, not a fixed part of the DNS specification. With a custom domain such as `platform.example`, a StatefulSet Pod FQDN is:

~~~text
<pod-name>.<governing-service>.<namespace>.svc.platform.example
~~~

For StatefulSet `ledger`, governing Service `ledger-peers`, namespace `data`, and ordinal 0, the absolute name is:

~~~text
ledger-0.ledger-peers.data.svc.platform.example.
~~~

Hard-coding `.svc.cluster.local` causes peer discovery, TLS identities, and monitoring checks to fail when a cluster operator chooses another domain.

## Build the Name from Five Inputs

Use this general form:

~~~text
<statefulset-name>-<ordinal>.<service-name>.<namespace>.svc.<cluster-domain>
~~~

The inputs come from different objects:

- StatefulSet `metadata.name` plus the ordinal produces the Pod name;
- StatefulSet `spec.serviceName` names the governing Service;
- both objects must share the namespace;
- `svc` is the Kubernetes Service zone label;
- the kubelet and cluster DNS configuration provide the cluster domain.

The relationship is visible in this manifest:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: ledger-peers
  namespace: data
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: ledger
  ports:
    - name: peer
      protocol: TCP
      port: 7000
      targetPort: peer
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: ledger
  namespace: data
spec:
  serviceName: ledger-peers
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: ledger
  template:
    metadata:
      labels:
        app.kubernetes.io/name: ledger
    spec:
      containers:
        - name: ledger
          image: registry.k8s.io/e2e-test-images/agnhost:2.53
          args:
            - netexec
            - --http-port=7000
          ports:
            - name: peer
              containerPort: 7000
          readinessProbe:
            tcpSocket:
              port: peer
            periodSeconds: 5
~~~

The governing Service does not contain the cluster domain. Kubernetes adds the DNS zone according to cluster configuration.

## Discover the Domain from a Normal Pod

The most accessible check is the resolver configuration of a Pod using `dnsPolicy: ClusterFirst`:

~~~bash
kubectl -n data exec ledger-0 -- cat /etc/resolv.conf
~~~

For a custom domain, output might include:

~~~text
search data.svc.platform.example svc.platform.example platform.example
nameserver 10.96.0.10
options ndots:5
~~~

Find the search suffix beginning with `svc.` and remove that literal prefix. Here, `svc.platform.example` reveals the cluster domain `platform.example`. Do not assume a domain has exactly two labels or derive it by taking the last two labels. Valid custom domains can be deeper, such as `k8s.eu.example.internal`.

Pod resolver state is an observation, not a universal configuration API. A Pod with `dnsPolicy: Default`, `dnsPolicy: None`, custom `dnsConfig.searches`, host networking, or a service-mesh DNS interceptor can show a different search list. Use a simple `ClusterFirst` diagnostic Pod if the application Pod is customized.

~~~bash
kubectl -n data run dnsutils \
  --image=registry.k8s.io/e2e-test-images/agnhost:2.53 \
  --restart=Never

kubectl -n data wait --for=condition=Ready pod/dnsutils --timeout=60s
kubectl -n data exec dnsutils -- cat /etc/resolv.conf
~~~

## Confirm the Kubelet's Cluster Domain as an Administrator

The kubelet configuration field is `clusterDomain`. Kubernetes documents that the kubelet uses it to add the cluster search domain to containers. A cluster administrator with access to the node proxy can inspect the live configuration:

~~~bash
node_name="$(kubectl get pod -n data ledger-0 -o jsonpath='{.spec.nodeName}')"

kubectl get --raw \
  "/api/v1/nodes/${node_name}/proxy/configz" \
  | jq -r '.kubeletconfig.clusterDomain'
~~~

This request is privileged in many clusters. Managed services may restrict the node proxy, and kubelet configuration delivery differs by installer. Treat the cluster platform's documented configuration as authoritative when direct inspection is unavailable.

All kubelets that run ordinary Pods should agree on the cluster domain. A mismatched node can generate a different Pod search list even while CoreDNS remains authoritative for the configured Service zone.

## Confirm the CoreDNS Authoritative Zone

If the cluster uses CoreDNS, inspect its Corefile:

~~~bash
kubectl -n kube-system get configmap coredns \
  -o jsonpath='{.data.Corefile}{"\n"}'
~~~

A custom domain commonly appears in the `kubernetes` plugin stanza:

~~~text
.:53 {
    kubernetes platform.example in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
    }
    # other plugins
}
~~~

Real Corefiles include caching, health checks, readiness, forwarding, metrics, reload, and other installation-specific plugins. Do not replace the Corefile with the abbreviated illustration. The kubelet `clusterDomain`, Pod search list, and `kubernetes` plugin zone must agree, and the CoreDNS server block must receive queries for that zone.

Clusters can use another conformant DNS provider, NodeLocal DNSCache, or additional zones. In those cases, follow the provider's configuration path rather than assuming the CoreDNS ConfigMap alone is authoritative.

## Query Relative and Absolute Names Separately

Inside `data`, resolver search normally makes this work:

~~~bash
kubectl -n data exec dnsutils -- \
  dig +search +noall +answer ledger-0.ledger-peers A
~~~

Test the full absolute name independently:

~~~bash
kubectl -n data exec dnsutils -- \
  dig +noall +answer \
  ledger-0.ledger-peers.data.svc.platform.example. A
~~~

The trailing dot prevents search expansion. It is especially useful for diagnostics: without it, a high `ndots` setting can cause the resolver to try several suffixed variants before the intended name.

For dual-stack Pods, query both:

~~~bash
kubectl -n data exec dnsutils -- \
  dig +noall +answer \
  ledger-0.ledger-peers.data.svc.platform.example. A

kubectl -n data exec dnsutils -- \
  dig +noall +answer \
  ledger-0.ledger-peers.data.svc.platform.example. AAAA
~~~

A working short name with a failing absolute name usually means the assumed domain is wrong. A working absolute name with a failing short name points toward the Pod search list or DNS policy.

## Pass the Domain into Applications Explicitly

Kubernetes has no generic Downward API field that injects the cluster domain into every container. When software must construct absolute peer names, provide the operator-selected domain as configuration:

~~~yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-dns-settings
  namespace: data
data:
  clusterDomain: platform.example
~~~

Add the environment variable to the application container in the StatefulSet's Pod template:

~~~yaml
# StatefulSet Pod template fragment
spec:
  template:
    spec:
      containers:
        - name: ledger
          image: example.invalid/ledger:replace-with-real-image
          env:
            - name: CLUSTER_DOMAIN
              valueFrom:
                configMapKeyRef:
                  name: cluster-dns-settings
                  key: clusterDomain
~~~

The image is an explicit placeholder; retain the environment pattern while using your actual application image. Prefer accepting the entire peer suffix or explicit peer list when the software supports it. Keep the value in the same cluster configuration source used to install DNS, so charts and operators do not diverge.

Parsing `/etc/resolv.conf` inside the application can be a fallback, but it is fragile when search lists are customized. Using only relative names avoids embedding the domain but makes behavior dependent on `dnsPolicy` and resolver search settings.

## Diagnose a Missing Ordinal FQDN

~~~bash
kubectl -n data get statefulset ledger \
  -o jsonpath='{.spec.serviceName}{"\n"}'

kubectl -n data get service ledger-peers -o yaml

kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=ledger-peers \
  -o yaml

kubectl -n data exec ledger-0 -- cat /etc/resolv.conf
~~~

Check that the StatefulSet and governing headless Service share a namespace, `spec.serviceName` matches exactly, Service selectors match Pod labels, the endpoint is published by readiness policy, and the query uses the real domain. A lookup made before the Pod existed can be held by negative caching for a short period after creation.

## Official Documentation

- [Kubernetes StatefulSet stable network identity](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes KubeletConfiguration `clusterDomain`](https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/)
- [Debugging Kubernetes Services and custom cluster domains](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)
- [CoreDNS Kubernetes plugin zones](https://coredns.io/plugins/kubernetes/)
- [Customizing Kubernetes DNS Service](https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/)

## Conclusion

Build a StatefulSet Pod FQDN from the ordinal Pod name, governing Service, namespace, `svc`, and the configured cluster domain. Discover that domain from a normal Pod and confirm it against kubelet or DNS configuration when authorized. Pass it into applications explicitly instead of assuming `cluster.local` or guessing from the final labels of a search suffix.
