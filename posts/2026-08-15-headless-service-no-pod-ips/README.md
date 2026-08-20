# Why a Kubernetes Headless Service Returns No Pod IPs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Headless Service, EndpointSlice, CoreDNS, Pod Readiness, DNS Troubleshooting

Description: Trace an empty headless Service DNS answer through its Service, selector, EndpointSlices, readiness conditions, and CoreDNS configuration.

---

A headless Service does not invent a virtual address. Its DNS answer is built from endpoint addresses, so an empty answer usually means that Kubernetes has no matching endpoint that DNS considers publishable.

Debug the data path in order:

~~~text
Service name -> Service selector -> matching Pods -> EndpointSlices -> endpoint conditions -> CoreDNS -> client resolver
~~~

This avoids changing DNS settings when the real problem is a selector typo or an unready Pod.

## Start with a Known Headless Service

A selector-backed headless Service needs the literal string `None` in `spec.clusterIP`:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: members
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
~~~

Leaving `clusterIP` unset creates a regular ClusterIP Service. The string `None` is a special value, not YAML `null` and not an omitted field.

Confirm what the API stored:

~~~bash
kubectl -n data get service members -o yaml
kubectl -n data get service members \
  -o jsonpath='{.spec.clusterIP}{"\n"}'
~~~

The output should be `None`.

## Prove That the Selector Matches Pods

The EndpointSlice controller creates slices automatically only when the Service has a selector. Compare the selector with Pod labels in the same namespace:

~~~bash
kubectl -n data get service members \
  -o jsonpath='{.spec.selector}{"\n"}'

kubectl -n data get pods \
  -l app.kubernetes.io/name=ledger \
  -o wide --show-labels
~~~

Common mistakes include:

- the Service and Pods are in different namespaces;
- the label key or value differs in case or punctuation;
- a Helm label changed while the Service selector did not;
- the Pods have not been assigned an IP yet;
- the selector is intentionally absent, but nobody created a manual EndpointSlice.

Do not add a broad selector just to make DNS work. A selector that matches an unrelated Pod publishes that Pod as a peer.

## Inspect Every EndpointSlice

A Service can have more than one EndpointSlice. List by the association label, not by a guessed slice name:

~~~bash
kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=members \
  -o wide

kubectl -n data get endpointslice \
  -l kubernetes.io/service-name=members \
  -o jsonpath='{range .items[*].endpoints[*]}{.targetRef.name}{"\t"}{.addresses[*]}{"\tready="}{.conditions.ready}{"\tserving="}{.conditions.serving}{"\tterminating="}{.conditions.terminating}{"\n"}{end}'
~~~

Interpret the result carefully:

- no slices usually means no selector, a missing Service, or a controller problem;
- slices with no endpoints usually mean the selector matches no eligible Pods;
- an address with `ready: false` is present in discovery state but is not normally published for the headless Service;
- a terminating endpoint is normally ignored by Service proxies, but they may route traffic to one that is both `serving` and `terminating` if all available endpoints are terminating.

EndpointSlice is the current discovery API. The legacy Endpoints API is deprecated, can truncate large endpoint sets, and should not be the primary diagnostic source.

## Check Readiness Separately

By default, a selected Pod needs to be ready before its address is published in the headless Service's DNS answer. Check Pod conditions and probe events:

~~~bash
kubectl -n data get pods \
  -l app.kubernetes.io/name=ledger

kubectl -n data describe pod ledger-0
~~~

A failing readiness probe, a startup probe that has not succeeded, or an unready readiness gate can explain why an address is absent from DNS.

`publishNotReadyAddresses: true` tells endpoint consumers to disregard readiness for this Service, and the EndpointSlice controller represents its endpoints as ready. That option is useful for peer bootstrap, but it can expose applications before they can safely serve ordinary clients. Fix an incorrect readiness probe instead of masking it. If bootstrap truly requires early discovery, use a dedicated peer-discovery Service.

## Query the Right DNS Name

Test from a Pod that uses cluster DNS:

~~~bash
kubectl -n data run dns-tools --rm -it --restart=Never \
  --image=registry.k8s.io/e2e-test-images/agnhost:2.39 \
  --command -- \
  dig +noall +comments +answer members.data.svc.cluster.local. A
~~~

Use the actual cluster domain if it is not `cluster.local`. A short lookup such as `members` depends on the querying Pod's namespace, search list, `ndots` setting, and `dnsPolicy`. A trailing dot makes the test an absolute DNS query.

Also inspect a test Pod's resolver configuration:

~~~bash
kubectl -n data run dns-tools-resolver --rm -it --restart=Never \
  --image=registry.k8s.io/e2e-test-images/agnhost:2.39 \
  --command -- \
  cat /etc/resolv.conf
~~~

A Pod with `dnsPolicy: Default` or `dnsPolicy: None` may not send the query to cluster DNS unless its custom configuration does so.

## Verify CoreDNS Only After the API Objects Are Correct

If ready addresses exist but queries still fail, check the DNS service and CoreDNS:

~~~bash
kubectl -n kube-system get service kube-dns
kubectl -n kube-system get endpointslice \
  -l kubernetes.io/service-name=kube-dns
kubectl -n kube-system get pods -l k8s-app=kube-dns
kubectl -n kube-system logs -l k8s-app=kube-dns --tail=200
kubectl -n kube-system get configmap coredns -o yaml
~~~

CoreDNS needs permission to list and watch Services, Namespaces, Pods, and EndpointSlices. The CoreDNS `kubernetes` plugin also has a `noendpoints` option; when enabled, endpoint and headless-Service queries return `NXDOMAIN`. Immediately after startup, the plugin can return `SERVFAIL` until its Kubernetes watches have synchronized.

Distinguish these DNS outcomes:

| Result | Likely direction |
| --- | --- |
| `NXDOMAIN` | wrong name or namespace, no publishable endpoint, or `noendpoints` |
| `NOERROR` with no A/AAAA answer | name exists but the requested record type has no data |
| `SERVFAIL` | CoreDNS startup, API access, configuration, or upstream failure |
| old IPs | CoreDNS, node-local, application, or resolver cache |

## Use a Repeatable Checklist

Run these checks before restarting anything:

1. Confirm the exact Service namespace and `clusterIP: None`.
2. Confirm the selector matches the intended Pods and those Pods have IPs.
3. List all EndpointSlices with `kubernetes.io/service-name=<service>`.
4. Inspect `ready`, `serving`, and `terminating` for each endpoint.
5. Query the absolute A or AAAA name from a cluster-DNS Pod.
6. Inspect that Pod's `resolv.conf` and `dnsPolicy`.
7. Check CoreDNS health, permissions, logs, and Corefile only if the API state is correct.

## Official Documentation

- [Kubernetes Services and headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [DNS for Kubernetes Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Debugging DNS resolution in Kubernetes](https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/)
- [CoreDNS kubernetes plugin](https://coredns.io/plugins/kubernetes/)

## Conclusion

An empty headless-Service answer is usually an empty publishable endpoint set, not a missing virtual IP. Trace the Service selector into every EndpointSlice, inspect readiness and termination conditions, and then test the absolute DNS name. Only move to CoreDNS configuration after Kubernetes shows the addresses that DNS should publish.
