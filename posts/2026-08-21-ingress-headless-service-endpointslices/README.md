# How Ingress Routes to a Headless Service Through EndpointSlices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ingress, Headless Service, EndpointSlice, Ingress Controller, HTTP Routing

Description: Trace an Ingress backend from its Service port to ready EndpointSlice addresses when the Service has no ClusterIP.

---

An Ingress resource does not forward packets by itself. It declares HTTP routing rules, and an Ingress controller turns those rules into proxy or load-balancer configuration. A Service-backed Ingress backend names a Service and one of its ports; it does not contain a Pod selector, ClusterIP, or endpoint list.

For a regular Service, a controller can choose between the Service ClusterIP and the Service's endpoints. For a headless Service, `.spec.clusterIP` is `None`, so a controller cannot route through a Service virtual IP. An EndpointSlice-based controller that supports headless backends must obtain usable backend addresses from all of the Service's EndpointSlices and route directly to those IP-and-port pairs.

This behavior is controller-specific. The Kubernetes Ingress API is stable but frozen, and it does not require every implementation to support every headless-Service arrangement. Confirm support in your controller's documentation and test it before adopting the pattern.

## Define the Backend Contract

The following objects put the Ingress, Service, and Pods in the same namespace:

~~~yaml
apiVersion: v1
kind: Namespace
metadata:
  name: apps
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: apps
spec:
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: web
  template:
    metadata:
      labels:
        app.kubernetes.io/name: web
    spec:
      containers:
        - name: web
          image: registry.k8s.io/e2e-test-images/agnhost:2.53
          args:
            - netexec
            - --http-port=8080
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /
              port: http
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: web-headless
  namespace: apps
spec:
  clusterIP: None
  selector:
    app.kubernetes.io/name: web
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: http
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  namespace: apps
spec:
  ingressClassName: example
  rules:
    - host: web.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-headless
                port:
                  name: http
~~~

Replace `example` with an installed IngressClass. The Ingress backend refers to Service port `http`, whose Service port is `80`. The Service resolves named `targetPort: http` against each selected Pod, producing EndpointSlice port `8080`. A controller that consumes endpoints should therefore configure Pod IPs on port `8080`, not blindly send traffic to Pod port `80`.

## Follow the Objects in the Same Order as the Controller

Start at the Ingress rule:

~~~bash
kubectl -n apps get ingress web -o yaml
kubectl -n apps describe ingress web
~~~

Confirm that `ingressClassName` selects the intended controller and that events do not report a missing Service or port.

Then inspect the Service contract:

~~~bash
kubectl -n apps get service web-headless \
  -o 'custom-columns=NAME:.metadata.name,CLUSTER-IP:.spec.clusterIP,PORT:.spec.ports[*].port,TARGET-PORT:.spec.ports[*].targetPort'
~~~

`CLUSTER-IP` should be `None`. Finally, list every linked EndpointSlice:

~~~bash
kubectl -n apps get endpointslice \
  -l kubernetes.io/service-name=web-headless \
  -o yaml
~~~

Do not pick one slice by an assumed generated name. A Service can have several slices, and a controller that consumes EndpointSlices must join them to obtain the full backend set. Kubernetes separates slices by IP family, protocol, port number, and Service name; by default, the Kubernetes control plane creates and manages EndpointSlices with no more than 100 endpoints each.

For each expected backend, verify:

- `addressType` matches the address syntax;
- `ports[].name` and protocol correspond to the Service port;
- `ports[].port` is the resolved backend port;
- `endpoints[].addresses` contains the Pod IP;
- `endpoints[].conditions.ready` permits normal traffic;
- `targetRef` identifies the expected Pod for controller-generated slices.

## Readiness Changes the Ingress Upstream Set

For selector-based Services backed by Pods, Kubernetes-managed EndpointSlice conditions reflect Pod lifecycle. `ready` generally means the endpoint is serving and not terminating. Ingress controllers normally exclude endpoints that are not ready, although exact terminating-endpoint behavior is implementation-specific.

Check readiness and correlate Pod IPs:

~~~bash
kubectl -n apps get pods \
  -l app.kubernetes.io/name=web \
  -o 'custom-columns=NAME:.metadata.name,IP:.status.podIP,READY:.status.conditions[?(@.type=="Ready")].status,DELETING:.metadata.deletionTimestamp'
~~~

