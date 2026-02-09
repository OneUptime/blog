# How to implement Gateway resource for defining entry points

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, Entry Points

Description: Learn how to create and configure Gateway resources to define network entry points and load balancer configuration for your Kubernetes services.

---

The Gateway resource is where infrastructure meets configuration in the Gateway API. It defines the actual entry points into your cluster, specifying which ports to listen on, which protocols to support, and how to handle TLS. Think of it as the load balancer configuration that HTTPRoutes and other routes attach to for routing traffic to services.

## Understanding Gateway Resources

A Gateway represents a load balancer or proxy that accepts traffic from outside the cluster. It defines listeners on specific ports with specific protocols, and routes attach to these listeners to define how traffic gets routed to backend services.

Unlike Ingress resources that combine infrastructure and routing configuration, Gateway separates these concerns. Gateways handle infrastructure, while HTTPRoutes handle routing logic.

## Creating a Basic HTTP Gateway

Start with a simple Gateway that accepts HTTP traffic.

```yaml
# gateway-http.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: http-gateway
  namespace: default
spec:
  gatewayClassName: nginx-gateway
  listeners:
    - name: http
      protocol: HTTP
      port: 80
      allowedRoutes:
        namespaces:
          from: All
```

Apply and check status:

```bash
kubectl apply -f gateway-http.yaml

# Check Gateway status
kubectl get gateway http-gateway

# Get detailed status
kubectl describe gateway http-gateway
```

The Gateway provisions a load balancer and reports its address in the status.

## Configuring HTTPS with TLS Termination

Add HTTPS support with TLS certificate termination.

```yaml
# gateway-https.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: https-gateway
  namespace: default
spec:
  gatewayClassName: nginx-gateway
  listeners:
    - name: http
      protocol: HTTP
      port: 80
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - kind: Secret
            name: tls-certificate
            namespace: default

---
# Create TLS secret
apiVersion: v1
kind: Secret
metadata:
  name: tls-certificate
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: LS0tLS1CRUdJTi... # base64 encoded certificate
  tls.key: LS0tLS1CRUdJTi... # base64 encoded private key
```

The HTTPS listener terminates TLS and forwards unencrypted traffic to backends.

## Implementing Multi-Hostname Listeners

Configure different TLS certificates for different hostnames.

```yaml
# gateway-multi-hostname.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: multi-hostname-gateway
  namespace: default
spec:
  gatewayClassName: nginx-gateway
  listeners:
    # Listener for api.example.com
    - name: api-https
      protocol: HTTPS
      port: 443
      hostname: api.example.com
      tls:
        mode: Terminate
        certificateRefs:
          - name: api-tls-certificate

    # Listener for www.example.com
    - name: www-https
      protocol: HTTPS
      port: 443
      hostname: www.example.com
      tls:
        mode: Terminate
        certificateRefs:
          - name: www-tls-certificate

    # Fallback listener for other hostnames
    - name: default-https
      protocol: HTTPS
      port: 443
      hostname: "*.example.com"
      tls:
        mode: Terminate
        certificateRefs:
          - name: wildcard-tls-certificate
```

Routes can attach to specific listeners based on hostname matching.

## Controlling Route Attachment

Restrict which routes can attach to a Gateway using allowedRoutes.

```yaml
# gateway-restricted-routes.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production-gateway
  namespace: gateway-system
spec:
  gatewayClassName: nginx-gateway
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: prod-tls-certificate
      allowedRoutes:
        # Only allow routes from specific namespaces
        namespaces:
          from: Selector
          selector:
            matchLabels:
              environment: production
        # Only allow HTTPRoute and GRPCRoute
        kinds:
          - kind: HTTPRoute
          - kind: GRPCRoute
```

This Gateway only accepts routes from namespaces labeled `environment: production`.

## Implementing Cross-Namespace Gateway Access

Allow routes in different namespaces to use a centralized Gateway.

```yaml
# gateway-shared.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shared-gateway
  namespace: gateway-system
spec:
  gatewayClassName: nginx-gateway
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: shared-tls-certificate
      allowedRoutes:
        namespaces:
          from: All

---
# ReferenceGrant to allow cross-namespace access
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-routes-to-shared-gateway
  namespace: gateway-system
spec:
  from:
    - group: gateway.networking.k8s.io
      kind: HTTPRoute
      namespace: app-namespace
  to:
    - group: gateway.networking.k8s.io
      kind: Gateway
      name: shared-gateway
```

Teams can create HTTPRoutes in their namespaces that attach to the centralized Gateway.

## Configuring Multiple Ports and Protocols

Support multiple protocols on a single Gateway.

