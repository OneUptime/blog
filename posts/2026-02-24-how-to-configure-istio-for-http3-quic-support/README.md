# How to Configure Istio for HTTP/3 QUIC Support

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, HTTP/3, QUIC, Service Mesh, Envoy, Kubernetes

Description: Learn how to enable and configure HTTP/3 QUIC protocol support in Istio service mesh for faster, more reliable connections.

---

HTTP/3 built on top of QUIC has been gaining serious traction in production environments. If you are running Istio, you might be wondering how to take advantage of the reduced latency and improved connection handling that QUIC brings to the table. The good news is that Istio's underlying Envoy proxy has experimental support for HTTP/3, and you can configure your mesh to use it.

This guide walks through the practical steps to get HTTP/3 working with Istio on your Kubernetes cluster.

## What Makes HTTP/3 Different

HTTP/3 replaces TCP with QUIC as the transport layer. QUIC runs over UDP and bakes in TLS 1.3 by default. The practical benefits you will notice include faster connection establishment (0-RTT in many cases), no head-of-line blocking at the transport layer, and better behavior when clients switch networks (think mobile users moving between WiFi and cellular).

For service mesh traffic, this can mean lower tail latencies and more resilient connections, especially in environments with high packet loss or frequent connection churn.

## Prerequisites

Before you start, make sure you have:

- Istio 1.18 or later installed (HTTP/3 support improved significantly in recent versions)
- A Kubernetes cluster with UDP load balancer support
- `istioctl` installed and configured

Check your Istio version first:

```bash
istioctl version
```

## Enabling HTTP/3 on Istio Ingress Gateway

The primary use case for HTTP/3 in Istio is at the ingress gateway, where external clients connect to your services. You need to configure the gateway to listen on UDP for QUIC traffic alongside the existing TCP listener.

First, update your Istio installation to enable the QUIC listener on the gateway. You can do this through the IstioOperator configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_ENABLE_QUIC_LISTENERS: "true"
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          service:
            ports:
              - name: https
                port: 443
                targetPort: 8443
                protocol: TCP
              - name: http3
                port: 443
                targetPort: 8443
                protocol: UDP
          hpaSpec:
            minReplicas: 2
```

Apply this with:

```bash
istioctl install -f istio-http3-config.yaml
```

Notice the key detail here: both TCP and UDP listeners share port 443. This is how HTTP/3 Alt-Svc discovery works. Clients first connect over HTTP/2 on TCP, receive an Alt-Svc header advertising HTTP/3 support, and then upgrade to QUIC over UDP on subsequent requests.

## Configuring the Gateway Resource

Next, create a Gateway resource that handles the HTTPS traffic. The Gateway itself does not change much since the QUIC protocol negotiation happens at the Envoy level:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: my-tls-credential
      hosts:
        - "app.example.com"
```

Make sure your TLS certificate is stored as a Kubernetes secret in the same namespace as the gateway:

```bash
kubectl create secret tls my-tls-credential \
  --cert=cert.pem \
  --key=key.pem \
  -n istio-system
```

## Setting Up the VirtualService

Route traffic from the gateway to your backend service as you normally would:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app-vs
spec:
  hosts:
    - "app.example.com"
  gateways:
    - istio-system/my-gateway
  http:
    - route:
        - destination:
            host: my-app-service
            port:
              number: 80
```

## Using EnvoyFilter for Fine-Grained QUIC Settings

If you need more control over the HTTP/3 behavior, you can use an EnvoyFilter to tweak the QUIC settings:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: http3-settings
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: FILTER_CHAIN
      match:
        context: GATEWAY
        listener:
          portNumber: 8443
          filterChain:
            transportProtocol: quic
      patch:
        operation: MERGE
        value:
          transportSocket:
            name: envoy.transport_sockets.quic
            typedConfig:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.quic.v3.QuicDownstreamTransport
```

## Verifying HTTP/3 Is Working

After deploying everything, you can verify HTTP/3 is active using curl (version 7.88 or later with HTTP/3 support):

```bash
curl --http3 -v https://app.example.com/
```

You should see something like `using HTTP/3` in the verbose output. If your curl build does not support HTTP/3, you can also check using browser developer tools. Chrome and Firefox both show the protocol version in the Network tab.

Another way to verify is checking the Envoy stats:

```bash
kubectl exec -n istio-system deploy/istio-ingressgateway \
  -- curl -s localhost:15000/stats | grep http3
```

Look for counters like `http3.downstream.rx` and `http3.downstream.tx` incrementing.

## Load Balancer Considerations

One tricky part of running HTTP/3 in Kubernetes is the load balancer. Your cloud provider needs to support UDP on the load balancer. On AWS, Network Load Balancers (NLB) support UDP. On GCP, external network load balancers work. Standard HTTP load balancers typically do not support UDP.

Make sure your Service annotation reflects this. For example, on AWS:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  ports:
    - name: https
      port: 443
      targetPort: 8443
      protocol: TCP
    - name: http3
      port: 443
      targetPort: 8443
      protocol: UDP
```

## Connection Migration

One of the most useful features of QUIC is connection migration. When a client's IP address changes (like a phone switching from WiFi to cellular), the QUIC connection survives. This is handled automatically by the protocol, and Envoy supports it out of the box once QUIC is enabled.

You do not need any special Istio configuration for connection migration to work. Just make sure your load balancer supports it and does not terminate connections based solely on the source IP changing.

## Troubleshooting

If HTTP/3 is not working, check these common issues:

1. **UDP blocked by firewall**: Make sure your security groups and network policies allow UDP traffic on port 443.

2. **Load balancer does not support UDP**: Verify your cloud LB type supports UDP.

3. **Old Istio version**: HTTP/3 support is experimental in older versions. Upgrade to at least 1.18.

4. **Certificate issues**: QUIC requires TLS 1.3. Make sure your certificates are valid and properly configured.

Check the gateway logs for errors:

```bash
kubectl logs -n istio-system deploy/istio-ingressgateway -f
```

## Performance Expectations

In testing, HTTP/3 with QUIC typically shows the most improvement in high-latency or lossy network conditions. If your clients are all on the same local network, you might not see much difference. But for internet-facing services where clients are spread across different networks and geographies, the connection establishment savings alone can be significant.

Keep in mind that HTTP/3 support in Istio is still evolving. Check the Istio release notes for your specific version to understand what is fully supported and what is still experimental.

## Wrapping Up

Getting HTTP/3 running in Istio takes a bit of configuration across multiple resources, but the process is fairly straightforward once you understand the moving parts. The key pieces are enabling QUIC listeners in the mesh config, making sure your load balancer supports UDP, and having proper TLS certificates in place. From there, Envoy handles the protocol negotiation automatically, and your clients can start benefiting from faster connections.
