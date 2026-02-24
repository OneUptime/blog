# How to Configure Istio Ingress with GCP Load Balancer

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GCP, Google Cloud, Load Balancer, Kubernetes, GKE

Description: How to configure Istio Ingress Gateway with Google Cloud Platform load balancers on GKE clusters for production traffic management.

---

Google Kubernetes Engine has tight integration with GCP load balancers, and when you deploy Istio on GKE, the ingress gateway automatically gets a GCP Network Load Balancer. But there are several ways to configure this, and choosing the right approach matters for performance, cost, and functionality.

This guide covers how to set up Istio's ingress gateway with different GCP load balancer types and get everything working correctly in production.

## Default Behavior on GKE

When you install Istio on GKE and create the `istio-ingressgateway` service with type `LoadBalancer`, GKE automatically provisions a GCP Network Load Balancer (Layer 4). You can see it:

```bash
kubectl get svc istio-ingressgateway -n istio-system
```

The external IP will be a regional static IP managed by GCP. This default setup works for most use cases, but you might want to customize it.

## Using a Static IP Address

By default, GKE assigns an ephemeral IP. For production, you want a static IP so your DNS records don't break when the load balancer is recreated.

First, reserve a static IP in GCP:

```bash
gcloud compute addresses create istio-ingress-ip \
  --region us-central1 \
  --project my-project
```

Get the reserved IP:

```bash
gcloud compute addresses describe istio-ingress-ip \
  --region us-central1 \
  --format="get(address)"
```

Then configure Istio to use it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          loadBalancerIP: "35.192.x.x"
        serviceAnnotations:
          networking.gke.io/load-balancer-type: "External"
```

Replace the IP with your reserved address.

## Internal Load Balancer

If your services should only be accessible within the VPC, use an internal load balancer:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          networking.gke.io/load-balancer-type: "Internal"
          networking.gke.io/internal-load-balancer-allow-global-access: "true"
```

The `internal-load-balancer-allow-global-access` annotation allows traffic from other regions within the same VPC. Without it, only clients in the same region can reach the internal load balancer.

## Configuring GCP Backend Services

For more advanced features like Cloud CDN, Cloud Armor, or custom health checks, you need a GCP HTTP(S) Load Balancer instead of the default Network Load Balancer. The recommended way to do this on GKE is through a NEG (Network Endpoint Group).

First, annotate the ingress gateway service to use NEGs:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        serviceAnnotations:
          cloud.google.com/neg: '{"ingress": true}'
          cloud.google.com/backend-config: '{"default": "istio-backendconfig"}'
```

Then create a BackendConfig for custom settings:

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: istio-backendconfig
  namespace: istio-system
spec:
  healthCheck:
    checkIntervalSec: 10
    port: 15021
    type: HTTP
    requestPath: /healthz/ready
  securityPolicy:
    name: my-cloud-armor-policy
  cdn:
    enabled: false
```

## TLS Configuration

The standard approach with Istio on GCP is to let Istio handle TLS termination. The GCP load balancer passes TCP traffic through to the ingress gateway, and Istio presents the certificate:

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
      credentialName: my-app-tls
    hosts:
    - "myapp.example.com"
  - port:
      number: 80
      name: http
      protocol: HTTP
    tls:
      httpsRedirect: true
    hosts:
    - "myapp.example.com"
```

Create the TLS secret:

```bash
kubectl create secret tls my-app-tls \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n istio-system
```

If you prefer GCP-managed certificates, you can terminate TLS at the GCP HTTP(S) Load Balancer level using the GKE Ingress controller alongside Istio, though this adds complexity.

## Google-Managed Certificates with Istio

You can use Google-managed certificates alongside Istio by creating a ManagedCertificate resource and a GKE Ingress that points to the Istio gateway service:

```yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: my-managed-cert
  namespace: istio-system
spec:
  domains:
  - myapp.example.com
```

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: istio-gcp-ingress
  namespace: istio-system
  annotations:
    kubernetes.io/ingress.global-static-ip-name: "istio-ingress-ip"
    networking.gke.io/managed-certificates: "my-managed-cert"
spec:
  defaultBackend:
    service:
      name: istio-ingressgateway
      port:
        number: 80
```

In this setup, GCP terminates TLS and forwards HTTP to the Istio gateway. Configure the Istio Gateway to listen on HTTP:

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
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "myapp.example.com"
```

## Health Checks

GCP load balancers need to verify your targets are healthy. The Istio ingress gateway exposes a readiness endpoint:

- Port: 15021
- Path: /healthz/ready

For the default Network Load Balancer, GKE handles health checks automatically. For HTTP(S) Load Balancers with BackendConfig, specify the health check explicitly as shown earlier.

Verify the health check is passing:

```bash
kubectl exec -n istio-system deploy/istio-ingressgateway -- \
  curl -s localhost:15021/healthz/ready
```

## Firewall Rules

GKE usually creates firewall rules automatically for load balancer health checks. If you have custom network policies or VPC firewall rules, make sure the following are allowed:

- Health check source ranges: `35.191.0.0/16` and `130.211.0.0/22`
- Target port: 15021 (health check) and your application ports (80, 443)

Check existing firewall rules:

```bash
gcloud compute firewall-rules list --filter="name~gke" --project my-project
```

## Monitoring with Cloud Monitoring

GCP load balancers automatically send metrics to Cloud Monitoring. You can set up alerts for:

- Request count and latency
- Backend health status
- Error rates (4xx, 5xx)

Access these metrics in the GCP Console under Monitoring > Metrics Explorer using the `loadbalancing.googleapis.com` metric prefix.

## Troubleshooting

**Load balancer stuck in provisioning.** Check service events and make sure the IP address is available:

```bash
kubectl describe svc istio-ingressgateway -n istio-system
```

**Health checks failing.** Verify the gateway pod is running and the readiness probe is passing. Check firewall rules allow health check traffic.

**502 or 503 errors.** Usually means the backend pods are not ready or the health check is misconfigured. Check pod status and logs:

```bash
kubectl logs -n istio-system deploy/istio-ingressgateway --tail=50
```

**Slow provisioning of Google-managed certificates.** These can take up to 60 minutes. Check the certificate status:

```bash
kubectl describe managedcertificate my-managed-cert -n istio-system
```

## Summary

GCP provides flexible load balancing options for Istio ingress gateways. The default Network Load Balancer works well for most setups. Use internal load balancers for VPC-only access, and consider HTTP(S) Load Balancers if you need Cloud Armor or Cloud CDN. Static IP addresses and proper health check configuration are essential for production deployments.
