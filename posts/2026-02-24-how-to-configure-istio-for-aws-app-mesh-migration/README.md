# How to Configure Istio for AWS App Mesh Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AWS, App Mesh, Migration, Service Mesh, EKS

Description: Step-by-step migration strategy from AWS App Mesh to Istio service mesh including parallel running and traffic cutover approaches.

---

AWS App Mesh was Amazon's managed service mesh offering. With the announcement that App Mesh is transitioning, many teams are looking at migrating to Istio as their service mesh solution. The migration is not trivial because App Mesh and Istio use completely different proxy configurations, resource types, and traffic management paradigms. But with a structured approach, you can migrate incrementally without downtime.

## Understanding the Differences

App Mesh uses Envoy proxy (just like Istio), but the control plane and configuration model are different:

- App Mesh uses AWS API resources (Virtual Nodes, Virtual Services, Virtual Routers) while Istio uses Kubernetes CRDs (VirtualService, DestinationRule, Gateway)
- App Mesh injects the Envoy sidecar through a webhook tied to the `appmesh.k8s.aws/sidecarInjectorWebhook` annotation, while Istio uses namespace labels
- App Mesh routes traffic based on Virtual Nodes, while Istio routes based on Kubernetes services
- App Mesh mTLS is configured through the Virtual Node spec, while Istio uses PeerAuthentication and DestinationRule

## Migration Strategy Overview

The safest migration approach is namespace-by-namespace. You migrate one namespace at a time from App Mesh to Istio, running both meshes in the cluster during the transition.

Here is the high-level plan:

1. Install Istio alongside App Mesh
2. Migrate one namespace to Istio
3. Verify functionality
4. Repeat for remaining namespaces
5. Remove App Mesh components

## Step 1: Install Istio Alongside App Mesh

Both Istio and App Mesh inject sidecars via mutating webhooks, so they can coexist as long as each namespace is only managed by one mesh.

Install Istio but do not enable injection globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    outboundTrafficPolicy:
      mode: ALLOW_ANY
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "external"
          service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
          service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
```

```bash
istioctl install -f istio-migration.yaml -y
```

At this point, both control planes are running. App Mesh continues managing its namespaces, and Istio is ready to take over when you switch individual namespaces.

## Step 2: Map App Mesh Resources to Istio

Before migrating a namespace, map the existing App Mesh configuration to equivalent Istio resources.

An App Mesh Virtual Service like this:

```yaml
apiVersion: appmesh.k8s.aws/v1beta2
kind: VirtualService
metadata:
  name: order-service
  namespace: orders
spec:
  awsName: order-service.orders.svc.cluster.local
  provider:
    virtualRouter:
      virtualRouterRef:
        name: order-router
---
apiVersion: appmesh.k8s.aws/v1beta2
kind: VirtualRouter
metadata:
  name: order-router
  namespace: orders
spec:
  listeners:
  - portMapping:
      port: 8080
      protocol: http
  routes:
  - name: order-route
    httpRoute:
      match:
        prefix: /
      action:
        weightedTargets:
        - virtualNodeRef:
            name: order-v1
          weight: 80
        - virtualNodeRef:
            name: order-v2
          weight: 20
```

Becomes this in Istio:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
  namespace: orders
spec:
  hosts:
  - order-service
  http:
  - route:
    - destination:
        host: order-service
        subset: v1
      weight: 80
    - destination:
        host: order-service
        subset: v2
      weight: 20
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service
  namespace: orders
spec:
  host: order-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Step 3: Map App Mesh mTLS to Istio

If you had mTLS configured in App Mesh through Virtual Node TLS settings:

```yaml
apiVersion: appmesh.k8s.aws/v1beta2
kind: VirtualNode
metadata:
  name: order-v1
spec:
  listeners:
  - portMapping:
      port: 8080
      protocol: http
    tls:
      mode: STRICT
      certificate:
        acm:
          certificateARN: arn:aws:acm:...
