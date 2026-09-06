# Deploy Gateway API with Contour

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Contour, Gateway API, Kubernetes Gateway API, GatewayClass, HTTPRoute, Kubernetes, Envoy, TLS, Routing

Description: Deploy Contour's Gateway provisioner, attach an HTTPRoute safely across namespaces, terminate TLS, and debug Gateway API status conditions.

---

Contour supports Gateway API alongside HTTPProxy and Ingress. Its architecture makes one design choice especially important: each `Gateway` corresponds to one Contour control plane and one Envoy data plane.

Contour 1.33 supports two provisioning models:

- Dynamic provisioning runs the Contour Gateway provisioner, which creates and maintains a Contour and Envoy instance for each Gateway.
- Static provisioning requires the platform team to deploy one matching Contour and Envoy instance and set `gateway.gatewayRef` in Contour configuration.

Dynamic provisioning is the clearer starting point for multiple Gateways and nonstandard listener ports. This guide uses it.

## Install a Pinned Provisioner Manifest

The Contour 1.33 documentation says the Gateway provisioner manifest includes Gateway API's experimental channel. Pin the release rather than applying an unversioned branch, and review the cluster-scoped CRDs and RBAC before installation:

```bash
contour_release=v1.33.6
kubectl apply -f "https://raw.githubusercontent.com/projectcontour/contour/${contour_release}/examples/render/contour-gateway-provisioner.yaml"
```

Contour v1.33.6 builds against Gateway API v1.3.0. Before applying its bundled CRDs to a cluster that already has Gateway API or another Gateway controller, compare versions and follow the supported upgrade path. Do not accidentally downgrade shared CRDs.

Installing experimental CRDs is a cluster-level platform decision. In Gateway API v1.3, `TLSRoute` and `TCPRoute` are experimental. If the cluster permits only the standard channel, Contour can disable their informers. Standard HTTP and gRPC routing can still be used, but choose that installation mode deliberately.

Wait for the provisioner before creating a Gateway:

```bash
kubectl -n projectcontour rollout status deployment/contour-gateway-provisioner
```

Names can vary when an installation is rendered or packaged differently. Inspect the applied manifest if that Deployment name is not present.

## Define the GatewayClass and Gateway

Contour's default Gateway controller name is `projectcontour.io/gateway-controller`:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: contour
spec:
  controllerName: projectcontour.io/gateway-controller
---
apiVersion: v1
kind: Namespace
metadata:
  name: storefront
  labels:
    gateway-access: public
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: public
  namespace: projectcontour
spec:
  gatewayClassName: contour
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    hostname: shop.example.com
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: shop-example-com
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            gateway-access: public
```

Create the `shop-example-com` TLS Secret in the Gateway's `projectcontour` namespace. A `certificateRef` to a Secret in another namespace needs explicit cross-namespace permission and increases operational complexity. Keeping the listener certificate beside the Gateway is the simplest model. cert-manager can manage the Secret there.

The namespace selector limits who can attach routes. `from: All` is easy to demonstrate but broad in a shared cluster. A selector plus namespace-label admission controls gives the platform team an auditable attachment boundary.

Gateway names must be 63 characters or fewer for Contour's generated resource names.

## Attach an HTTPRoute

The application team creates its route in the `storefront` namespace and explicitly names the cross-namespace parent:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: storefront
  namespace: storefront
spec:
  parentRefs:
  - name: public
    namespace: projectcontour
    sectionName: https
  hostnames:
  - shop.example.com
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    backendRefs:
    - name: storefront
      port: 8080
```

This example requires an existing `storefront` Service in the `storefront` namespace, exposing Service port `8080` and selecting ready application Pods. The backend port is the Service port, not necessarily the Pod's container port. The Service reference is local to the HTTPRoute namespace. If a backend must live in another namespace, create a narrowly scoped `ReferenceGrant` in the backend namespace. Listener `allowedRoutes` controls route attachment; it does not authorize cross-namespace backend references.

The listener hostname and HTTPRoute hostname must intersect. A typo can leave the route unaccepted even when DNS and the Service are correct.

