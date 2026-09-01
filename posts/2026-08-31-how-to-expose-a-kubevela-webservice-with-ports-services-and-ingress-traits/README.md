# How to Expose a KubeVela Webservice with Ports, Services, and Ingress Traits

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ingress, Application Delivery, Troubleshooting

Description: Expose a KubeVela webservice through container ports, a Kubernetes Service, and the version-appropriate gateway or ingress trait.

---

Exposing a KubeVela `webservice` is a chain, not one switch. The container must listen on the declared port, KubeVela must render a Service that selects the Pods, the selected Pods must become ready endpoints, an ingress controller must watch the generated Ingress, and DNS must send the hostname to that controller. Debugging is fastest when each layer is verified in that order.

Current KubeVela documentation uses the built-in `gateway` trait for HTTP ingress. Some older examples and customized platforms expose a trait named `ingress`. Definitions are programmable and release-specific, so inspect the cluster first:

```bash
vela show webservice --namespace apps
vela show gateway --namespace apps
vela def list --type trait --namespace apps \
  | grep -E 'gateway|ingress|expose'
vela def list --type trait --namespace vela-system \
  | grep -E 'gateway|ingress|expose'
```

Use the schema printed by your installed definition. Do not mix a v1.7 `ingress` example, a v1.10 `gateway` schema, and a customized platform definition in one manifest.

## Declare the workload and Service port

This example uses the current `ports` shape and asks the webservice definition to expose the port through a Service:

```yaml
apiVersion: core.oam.dev/v1beta1
kind: Application
metadata:
  name: catalog
  namespace: apps
spec:
  components:
    - name: api
      type: webservice
      properties:
        image: ghcr.io/example/catalog-api:2.4.1
        ports:
          - name: http
            port: 8080
            expose: true
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5
      traits:
        - type: scaler
          properties:
            replicas: 2
```

`port` must match the port on which the process listens unless the installed definition provides a separate `containerPort`. Declaring a port does not cause the process to bind it. Test the image's configuration and ensure the process listens on `0.0.0.0`, not only loopback.

An alternative is the built-in `expose` trait, which can create a `ClusterIP`, `NodePort`, or `LoadBalancer` Service for compatible workloads. Prefer one Service owner: use webservice port exposure, an expose trait designed by your platform, or a gateway trait that generates its own backend Service. Do not create two Services accidentally and then debug the wrong one.

## Add HTTP ingress with `gateway`

Attach the current documented trait:

```yaml
      traits:
        - type: scaler
          properties:
            replicas: 2
        - type: gateway
          properties:
            name: public
            existingServiceName: api
            domain: catalog.example.com
            class: nginx
            classInSpec: true
            pathType: Prefix
            http:
              "/": 8080
```

The `http` map sends the path to a Service port. `existingServiceName: api` tells the current built-in definition to reuse the Service rendered by the webservice component; without it, this named gateway would render a second Service named `api-public`. `classInSpec: true` asks the definition to use `spec.ingressClassName`; this aligns with the stable Kubernetes Ingress API. Confirm the rendered object because older controller versions may use the legacy class annotation.

For TLS, create the certificate Secret through your certificate-management or GitOps layer and reference it:

```yaml
            secretName: catalog-tls
```

The Secret must exist in the namespace required by the generated Ingress and contain a valid `kubernetes.io/tls` key pair. Never put a private key inline in the KubeVela Application.

## Confirm an ingress controller exists

An Ingress object is only desired state. Kubernetes does not implement it without an ingress controller:

```bash
kubectl get ingressclass
kubectl get pods --all-namespaces \
  -l app.kubernetes.io/component=controller
```

Labels vary, so locate the controller's namespace and consult its installation documentation. The class in the trait must match an `IngressClass` handled by that controller. KubeVela can also install ingress-related addons in supported environments, but inspect addon version and values rather than enabling one blindly in a shared cluster.

## Render and apply

```bash
vela dry-run --file catalog.yaml
vela up --file catalog.yaml --namespace apps
vela status catalog --namespace apps --tree --detail
vela status catalog --namespace apps --endpoint
```

Review the generated Service and Ingress names from the resource tree. Then inspect each layer.

### 1. Pod readiness

```bash
kubectl get pods --namespace apps -o wide
kubectl describe pod --namespace apps <pod-name>
kubectl logs --namespace apps <pod-name> --all-containers
```

If readiness fails, the Service normally removes that Pod from its ready endpoints. Fix the process, probe path, port, or network policy before touching ingress.

### 2. Service selection and endpoints

```bash
kubectl get service,endpointslice --namespace apps
kubectl describe service --namespace apps <service-name>
kubectl get endpointslice --namespace apps \
  -l kubernetes.io/service-name=<service-name> -o yaml
```

No EndpointSlice endpoints usually means the Service selector matched no eligible Pods; verify the selector, Pod labels, and that matching Pods have Pod IPs. Endpoints with `conditions.ready: false` are not eligible for ordinary Service traffic; for Pod-backed endpoints, the Pod may be unready or terminating, so inspect `conditions.serving` and `conditions.terminating` too. A selected endpoint with the wrong target port means Service-to-container mapping is wrong.

Test without ingress:

```bash
kubectl port-forward --namespace apps service/<service-name> 8080:8080
curl --fail http://127.0.0.1:8080/ready
```

Use the Service's actual port on the right side of the forward.

### 3. Ingress acceptance

```bash
kubectl get ingress --namespace apps
kubectl describe ingress --namespace apps <ingress-name>
```

Check class, host, path, backend Service name/port, events, and controller-assigned address. Then inspect the ingress controller logs for rejected annotations, missing Services, invalid TLS Secrets, or unsupported paths.

### 4. DNS and external traffic

Point `catalog.example.com` at the controller's published load-balancer address, not a Pod IP. Before DNS propagates, test while preserving the Host header:

```bash
curl --fail --header 'Host: catalog.example.com' \
  http://<ingress-controller-address>/
```

For HTTPS, use a resolver override that preserves SNI, such as `curl --resolve`, and keep certificate verification enabled with a certificate valid for the host.

## Avoid common ownership mistakes

- Do not use a `NodePort` and Ingress unless both are intentionally required; Ingress normally targets a ClusterIP Service.
- Do not set both a fixed Service name in a custom trait and a generated Service without confirming the backend.
- Do not assume the gateway trait installs an ingress controller.
- Do not route to the readiness port when the application serves traffic elsewhere.
- Do not “fix” a 503 by disabling readiness; that sends traffic to an unhealthy process.

NetworkPolicy can block ingress-controller-to-Service traffic even when port-forward works. Check policies in both workload and controller namespaces after the basic object graph is correct.

## Official Documentation

- [KubeVela gateway for public access](https://kubevela.io/docs/end-user/traits/ingress/)
- [KubeVela built-in trait reference](https://kubevela.io/docs/end-user/traits/references/)
- [KubeVela built-in component reference](https://kubevela.io/docs/end-user/components/references/)
- [Kubernetes Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Kubernetes Services](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)

## Conclusion

Expose a KubeVela webservice one layer at a time: make the process listen, declare the installed webservice port schema, verify the generated Service and ready endpoints, then attach the version-appropriate `gateway` or platform ingress trait. An ingress controller, matching class, DNS, TLS, and network policy remain separate responsibilities. The KubeVela resource tree tells you what was rendered; Kubernetes events and controller logs tell you why traffic does or does not flow.
