# How Dual-Stack Headless Services Publish A and AAAA Records

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Dual-Stack, Headless Service, IPv4, IPv6, CoreDNS

Description: Request both Service IP families, verify IPv4 and IPv6 EndpointSlices, and query the A and AAAA address sets for a headless Service.

---

A dual-stack headless Service still has no ClusterIP. Dual-stack controls which endpoint address families belong to the Service, not whether Kubernetes allocates two virtual Service IPs. When selected Pods have both IPv4 and IPv6 addresses and the Service requests both families, cluster DNS publishes:

- one A record per published IPv4 Pod address;
- one AAAA record per published IPv6 Pod address.

Kubernetes stores the two families in separate EndpointSlices because each slice has one immutable `addressType`. DNS combines the relevant ready addresses when answering the Service name.

## Confirm That the Cluster and Pods Are Dual-Stack

A Service manifest cannot make a single-stack cluster or CNI assign a second Pod address. Check a running Pod first:

~~~bash
kubectl -n apps get pod <pod-name> \
  -o jsonpath='{range .status.podIPs[*]}{.ip}{"\n"}{end}'
~~~

A dual-stack Pod should report one IPv4 address and one IPv6 address. Also inspect Nodes if necessary:

~~~bash
kubectl get nodes \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.addresses[?(@.type=="InternalIP")]}{.address}{" "}{end}{"\n"}{end}'
~~~

The cluster control plane, node networking, CNI plugin, and routes must all support both families. DNS publication alone does not provide IPv4-to-IPv6 translation.

## Require Both Families on the Headless Service

For a workload that must have both address families, use `RequireDualStack`:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: api-headless
  namespace: apps
spec:
  clusterIP: None
  ipFamilyPolicy: RequireDualStack
  ipFamilies:
    - IPv4
    - IPv6
  selector:
    app.kubernetes.io/name: api
  ports:
    - name: http
      protocol: TCP
      port: 8080
      targetPort: http
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: apps
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

For a selector-based Service such as this one, `RequireDualStack` rejects Service creation when the cluster is not configured for dual-stack Services. `PreferDualStack` requests both families on a dual-stack cluster but falls back to one on a single-stack cluster. Choose `PreferDualStack` when one family is an acceptable operating mode; choose `RequireDualStack` when silently losing one family would violate the application's contract.

The `ipFamilies` order sets the primary family. It does not promise DNS answer order or force a client to try that family first. For a Service with allocated ClusterIPs, Kubernetes does not let you change the primary family; you can conditionally add or remove a secondary family. A headless Service is an exception: because it has no family-specific Service VIP, its `ipFamilies` can be changed during an update, subject to the selected policy.

## Inspect the Headless Service State

~~~bash
kubectl -n apps get service api-headless \
  -o jsonpath='{.spec.clusterIP}{"\n"}{.spec.clusterIPs}{"\n"}{.spec.ipFamilyPolicy}{"\n"}{.spec.ipFamilies}{"\n"}'
~~~

For a headless Service, expect `clusterIP: None` and a `clusterIPs` representation containing `None`, even though `ipFamilies` contains both `IPv4` and `IPv6`. There are no Service VIPs to query; the answers come from Pod endpoints.

Do not rely on defaults for a new selector-based headless Service when dual-stack is required. Kubernetes documentation describes selector-based headless Services without an explicit policy as behaving like other default single-stack Services. Make the policy explicit.

## Verify One EndpointSlice per Address Family

~~~bash
kubectl -n apps get endpointslice \
  -l kubernetes.io/service-name=api-headless \
  -o 'custom-columns=SLICE:.metadata.name,ADDRESS-TYPE:.addressType,ADDRESSES:.endpoints[*].addresses[*],READY:.endpoints[*].conditions.ready'
~~~

For a populated dual-stack Service, there should be at least one `IPv4` slice and one `IPv6` slice. Larger workloads or different port combinations can create more than two slices.

Inspect the full resources when an address is missing:

~~~bash
kubectl -n apps get endpointslice \
  -l kubernetes.io/service-name=api-headless \
  -o yaml
~~~

Compare each address with `.status.podIPs` on the referenced Pod. A ready Pod with only one family cannot contribute an address to the other family's slice.

## Query A and AAAA Independently

From a Pod using cluster DNS:

~~~bash
dig +noall +answer api-headless.apps.svc.cluster.local. A
dig +noall +answer api-headless.apps.svc.cluster.local. AAAA
~~~

Each ready dual-stack Pod should normally contribute an address to each answer set. Replace `cluster.local` with the actual cluster domain. DNS answer order is not a stable Pod ordering, and clients must not assume the first result is the leader or preferred endpoint.

If the workload uses stable hostnames through a StatefulSet, query both record types for an ordinal too:

~~~bash
dig +noall +answer api-0.api-headless.apps.svc.cluster.local. A
dig +noall +answer api-0.api-headless.apps.svc.cluster.local. AAAA
~~~

The Pod needs the governing hostname/subdomain relationship, and readiness still controls normal publication. A Deployment-backed Service provides the Service-wide address sets but not stable logical ordinal names.

## Make Clients Tolerate Family-Specific Failure

Receiving both records does not prove both paths work from a particular client. Test connectivity with explicit family selection:

~~~bash
curl -4 --connect-timeout 3 http://api-headless.apps.svc.cluster.local:8080/
curl -6 --connect-timeout 3 http://api-headless.apps.svc.cluster.local:8080/
~~~

Client libraries vary in address ordering, parallel connection attempts, and fallback behavior. Prefer a modern resolver and connection strategy such as Happy Eyeballs where appropriate. A client that tries only the first returned address can fail even when another published address is reachable.

Check these layers when only one family works:

- Pod `.status.podIPs` contains both families;
- Service `ipFamilyPolicy` and `ipFamilies` request both;
- both IPv4 and IPv6 EndpointSlices contain ready endpoints;
- CoreDNS answers both A and AAAA;
- the source Pod has a route for the destination family;
- NetworkPolicy, host firewalls, and application bind addresses allow both;
- the process listens on the Pod's IPv4 and IPv6 interfaces as intended.

## Account for Readiness and Selectorless Defaults

Headless DNS normally excludes unready endpoints. `publishNotReadyAddresses: true` includes them for bootstrap, but then every consumer of the Service's generated endpoint data must tolerate booting members.

Kubernetes documents a special default for headless Services **without** selectors: when `ipFamilyPolicy` is omitted, it defaults to `RequireDualStack`. The API server permits this selectorless headless special case to list both families even when the cluster is configured for single-stack Services because its endpoints are managed independently. Do not build portable manifests around that surprising default. Set `SingleStack`, `PreferDualStack`, or `RequireDualStack` explicitly. When publishing both families, create separate manually managed IPv4 and IPv6 EndpointSlices with the correct Service association label.

## Official Documentation

- [Kubernetes IPv4/IPv6 dual-stack](https://kubernetes.io/docs/concepts/services-networking/dual-stack/)
- [Kubernetes headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes DNS A and AAAA records](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/#a-aaaa-records)
- [Kubernetes EndpointSlice address types](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/#address-types)
- [Kubernetes Service v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/service-resources/service-v1/)

## Conclusion

Dual-stack headless DNS is endpoint publication in two families, not allocation of two Service IPs. Request both families explicitly, verify that Pods actually receive both addresses, expect separate IPv4 and IPv6 EndpointSlices, and test A, AAAA, IPv4 connectivity, and IPv6 connectivity as distinct stages.