```

The Istio equivalent is:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: order-mtls
  namespace: orders
spec:
  selector:
    matchLabels:
      app: order-service
  mtls:
    mode: STRICT
```

Istio handles certificate issuance automatically through its built-in CA, so you do not need to manage ACM certificates for mTLS.

## Step 4: Migrate the First Namespace

Pick a low-risk namespace to start with. Here are the steps:

Remove App Mesh injection from the namespace:

```bash
kubectl label namespace orders appmesh.k8s.aws/sidecarInjectorWebhook-
kubectl annotate namespace orders appmesh.k8s.aws/mesh-
```

Enable Istio injection:

```bash
kubectl label namespace orders istio-injection=enabled
```

Apply the Istio resources you created in the mapping step:

```bash
kubectl apply -f istio-resources/orders/
```

Now restart the deployments to swap the sidecar:

```bash
kubectl rollout restart deployment -n orders
```

Each pod will restart with the Istio sidecar instead of the App Mesh sidecar. Do this during a maintenance window for the first migration, even though rolling restarts should not cause downtime.

## Step 5: Handle Cross-Mesh Communication

During migration, you will have some namespaces on App Mesh and some on Istio. They need to communicate. Since both use Envoy under the hood, the actual protocol is the same. The key is that Istio-managed services should be able to reach App Mesh services through standard Kubernetes DNS names.

Set Istio's outbound traffic policy to ALLOW_ANY (we did this in the IstioOperator config). This means the Istio sidecar will let traffic through to non-mesh services without requiring mTLS.

For services migrated to Istio that need to call App Mesh services, create a DestinationRule that disables mTLS for those calls:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: appmesh-service
  namespace: orders
spec:
  host: payment-service.payments.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

Once the payments namespace is also migrated to Istio, you remove this DestinationRule and mTLS kicks in automatically.

## Step 6: Migrate the Ingress

App Mesh uses a Virtual Gateway for ingress, while Istio uses the Istio Ingress Gateway. You can run both temporarily:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: app-gateway
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app-tls
    hosts:
    - "app.example.com"
```

Update your DNS to point to the Istio gateway's load balancer. You can use weighted DNS records in Route 53 to gradually shift traffic:

```bash
# Point 10% to Istio initially
aws route53 change-resource-record-sets --hosted-zone-id Z123 --change-batch '{
  "Changes": [{
    "Action": "UPSERT",
    "ResourceRecordSet": {
      "Name": "app.example.com",
      "Type": "A",
      "SetIdentifier": "istio",
      "Weight": 10,
      "AliasTarget": {
        "HostedZoneId": "Z456",
        "DNSName": "istio-nlb.example.com",
        "EvaluateTargetHealth": true
      }
    }
  }]
}'
```

Gradually increase the weight to Istio and decrease the weight to App Mesh.

## Step 7: Clean Up App Mesh

Once all namespaces are migrated and traffic is fully on Istio:

```bash
# Delete App Mesh resources
kubectl delete virtualservices --all -A
kubectl delete virtualrouters --all -A
kubectl delete virtualnodes --all -A
kubectl delete mesh --all

# Remove App Mesh controller
helm uninstall appmesh-controller -n appmesh-system
kubectl delete namespace appmesh-system
```

## Post-Migration Validation

After migration, validate your mesh is working correctly:

```bash
# Check all sidecars are Istio
istioctl proxy-status

# Verify mTLS is active
istioctl authn tls-check <pod-name> <service>

# Check for errors
kubectl logs -n istio-system -l app=istiod | grep -i error
```

Migrating from App Mesh to Istio takes careful planning, but the namespace-by-namespace approach minimizes risk. Map your resources before you start, handle cross-mesh communication during the transition, and clean up App Mesh resources once you are fully migrated. The result is a more portable, feature-rich service mesh that is not tied to a single cloud provider.
