# How to Set Up TLS Passthrough in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TLS, Passthrough, Ingress Gateway, Security

Description: How to configure TLS passthrough in Istio so the ingress gateway forwards encrypted traffic directly to backend services without termination.

---

TLS passthrough means the Istio ingress gateway forwards the encrypted TLS traffic directly to the backend service without decrypting it. The gateway looks at the SNI (Server Name Indication) in the TLS ClientHello message to route traffic but never sees the actual content. The backend application handles TLS termination itself.

This is useful when the backend service must manage its own certificates, when you need end-to-end encryption that the gateway cannot inspect, or when regulatory requirements prohibit TLS termination at intermediate points.

## How TLS Passthrough Differs from TLS Termination

In standard TLS termination, the gateway decrypts traffic, inspects it, and re-encrypts it (or forwards plaintext) to the backend:

```mermaid
graph LR
    Client -->|TLS| GW[Gateway - terminates TLS]
    GW -->|plaintext or re-encrypted| Backend
```

With TLS passthrough, the gateway simply forwards the encrypted bytes:

```mermaid
graph LR
    Client -->|TLS| GW[Gateway - passes through]
    GW -->|TLS unchanged| Backend[Backend - terminates TLS]
```

The gateway cannot see HTTP headers, paths, or body content because the traffic is still encrypted. This means HTTP-level routing (path-based, header-based) is not available with TLS passthrough - only SNI-based routing works.

## Basic TLS Passthrough Configuration

### Step 1: Configure the Gateway

Set the TLS mode to PASSTHROUGH on the Gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: passthrough-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: tls
        protocol: TLS
      tls:
        mode: PASSTHROUGH
      hosts:
        - "secure-app.example.com"
```

Note the protocol is `TLS` (not `HTTPS`). This is important because HTTPS implies HTTP-level processing, while TLS means raw TCP with TLS.

### Step 2: Create the VirtualService

Route traffic to the backend using a TLS route (not an HTTP route):

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: secure-app
  namespace: default
spec:
  hosts:
    - "secure-app.example.com"
  gateways:
    - istio-system/passthrough-gateway
  tls:
    - match:
        - port: 443
          sniHosts:
            - "secure-app.example.com"
      route:
        - destination:
            host: secure-app-service
            port:
              number: 8443
```

The VirtualService uses a `tls` routing section instead of `http`. The `sniHosts` field matches the SNI in the incoming TLS ClientHello.

### Step 3: Configure the Backend Service

Your backend service needs to handle TLS termination. Here is an example with nginx:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secure-app
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: secure-app
  template:
    metadata:
      labels:
        app: secure-app
    spec:
      containers:
        - name: nginx
          image: nginx:latest
          ports:
            - containerPort: 8443
          volumeMounts:
            - name: tls-certs
              mountPath: /etc/nginx/certs
              readOnly: true
            - name: nginx-config
              mountPath: /etc/nginx/conf.d
      volumes:
        - name: tls-certs
          secret:
            secretName: secure-app-tls
        - name: nginx-config
          configMap:
            name: nginx-tls-config
---
apiVersion: v1
kind: Service
metadata:
  name: secure-app-service
  namespace: default
spec:
  selector:
    app: secure-app
  ports:
    - name: https
      port: 8443
      targetPort: 8443
```

The nginx configuration for TLS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-tls-config
  namespace: default
data:
  default.conf: |
    server {
        listen 8443 ssl;
        server_name secure-app.example.com;
        ssl_certificate /etc/nginx/certs/tls.crt;
        ssl_certificate_key /etc/nginx/certs/tls.key;
        ssl_protocols TLSv1.2 TLSv1.3;
        location / {
            return 200 'Hello from TLS passthrough!\n';
            add_header Content-Type text/plain;
        }
    }
```

## SNI-Based Routing with Multiple Backends

Since TLS passthrough only has access to the SNI, you route different domains to different backends:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: multi-passthrough-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: tls
        protocol: TLS
      tls:
        mode: PASSTHROUGH
      hosts:
        - "app1.example.com"
        - "app2.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: multi-passthrough-routing
  namespace: default
spec:
  hosts:
    - "app1.example.com"
    - "app2.example.com"
  gateways:
    - istio-system/multi-passthrough-gateway
  tls:
    - match:
        - sniHosts:
            - "app1.example.com"
      route:
        - destination:
            host: app1-service
            port:
              number: 8443
    - match:
        - sniHosts:
            - "app2.example.com"
      route:
        - destination:
            host: app2-service
            port:
              number: 8443
```

## AUTO_PASSTHROUGH Mode

Istio also supports AUTO_PASSTHROUGH, which routes traffic based on SNI without needing a VirtualService. This is primarily used in multi-cluster setups where the SNI encodes the destination cluster and service:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: auto-passthrough-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
    - port:
        number: 15443
        name: tls
        protocol: TLS
      tls:
        mode: AUTO_PASSTHROUGH
      hosts:
        - "*.local"
```

AUTO_PASSTHROUGH uses Istio's internal SNI format (`outbound_.port_._.hostname_`) to route traffic automatically. You almost never need to configure this manually - it is set up by `istioctl` when configuring multi-cluster.

## TLS Passthrough with Sidecar Injection

If the backend pod has an Istio sidecar, you need to be careful about double encryption. The client's TLS connection passes through the gateway to the sidecar, which might try to add its own mTLS layer.

To avoid issues, disable Istio's protocol detection for the passthrough port or explicitly mark the port protocol:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: secure-app-service
  namespace: default
spec:
  selector:
    app: secure-app
  ports:
    - name: tls-passthrough
      port: 8443
      targetPort: 8443
      appProtocol: tls
```

Using `tls` as the port name prefix or setting `appProtocol: tls` tells Istio to treat this as an opaque TLS connection and not try to add mTLS on top.

## Testing TLS Passthrough

Test from outside the cluster:

```bash
# Verify the TLS connection goes through to the backend
curl -v --resolve "secure-app.example.com:443:<gateway-external-ip>" \
  https://secure-app.example.com

# Check the certificate - it should be from the backend, NOT from the gateway
echo | openssl s_client -connect <gateway-external-ip>:443 \
  -servername secure-app.example.com 2>/dev/null | \
  openssl x509 -text -noout | grep "Subject:"
```

The certificate should show the backend's certificate details, not anything from Istio. This confirms the gateway is passing traffic through without termination.

## Troubleshooting

**Connection times out**: Check that the backend service is listening on TLS on the correct port. Also verify the gateway pod can reach the backend:

```bash
kubectl exec istio-ingressgateway-xxxx -n istio-system -- \
  openssl s_client -connect secure-app-service.default:8443 -servername secure-app.example.com
```

**Wrong certificate presented**: If you see an Istio certificate instead of the backend's certificate, the gateway might be terminating TLS instead of passing through. Double-check the Gateway mode is PASSTHROUGH and the protocol is TLS.

**SNI routing not matching**: Ensure the client sends the correct SNI. Check the gateway logs:

```bash
kubectl logs istio-ingressgateway-xxxx -n istio-system | grep "secure-app"
```

**VirtualService not matching**: The `sniHosts` in the VirtualService must exactly match the hosts in the Gateway. Wildcards work in the Gateway hosts but the VirtualService sniHosts should match what the client sends.

TLS passthrough is a straightforward configuration in Istio, but it trades off HTTP-level features (path routing, header manipulation, retries) for end-to-end encryption integrity. Use it when you need the backend to own its TLS certificates and when you do not need HTTP-level gateway features for that particular traffic flow.
