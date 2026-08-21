# How to Sync vCluster Ingresses to a Shared Host-Cluster Ingress Controller

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VCluster, Kubernetes, Ingress, Multi-Tenancy, Networking

Description: Publish tenant Ingress resources through a host-cluster controller while preserving translated Service references and platform ownership.

---

A vCluster on shared nodes has its own Kubernetes API, but its workload Pods and Services are synchronized into the control plane cluster. An Ingress created only in the tenant API is therefore invisible to a controller that watches the control plane cluster unless Ingress synchronization is enabled.

This guide targets vCluster **0.36**. Ingress sync remains supported, although vCluster recommends Gateway API for new routing designs. The official Ingress sync documentation also cautions that a separate controller per tenant is the isolation-friendly model. A single shared controller can process synchronized Ingresses only when the controller supports the design and the platform enforces hostname, class, annotation, and namespace policy centrally.

## Decide Whether Sharing Is Appropriate

Use a shared host controller when all of the following are true:

- Tenants are trusted or host-side admission restricts dangerous Ingress annotations.
- A platform team owns the IngressClass, load balancer, TLS policy, and DNS suffix.
- Duplicate hostnames are rejected before they reach the controller.
- The controller watches the namespaces into which vCluster writes translated resources.
- The controller's supported tenancy model permits multiple tenants.

Use a controller per vCluster, Gateway API with imported shared Gateways and configured per-tenant `allowedRoutes` namespace and hostname restrictions, or separate data planes when tenants must not influence one another's routes.

## Enable Ingress Synchronization

Add this to `vcluster.yaml`:

```yaml
sync:
  toHost:
    ingresses:
      enabled: true
```

Apply the change:

```bash
vcluster create team-blue \
  --namespace team-blue-vcluster \
  --upgrade \
  --connect=false \
  --values vcluster.yaml
```

Ingress synchronization is disabled by default. Services, Endpoints, and EndpointSlices are enabled by default, so the translated backend Service and its endpoints are available in the control plane cluster. Do not hard-code the translated Service name yourself; create the Ingress against the normal tenant Service name.

## Create the Tenant Workload and Ingress

Apply the following while connected to the tenant cluster:

```yaml
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
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: nginx:1.30.4
          ports:
            - name: http
              containerPort: 80
---
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
      targetPort: http
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  namespace: apps
spec:
  ingressClassName: shared-nginx
  rules:
    - host: team-blue.apps.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80
```

```bash
kubectl apply -f web.yaml
kubectl describe ingress web -n apps
```

The tenant object remains readable in its original form. The syncer creates a host-side Ingress with a translated name and rewrites its backend to the translated Service.

## Inspect the Host-Side Result

Switch to the control plane cluster and locate resources by vCluster-managed labels instead of assuming a naming formula:

```bash
kubectl get ingress,service,pod -A \
  -l vcluster.loft.sh/managed-by

kubectl get ingress -A \
  -o custom-columns='NAMESPACE:.metadata.namespace,NAME:.metadata.name,CLASS:.spec.ingressClassName,HOST:.spec.rules[0].host,SERVICE:.spec.rules[0].http.paths[0].backend.service.name'
```

Then inspect the selected Ingress and verify that its backend Service has ready endpoints:

```bash
kubectl describe ingress -n team-blue-vcluster <translated-ingress-name>
kubectl get endpointslice -n team-blue-vcluster \
  -l kubernetes.io/service-name=<translated-service-name> \
  -o custom-columns='NAME:.metadata.name,ENDPOINTS:.endpoints[*].addresses[*],READY:.endpoints[*].conditions.ready'
```

The controller must watch `team-blue-vcluster` (or each mapped namespace when namespace sync is enabled) and recognize `shared-nginx`. A controller restricted to another namespace will never reconcile the object even though synchronization succeeded.

## Put Guardrails Around the Shared Controller

Ingress is an infrastructure claim, not merely an application manifest. Enforce these controls in the control plane cluster:

- Allow only an approved `spec.ingressClassName`.
- Restrict `spec.rules[*].host` and `spec.tls[*].hosts` to the tenant's assigned DNS suffix.
- Reject duplicate hostname and path ownership across tenants.
- Allowlist controller annotations; snippets and implementation-specific passthrough features can change the controller's behavior substantially.
- Restrict TLS Secret references and define which component issues certificates.
- Apply ResourceQuota to bound LoadBalancer Services and other synced objects.

vCluster patching can transform an Ingress during synchronization, but patches are an enterprise feature and should not replace host-side admission for security boundaries. A host-side validating webhook or policy engine with cluster-wide state sees the final translated object and can evaluate conflicts across all tenants.

## Troubleshoot in the Correct Layer

Use this order:

1. In the tenant cluster, run `kubectl describe ingress` and inspect Warning events.
2. In the control plane cluster, confirm the translated Ingress exists.
3. Verify its translated Service and EndpointSlices exist and select running Pods.
4. Check the IngressClass and the shared controller's namespace watch settings.
5. Read controller events and logs.
6. Confirm DNS points at the controller load balancer and test with an explicit Host header.

```bash
curl -H 'Host: team-blue.apps.example.com' http://<controller-address>/
```

If the tenant object exists but no host object appears, check the vCluster control-plane logs and confirm `sync.toHost.ingresses.enabled` reached the installed release. If the host Ingress exists but has no address, the problem is now in the host controller, class, admission, or data-plane configuration.

## Official Documentation

- [vCluster: Sync Ingresses to the control plane cluster](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/to-host/networking/ingresses)
- [vCluster: How synchronization works](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/sync/)
- [vCluster: Shared-node security hardening](https://www.vcluster.com/docs/vcluster/security/shared-nodes-hardening)
- [Kubernetes: Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [Kubernetes: IngressClass](https://kubernetes.io/docs/concepts/services-networking/ingress/#ingress-class)

## Conclusion

Enable Ingress sync so vCluster can create and translate the host-side routing object, then let the control plane controller reconcile that result. A shared controller is safe only with explicit admission and ownership rules; otherwise use the per-tenant controller model documented by vCluster or move new routes to Gateway API.
