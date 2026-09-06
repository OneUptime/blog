# Run Public and Private Contour Ingress Classes in One Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, Kubernetes, Ingress Controller, HTTPProxy, Routing, TLS, Load Balancing

Description: Isolate internet-facing and internal routes with two Contour and Envoy deployments, explicit class selection, and separate load balancers.

---

A public and a private ingress are separate trust boundaries. Give each one its own Contour control plane, Envoy data plane, load balancer, and ingress class. A single Contour process can accept a comma-separated list of classes, but that does not provide data-plane or network isolation.

This guide uses `contour-public` and `contour-private`. Substitute names that match your platform conventions.

## Prefer Separate Namespaces

Project Contour recommends placing multiple installations in separate namespaces. This avoids most namespaced resource collisions and makes RBAC, network policies, certificates, and operational ownership easier to reason about:

```text
contour-public namespace
  Contour Deployment -> public Envoy -> internet-facing load balancer

contour-private namespace
  Contour Deployment -> private Envoy -> internal load balancer
```

Install the same pinned Contour release twice from reviewed manifests or through a chart that supports distinct release names. The CRDs are cluster-scoped and shared, so install or upgrade them once. Names of cluster-scoped RBAC resources must still be unique when the installation method creates a set for each controller.

Configure the Contour container in each installation with one class. These are excerpts, not complete Deployments:

Public Contour container arguments:

```yaml
args:
- serve
- --incluster
- --ingress-class-name=contour-public
- --envoy-service-name=envoy
- --envoy-service-namespace=contour-public
```

Private Contour container arguments:

```yaml
args:
- serve
- --incluster
- --ingress-class-name=contour-private
- --envoy-service-name=envoy
- --envoy-service-namespace=contour-private
```

Keep the generated xDS client and server certificates inside their respective namespaces. Do not copy one installation's Contour or Envoy credentials into the other installation.

## Make the Load Balancer Boundary Explicit

The public Envoy Service normally receives a public address. The private Envoy Service must use the exact internal load-balancer configuration documented by the cloud or on-premises load-balancer implementation:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: envoy
  namespace: contour-private
  annotations:
    # Add the provider's documented internal load-balancer annotation here.
spec:
  type: LoadBalancer
  selector:
    app: envoy
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: https
    port: 443
    targetPort: 8443
```

There is no portable Kubernetes annotation that means internal load balancer across every provider. Do not paste an annotation from a different cloud. Confirm that the assigned address is private and that firewall rules restrict it to intended source networks.

If Envoy uses `hostPort`, two DaemonSets scheduled to the same node cannot both bind the default ports. Project Contour's multiple-instance guidance says to remove those host ports for the separate-namespace layout. A `LoadBalancer` Service can still map ports 80 and 443 to the Envoy container ports.

## Classify Every HTTPProxy

Set `spec.ingressClassName` on every root and included HTTPProxy. The included object must be accepted by the same Contour instance as the root:

```yaml
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: shop-public
  namespace: storefront
spec:
  ingressClassName: contour-public
  virtualhost:
    fqdn: shop.example.com
    tls:
      secretName: shop-public-tls
  routes:
  - conditions:
    - prefix: /
    services:
    - name: storefront
      port: 8080
---
apiVersion: projectcontour.io/v1
kind: HTTPProxy
metadata:
  name: shop-admin
  namespace: storefront
spec:
  ingressClassName: contour-private
  virtualhost:
    fqdn: shop-admin.corp.example
    tls:
      secretName: shop-admin-tls
  routes:
  - conditions:
    - prefix: /
    services:
    - name: storefront-admin
      port: 8080
```

Use the same field on Kubernetes Ingress objects:

```yaml
spec:
  ingressClassName: contour-private
```

Contour does not require an `IngressClass` object merely to filter resources. The name passed to `--ingress-class-name` is sufficient as the identifier. An organization may still create `IngressClass` objects for admission policy and discoverability, but should use the controller value prescribed by its installation tooling rather than inventing one.

Remove old class annotations during migration. Contour accepts both `kubernetes.io/ingress.class` and `projectcontour.io/ingress.class`, and an annotation takes precedence over `spec.ingressClassName` when both exist. A stale annotation can silently send an object to the wrong controller or cause both controllers to ignore it.

## Avoid Unclassified Routes

Without `--ingress-class-name`, Contour accepts objects classified as `contour` and objects with no class. That default is convenient for one installation but weakens the boundary in a multi-controller cluster. Configure an explicit class on both instances, and enforce the field with policy or admission validation in namespaces that publish routes.

Class filtering decides which configuration Contour reads. It does not by itself restrict which namespaces a controller can watch. Add `--watch-namespaces` and namespace-scoped RBAC when public and private teams should not be able to reference one another's route objects.

## Validate Isolation Before DNS Cutover

Inspect each object and its status:

```bash
kubectl -n storefront get httpproxy shop-public shop-admin \
  -o custom-columns=NAME:.metadata.name,CLASS:.spec.ingressClassName,VALID:.status.currentStatus,DETAIL:.status.description

kubectl -n contour-public get service envoy
kubectl -n contour-private get service envoy
```

Query each address directly while preserving TLS SNI and the HTTP host:

```bash
curl --resolve shop.example.com:443:PUBLIC_IP https://shop.example.com/
curl --resolve shop-admin.corp.example:443:PRIVATE_IP https://shop-admin.corp.example/
```

Run the negative tests too. The private address should not be reachable from the public internet, and the private hostname should not appear in public DNS unless that exposure is intentional. A request sent to the wrong Envoy address should not match the other class's route.

Monitor both Contour Deployments, both Envoy workloads, both Services, and both leader-election Leases independently. Separate failure budgets and rollout windows prevent a public ingress change from unnecessarily disturbing private traffic.

## If Both Instances Must Share a Namespace

Separate namespaces are simpler. If they are impossible, Project Contour requires unique names and references for Services, ServiceAccounts, RBAC, configuration, xDS Secrets, generated certificate suffixes, labels, selectors, Contour Deployments, Envoy workloads, and leader-election Leases. It also calls out these Contour arguments:

```text
--leader-election-resource-name=<unique-name>
--envoy-service-name=<unique-envoy-service>
--ingress-class-name=<unique-class>
```

Remove colliding Envoy `hostPort` entries and update the Envoy init container's xDS address to the matching Contour Service. Missing one reference can connect an Envoy fleet to the wrong control plane, so render and diff the complete manifests before applying them.

## Conclusion

Run public and private ingress as two complete Contour and Envoy installations, preferably in separate namespaces. Give each an explicit class and load-balancer boundary, classify every root and included HTTPProxy, and prove positive and negative reachability before publishing DNS.

## Official Documentation

- [Project Contour 1.33 deployment options and multiple instances](https://projectcontour.io/docs/1.33/deploy-options/)
- [Project Contour 1.33 Ingress support and class filtering](https://projectcontour.io/docs/1.33/config/ingress/)
- [Project Contour 1.33 annotations reference](https://projectcontour.io/docs/1.33/config/annotations/)
- [Project Contour 1.33 HTTPProxy API reference](https://projectcontour.io/docs/1.33/config/api-reference/)
- [Kubernetes IngressClass documentation](https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-class)
- [Kubernetes Service type LoadBalancer](https://kubernetes.io/docs/concepts/services-networking/service/#loadbalancer)