## Read Conditions in Dependency Order

Gateway API exposes failures through conditions rather than a single valid flag. Check the objects from infrastructure to route:

```bash
kubectl get gatewayclass contour -o yaml
kubectl -n projectcontour get gateway public -o yaml
kubectl -n storefront get httproute storefront -o yaml
```

Focus on:

1. `GatewayClass` has `Accepted=True` from Contour's controller.
2. `Gateway` reports `Accepted=True` and `Programmed=True`, and each listener has its own conditions.
3. `HTTPRoute` reports `Accepted=True` and `ResolvedRefs=True` for the named parent.
4. `Gateway.status.addresses` contains the address to publish in DNS.

Check that each condition's `observedGeneration` matches the resource's current `metadata.generation` so stale status is not mistaken for success.

Common reasons include a controller-name mismatch, a missing certificate Secret, an HTTPRoute namespace that does not match `allowedRoutes`, an incorrect `sectionName`, a backend Service or port that does not exist, or a missing `ReferenceGrant`.

Also inspect the dynamically created Contour and Envoy resources in the Gateway namespace:

```bash
kubectl -n projectcontour get deployment,daemonset,service,pod
```

The provisioner keeps Envoy listener ports and Service ports aligned with the Gateway. In static mode, the platform team must do that itself.

## Test Before Publishing DNS

Obtain the Gateway address and test with the intended hostname:

```bash
kubectl -n projectcontour get gateway public \
  -o jsonpath='{.status.addresses[0].value}{"\n"}'

curl --connect-to "shop.example.com:443:GATEWAY_ADDRESS:443" https://shop.example.com/
```

Replace `GATEWAY_ADDRESS` with the returned IP address or load-balancer hostname; enclose an IPv6 literal in square brackets. `--connect-to` preserves `shop.example.com` for HTTP routing, TLS SNI, and certificate verification.

Use a trusted certificate or provide a test CA to curl. Avoid `--insecure` as a permanent runbook step because it hides certificate and hostname failures.

Exercise an unattached namespace as a negative test. Its HTTPRoute should show that the listener did not allow attachment, and it must not become reachable through the Gateway.

## Plan Configuration and Upgrades

`GatewayClass.spec.parametersRef` can point to Contour's `ContourDeployment` resource to customize generated instances. Contour follows Gateway API's template behavior: later changes to a GatewayClass or its parameters are not propagated to existing Gateways. Test parameters before creating production Gateways, and treat replacement or an explicitly planned migration as the way to adopt changed defaults.

Upgrading the Gateway provisioner upgrades the Contour and Envoy instances it controls. Stage the provisioner release, check Gateway conditions, and plan capacity for all generated data planes rather than treating it as a controller-only change.

## Conclusion

Use a pinned Contour Gateway provisioner when dynamic one-Gateway-to-one-data-plane management fits the cluster. Restrict route attachment by namespace, keep listener certificates near the Gateway, and read GatewayClass, Gateway, listener, and HTTPRoute conditions in dependency order.

## Official Documentation

- [Project Contour 1.33 Gateway API implementation](https://projectcontour.io/docs/1.33/config/gateway-api/)
- [Project Contour 1.33 Gateway API guide](https://projectcontour.io/docs/1.33/guides/gateway-api/)
- [Project Contour 1.33 ContourDeployment API reference](https://projectcontour.io/docs/1.33/config/api-reference/#projectcontour.io/v1alpha1.ContourDeployment)
- [Project Contour v1.33.6 dependency manifest](https://github.com/projectcontour/contour/blob/v1.33.6/go.mod)
- [Gateway API GatewayClass](https://gateway-api.sigs.k8s.io/reference/api-types/gatewayclass/)
- [Gateway API Gateway](https://gateway-api.sigs.k8s.io/reference/api-types/gateway/)
- [Gateway API HTTPRoute](https://gateway-api.sigs.k8s.io/reference/api-types/httproute/)
- [Gateway API cross-namespace routing and ReferenceGrant](https://gateway-api.sigs.k8s.io/guides/multiple-ns/)