```yaml
# gateway-multi-protocol.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: multi-protocol-gateway
  namespace: default
spec:
  gatewayClassName: istio-gateway
  listeners:
    # HTTP listener
    - name: http
      protocol: HTTP
      port: 80

    # HTTPS listener
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: https-tls-certificate

    # TCP listener for database protocol
    - name: postgres
      protocol: TCP
      port: 5432

    # TLS passthrough for custom protocols
    - name: custom-tls
      protocol: TLS
      port: 9443
      tls:
        mode: Passthrough

    # UDP listener for custom protocol
    - name: custom-udp
      protocol: UDP
      port: 9000
```

Different route types attach to appropriate listeners based on protocol.

## Retrieving Gateway Load Balancer Address

Get the external address assigned to your Gateway.

```bash
# Get Gateway address
kubectl get gateway http-gateway -o jsonpath='{.status.addresses[0].value}'

# Wait for address to be assigned
kubectl wait --for=condition=Programmed gateway/http-gateway --timeout=300s

# Get complete address information
kubectl get gateway http-gateway -o jsonpath='{.status.addresses[*]}'

# Create DNS records using the address
GATEWAY_IP=$(kubectl get gateway http-gateway -o jsonpath='{.status.addresses[0].value}')
echo "Create A record: example.com -> $GATEWAY_IP"
```

## Monitoring Gateway Status and Conditions

Check Gateway health and readiness.

```bash
# Check all Gateway conditions
kubectl get gateway http-gateway -o jsonpath='{.status.conditions[*]}'

# Check if Gateway is programmed
kubectl get gateway http-gateway -o jsonpath='{.status.conditions[?(@.type=="Programmed")].status}'

# Check listener status
kubectl get gateway http-gateway -o jsonpath='{.status.listeners[*]}'

# Get attached routes count
kubectl get gateway http-gateway -o jsonpath='{.status.listeners[0].attachedRoutes}'
```

Monitor these conditions to ensure your Gateway operates correctly.

## Implementing Gateway with Service Annotations

Configure cloud-specific load balancer features through Gateway annotations.

```yaml
# gateway-aws-nlb.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: aws-nlb-gateway
  namespace: default
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-access-log-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-access-log-s3-bucket-name: "my-lb-logs"
spec:
  gatewayClassName: nginx-gateway
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: tls-certificate
```

Annotations control cloud provider-specific behavior.

## Setting Up Internal vs External Gateways

Create separate Gateways for internal and external traffic.

```yaml
# gateway-external.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: external-gateway
  namespace: default
  labels:
    scope: external
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  gatewayClassName: nginx-gateway
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: external-tls-certificate

---
# gateway-internal.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: internal-gateway
  namespace: default
  labels:
    scope: internal
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
spec:
  gatewayClassName: nginx-gateway
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: internal-tls-certificate
```

Routes attach to appropriate Gateways based on whether they serve internal or external traffic.

## Implementing Gateway with Custom Addresses

Specify custom IP addresses for Gateway load balancers.

```yaml
# gateway-static-ip.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: static-ip-gateway
  namespace: default
  annotations:
    service.beta.kubernetes.io/load-balancer-source-ranges: "10.0.0.0/8,172.16.0.0/12"
spec:
  gatewayClassName: nginx-gateway
  addresses:
    - type: IPAddress
      value: "203.0.113.42"
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: tls-certificate
```

This requests a specific IP address from the load balancer provider.

## Scaling Gateway Replicas

Control Gateway instance count through infrastructure parameters.

```yaml
# gateway-scaled.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: scaled-gateway
  namespace: default
  annotations:
    # Controller-specific annotations
    nginx.org/min-replicas: "2"
    nginx.org/max-replicas: "10"
    nginx.org/target-cpu-utilization: "80"
spec:
  gatewayClassName: nginx-gateway
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      tls:
        mode: Terminate
        certificateRefs:
          - name: tls-certificate
```

The controller autoscales Gateway instances based on traffic load.

## Best Practices for Gateway Configuration

Use descriptive names that indicate the Gateway's purpose, like `external-https-gateway` or `internal-api-gateway`.

Define separate Gateways for external and internal traffic to maintain clear security boundaries.

Use specific hostnames in listeners when possible rather than wildcards to improve routing precision.

Configure appropriate allowedRoutes restrictions to prevent unauthorized route attachment.

Monitor Gateway conditions and addresses to detect provisioning issues quickly.

Use ReferenceGrants judiciously to enable cross-namespace access while maintaining security.

Document Gateway purposes and ownership through labels and annotations.

Test Gateway configuration changes in non-production environments first.

Keep Gateway listener configuration simple. Complex routing logic belongs in HTTPRoutes, not Gateway listeners.

Version Gateway configurations alongside application deployments to track infrastructure changes.

Gateway resources define the entry points into your cluster and how traffic gets accepted. Proper Gateway configuration provides the foundation for flexible, secure traffic routing while maintaining clear separation between infrastructure and routing concerns.
