# How to Publish vCluster Gateway API Routes Through a Host-Cluster Gateway

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Gateway API, HTTPRoute, Multi-Tenancy

Description: Import an administrator-owned Gateway into a vCluster and safely synchronize tenant HTTPRoutes to the control plane cluster.

---

Gateway API separates infrastructure ownership from application routing. A platform team can operate the Gateway controller, listeners, certificates, and public addresses in the control plane cluster, while a tenant creates an `HTTPRoute` next to its Service inside vCluster. vCluster translates the route's Gateway and Service references when it synchronizes the route outward.

This guide uses the stable vCluster **0.36** native Gateway API sync. Do not use generic custom-resource sync for core `Gateway`, `HTTPRoute`, `TLSRoute`, `ReferenceGrant`, or `BackendTLSPolicy` resources; vCluster provides reference-aware native sync for them.

## Prepare the Shared Gateway

Install the Gateway API CRDs and a conformant Gateway controller in the control plane cluster. Create a `GatewayClass` and `Gateway` owned by the platform team, and label both for tenant visibility:

```bash
kubectl label gatewayclass shared-gateway \
  platform.example.com/tenant-visible=true

kubectl label gateway public-web -n platform-gateways \
  platform.example.com/tenant-visible=true
```

The Gateway listener must allow routes from the host namespace into which vCluster synchronizes them. In a production platform, use a namespace selector rather than `from: All`, and combine it with vCluster's imported-Gateway hostname and virtual namespace policy.

## Configure Gateway Import and Route Sync

Add this to the tenant's `vcluster.yaml`:

```yaml
sync:
  fromHost:
    gatewayClasses:
      enabled: true
      selector:
        matchLabels:
          platform.example.com/tenant-visible: "true"
    gateways:
      enabled: true
      selector:
        matchLabels:
          platform.example.com/tenant-visible: "true"
      mappings:
        byName:
          "platform-gateways/public-web": "shared-gateways/public-web"
      allowedRoutes:
        overrides:
          - hostNamespace: platform-gateways
            name: public-web
            allowedHostnames:
              - "*.team-blue.apps.example.com"
            virtualNamespacePolicy:
              from: Selector
              selector:
                matchLabels:
                  platform.example.com/gateway-access: "true"
  toHost:
    gatewayApi:
      httpRoutes:
        enabled: true
```

This configuration imports the selected class and Gateway as read-only tenant objects, maps the host Gateway to a tenant-facing name, restricts hostnames, and enables `HTTPRoute` synchronization. `allowedRoutes` here is vCluster's tenant-facing and translation policy; the real Gateway listener's `spec.listeners[*].allowedRoutes` remains an independent host-side authorization check. Both must permit the attachment.

Apply the configuration:

```bash
vcluster create team-blue \
  --namespace team-blue-vcluster \
  --upgrade \
  --connect=false \
  --values vcluster.yaml
```

## Verify the Imported Gateway

In the tenant cluster:

```bash
kubectl get gatewayclass
kubectl get gateway -n shared-gateways
kubectl describe gateway public-web -n shared-gateways
```

The imported Gateway is read-only. If it is absent, verify the host labels, selectors, mapping, Gateway API CRDs, and vCluster logs. Do not create another tenant Gateway with the same purpose; that changes the ownership model.

## Create a Route to a Tenant Service

Label the tenant namespace so it satisfies `virtualNamespacePolicy`:

```bash
kubectl create namespace apps
kubectl label namespace apps \
  platform.example.com/gateway-access=true
```

Create a Service and route:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: apps
spec:
  selector:
    app: web
  ports:
    - name: http
      port: 80
      targetPort: 8080
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web
  namespace: apps
spec:
  parentRefs:
    - name: public-web
      namespace: shared-gateways
  hostnames:
    - api.team-blue.apps.example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: web
          port: 80
```

Apply it alongside the Deployment that selects `app: web`:

```bash
kubectl apply -f route.yaml
kubectl describe httproute web -n apps
```

Look for `Accepted=True` and `ResolvedRefs=True` under `status.parents[*].conditions`. `Accepted=False` normally points to a listener or attachment-policy problem. `ResolvedRefs=False` normally points to a missing Service, invalid port, unsupported reference kind, or missing `ReferenceGrant` for a cross-namespace backend.

No `ReferenceGrant` is required merely because a Route attaches to a Gateway in another namespace; Gateway listener `allowedRoutes` controls that relationship. A `ReferenceGrant` is required when a backend or other ordinary object reference crosses namespaces.

## Inspect the Translated Route

On the control plane cluster, find the synchronized route by management labels and inspect the rewritten references:

```bash
kubectl get httproute -A \
  -l vcluster.loft.sh/managed-by

kubectl describe httproute -n team-blue-vcluster \
  <translated-route-name>
```

The host route should reference the real `platform-gateways/public-web` Gateway and the translated host Service. Do not patch these generated references manually; the syncer owns them.

Point DNS for `api.team-blue.apps.example.com` to the Gateway address, then test the listener:

```bash
kubectl get gateway public-web -n platform-gateways \
  -o jsonpath='{.status.addresses[*].value}{"\n"}'

curl --resolve api.team-blue.apps.example.com:443:<gateway-address> \
  https://api.team-blue.apps.example.com/
```

## Troubleshooting Checklist

- Confirm CRDs exist for every enabled route kind and the controller supports them.
- Confirm the imported Gateway and GatewayClass selectors match host labels.
- Confirm the tenant namespace matches the vCluster virtual namespace policy.
- Confirm the hostname matches `allowedHostnames` and the Gateway listener hostname.
- Confirm the host listener allows the translated route namespace.
- Check tenant Warning events; vCluster records native sync and reference validation failures there.
- Check controller-specific route conditions on the host object.
- Use `ReferenceGrant` only for an actual cross-namespace object reference, and create it in the referenced object's namespace.

## Official Documentation

- [vCluster: Gateway API](https://www.vcluster.com/docs/vcluster/key-features/gateway-api)
- [vCluster: Import Gateways and GatewayClasses](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/from-host/gateways)
- [vCluster: Resolve Gateway API sync errors](https://www.vcluster.com/docs/vcluster/troubleshoot/gateway-api-sync)
- [Gateway API: HTTPRoute](https://gateway-api.sigs.k8s.io/reference/api-types/httproute/)
- [Gateway API: Cross-namespace routing](https://gateway-api.sigs.k8s.io/guides/multiple-ns/)

## Conclusion

Import the platform-owned Gateway, synchronize only the tenant's route, and enforce attachment in both vCluster and the host listener. Native Gateway API sync keeps translated references consistent and surfaces useful route conditions, while the ownership split lets platform and application teams change their respective resources independently.