Avoid `publishNotReadyAddresses: true` on a general HTTP backend merely to make an empty upstream appear populated. That field tells endpoint consumers to disregard readiness and causes Kubernetes-generated EndpointSlices to report endpoints as ready. The proxy can then send requests to a process that has not passed its readiness probe.

## Understand Controller-Specific Modes

Some controllers normally build their upstreams from Pod endpoints but offer an option to route through the Service ClusterIP instead. For example, the now-retired community ingress-nginx controller documents `nginx.ingress.kubernetes.io/service-upstream: "true"` as switching from endpoint lists to a single Service ClusterIP upstream. The project was retired on March 24, 2026 and no longer receives releases, bug fixes, or security patches, so treat this as a behavior reference for existing deployments rather than a recommendation for new ones.

That annotation cannot provide its advertised single-ClusterIP upstream for a headless Service because there is no ClusterIP. In the final ingress-nginx release, v1.15.1, the failed ClusterIP lookup logs an error and falls back to EndpointSlice-derived endpoints. Do not assume that other controllers or versions provide the same fallback; confirm their documented behavior.

Other controllers might reject a headless backend, resolve the Service DNS name, watch legacy Endpoints, or watch EndpointSlices. Kubernetes does not standardize those internal choices. The safe workflow is:

1. read the documentation for the exact controller and version;
2. if it consumes EndpointSlices, check that its RBAC includes list/watch access to them;
3. inspect controller events and logs after applying the Ingress;
4. verify its generated upstream configuration or metrics when supported;
5. test backend removal by making one Pod unready and confirming new traffic stops reaching it.

## Selectorless Backends Need Manually Managed Slices

If the headless Service has no selector, Kubernetes does not create EndpointSlices. You or a dedicated controller must create them:

~~~yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-web
  namespace: apps
spec:
  clusterIP: None
  ports:
    - name: http
      protocol: TCP
      port: 8080
      targetPort: 8080
---
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: legacy-web-ipv4
  namespace: apps
  labels:
    kubernetes.io/service-name: legacy-web
    endpointslice.kubernetes.io/managed-by: platform-example-legacy-web
addressType: IPv4
ports:
  - name: http
    protocol: TCP
    port: 8080
endpoints:
  - addresses:
      - 10.20.30.80
    conditions:
      ready: true
~~~

For a selectorless headless Service, `port` must equal `targetPort`. Verify that the chosen Ingress controller supports custom EndpointSlices and non-Pod endpoint addresses. The API server also refuses `kubectl port-forward service/...` to endpoints that are not mapped to Pods, so use a direct network test instead of treating port-forward failure as proof that the Ingress cannot route.

## Diagnose a 502 or 503

A controller may return 502 or 503 when the route matched but no usable upstream is available. Inspect all layers:

~~~bash
kubectl -n apps get ingress web -o wide
kubectl -n apps get service web-headless -o yaml
kubectl -n apps get endpointslice \
  -l kubernetes.io/service-name=web-headless \
  -o yaml
kubectl -n apps get events --sort-by=.metadata.creationTimestamp
~~~

Then inspect the controller in its own namespace:

~~~bash
kubectl -n <controller-namespace> logs \
  deployment/<controller-deployment> \
  --since=10m
~~~

Look for an unsupported headless Service, unresolved port name, empty ready endpoint set, missing EndpointSlice permission, address-family mismatch, or network policy blocking controller-to-Pod traffic. DNS records can help confirm endpoint publication, but many controllers watch the Kubernetes API directly, so a successful `dig` is not proof that the controller accepted the backend.

## Official Documentation

- [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Kubernetes headless Services](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [EndpointSlice v1 API reference](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Ingress-NGINX Service Upstream behavior](https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/#service-upstream)
- [Ingress-NGINX v1.15.1 ClusterIP fallback](https://github.com/kubernetes/ingress-nginx/blob/controller-v1.15.1/internal/ingress/controller/controller.go#L1115-L1173)
- [Ingress-NGINX retirement status](https://kubernetes.io/blog/2026/04/22/kubernetes-v1-36-release/#ingress-nginx-retirement)
- [Kubernetes Gateway API](https://kubernetes.io/docs/concepts/services-networking/gateway/)

## Conclusion

A Service-backed Ingress names a Service port; the controller decides how to reach it. With a headless Service there is no ClusterIP, so controllers that consume EndpointSlices derive upstream IP-and-port pairs from ready endpoints across the complete set of slices. Verify that behavior for the installed controller, keep Service and endpoint ports aligned, and debug the Ingress, Service, slices, and controller as one chain.
