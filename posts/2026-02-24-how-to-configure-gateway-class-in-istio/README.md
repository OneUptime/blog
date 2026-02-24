# How to Configure Gateway Class in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, GatewayClass, Kubernetes, Networking

Description: Learn how to configure GatewayClass resources in Istio, including custom parameters, multiple gateway classes, and understanding the role of GatewayClass in the Gateway API resource model.

---

GatewayClass is the foundation of the Kubernetes Gateway API resource model. It defines which controller is responsible for managing Gateway resources and can carry configuration that applies to all Gateways of that class. In the Istio context, GatewayClass tells Kubernetes that Istio should handle the traffic management for any Gateway that references it.

## The Role of GatewayClass

Think of GatewayClass like a StorageClass for networking. Just as StorageClass tells Kubernetes which storage provisioner to use, GatewayClass tells Kubernetes which gateway controller to use. In a cluster, you might have multiple GatewayClasses - one for Istio, one for another ingress controller, one for internal traffic, one for external traffic.

The resource hierarchy works like this:

1. **GatewayClass** - "Who implements this?" (Istio controller)
2. **Gateway** - "What ports and protocols?" (Infrastructure team creates these)
3. **HTTPRoute/TCPRoute/etc.** - "Where does traffic go?" (Application teams create these)

## The Default Istio GatewayClass

When you install Istio, it automatically registers a GatewayClass:

```bash
kubectl get gatewayclass
```

```
NAME    CONTROLLER                    ACCEPTED   AGE
istio   istio.io/gateway-controller   True       10m
```

You can inspect it:

```bash
kubectl get gatewayclass istio -o yaml
```

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: istio
spec:
  controllerName: istio.io/gateway-controller
status:
  conditions:
  - type: Accepted
    status: "True"
    message: "Handled by Istio controller"
```

The `controllerName: istio.io/gateway-controller` is the key field. This tells the Gateway API machinery that Istio's controller will handle any Gateway referencing this class.

## Creating Custom GatewayClasses

You might want different GatewayClasses for different purposes. For example, one for external-facing gateways and another for internal gateways:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: istio-external
spec:
  controllerName: istio.io/gateway-controller
  description: "External-facing gateways managed by Istio"
---
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: istio-internal
spec:
  controllerName: istio.io/gateway-controller
  description: "Internal gateways managed by Istio"
```

Both GatewayClasses use the same Istio controller, but they can have different configurations applied through parametersRef (covered below).

Now you can create Gateways that reference specific classes:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: public-api
  namespace: production
  annotations:
    networking.istio.io/service-type: LoadBalancer
spec:
  gatewayClassName: istio-external
  listeners:
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - name: public-cert
---
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: internal-api
  namespace: production
  annotations:
    networking.istio.io/service-type: ClusterIP
spec:
  gatewayClassName: istio-internal
  listeners:
  - name: http
    protocol: HTTP
    port: 80
```

The external gateway gets a LoadBalancer service, while the internal one gets a ClusterIP service, controlled by the annotation.

## GatewayClass Parameters

GatewayClass supports a `parametersRef` field that lets you attach custom configuration. Istio doesn't currently define a custom CRD for GatewayClass parameters, but you can use annotations on the Gateway resources themselves to pass configuration.

For Istio, the common way to customize Gateway behavior is through annotations on the Gateway resource:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: custom-gateway
  namespace: production
  annotations:
    # Control the service type
    networking.istio.io/service-type: LoadBalancer
    # Control the number of replicas
    autoscaling.istio.io/minReplicas: "2"
    autoscaling.istio.io/maxReplicas: "5"
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
```

## Understanding GatewayClass Status

GatewayClass has status conditions that tell you whether the controller accepted it:

```bash
kubectl get gatewayclass istio -o jsonpath='{.status.conditions}' | python3 -m json.tool
```

```json
[
  {
    "type": "Accepted",
    "status": "True",
    "reason": "Accepted",
    "message": "Handled by Istio controller"
  }
]
```

If `Accepted` is `False`, the controller doesn't recognize or can't handle the GatewayClass. Common reasons:
- Wrong `controllerName`
- Istio isn't installed or istiod isn't running
- Gateway API CRDs aren't installed

## Controlling Gateway Infrastructure

When Istio processes a Gateway resource, it creates the underlying infrastructure - a Deployment, Service, and ServiceAccount. You can influence how these are created using labels and annotations on the Gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: production
  labels:
    environment: production
  annotations:
    networking.istio.io/service-type: LoadBalancer
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All
```

After applying this, check what Istio created:

```bash
kubectl get deployment -n production | grep production-gateway
kubectl get service -n production | grep production-gateway
kubectl get serviceaccount -n production | grep production-gateway
```

The naming convention is `<gateway-name>-istio` for the created resources.

## Restricting Route Attachment

GatewayClass doesn't directly control which routes can attach to a Gateway, but the Gateway's `allowedRoutes` field does. This is part of the role-based model:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: istio-system
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            gateway-access: "true"
  - name: internal
    protocol: HTTP
    port: 8080
    allowedRoutes:
      namespaces:
        from: Same
```

The HTTP listener on port 80 allows routes from any namespace with the label `gateway-access: true`. The internal listener on port 8080 only allows routes from the same namespace as the Gateway.

Label the namespaces that should have access:

```bash
kubectl label namespace production gateway-access=true
kubectl label namespace staging gateway-access=true
```

## Multiple GatewayClasses in One Cluster

Having multiple GatewayClasses is common in larger organizations. You might have:

- `istio` for service mesh traffic
- `istio-waypoint` for Istio ambient mode waypoint proxies
- Another controller like `cilium` for certain workloads

Each GatewayClass operates independently:

```bash
kubectl get gatewayclass
```

```
NAME             CONTROLLER                    ACCEPTED   AGE
istio            istio.io/gateway-controller   True       30d
istio-waypoint   istio.io/gateway-controller   True       30d
```

Gateways reference whichever class fits their needs.

## Troubleshooting GatewayClass Issues

**GatewayClass not accepted:**

```bash
kubectl describe gatewayclass istio
```

Check the events and status conditions for error messages.

**Gateway stuck in pending:**

```bash
kubectl get gateway my-gateway -n production -o yaml
```

If the Gateway isn't becoming Programmed, check:
- Is the GatewayClass accepted?
- Are the Gateway API CRDs installed?
- Is istiod running and healthy?

```bash
kubectl logs deploy/istiod -n istio-system | grep -i gateway
```

**Wrong controller handling the Gateway:**

If you have multiple controllers in your cluster, make sure the `controllerName` in your GatewayClass matches the Istio controller exactly: `istio.io/gateway-controller`.

GatewayClass is a simple resource but it's the cornerstone of the Gateway API model. Getting it right sets the foundation for everything that follows - Gateways, routes, and the entire traffic management stack. Most of the time the default Istio GatewayClass just works, but understanding it helps when you need to set up more sophisticated configurations.
