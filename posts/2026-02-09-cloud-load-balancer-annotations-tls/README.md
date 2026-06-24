# How to Configure Cloud Provider Load Balancer Annotations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Load Balancer, TLS, Cloud

Description: Master cloud-specific load balancer annotations for TLS termination and proxy protocol configuration on AWS, GCP, and Azure Kubernetes clusters.

---

Kubernetes Service objects with type LoadBalancer automatically provision cloud load balancers, but the default configuration rarely meets production requirements. Cloud providers expose advanced features through service annotations and related load balancing resources that control TLS termination, proxy protocol, connection draining, and health checks.

This guide demonstrates how to configure load balancer annotations for TLS, client IP preservation, and proxy protocol where supported across AWS EKS, Google GKE, and Azure AKS.

## Understanding Load Balancer Annotations

Each cloud provider implements the Kubernetes LoadBalancer service type differently and exposes provider-specific features through annotations. These annotations are key-value pairs in the service metadata:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 8080
  selector:
    app: my-app
```

Annotations control load balancer provisioning, SSL/TLS certificates, backend protocols, health checks, and network configuration. The same application requires different annotations on each cloud platform.

## AWS Load Balancer TLS Configuration

AWS Load Balancer Controller provisions Network Load Balancers (NLBs) for Service objects and Application Load Balancers (ALBs) for Ingress objects. For Service-level TLS termination with ACM certificates on an NLB:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    # Use Network Load Balancer
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"

    # TLS configuration
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:us-east-1:123456789:certificate/xxxxx"
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"

    # SSL policy
    service.beta.kubernetes.io/aws-load-balancer-ssl-negotiation-policy: "ELBSecurityPolicy-TLS13-1-2-2021-06"
spec:
  type: LoadBalancer
  ports:
  - name: https
    port: 443
    targetPort: 8080
    protocol: TCP
  - name: http
    port: 80
    targetPort: 8080
    protocol: TCP
  selector:
    app: web
```

The load balancer terminates TLS using the ACM certificate and forwards plain TCP traffic to pods on port 8080. The SSL policy allows TLS 1.2 and TLS 1.3 connections.

For additional NLB features:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "instance"

    # Multiple certificates
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:us-east-1:123456789:certificate/cert1,arn:aws:acm:us-east-1:123456789:certificate/cert2"

    # TLS listener
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"

    # Deregistration delay for connection draining
    service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: "deregistration_delay.timeout_seconds=60"
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 8080
  selector:
    app: myapp
```

## AWS Proxy Protocol Configuration

Enable proxy protocol to preserve client IP addresses:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: proxy-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"

    # Enable proxy protocol v2
    service.beta.kubernetes.io/aws-load-balancer-proxy-protocol: "*"

    # Preserve client IP
    service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: |
      preserve_client_ip.enabled=true
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: web
```

Your application must parse the PROXY protocol header. For NGINX:

```nginx
# nginx.conf

http {
    server {
        listen 8080 proxy_protocol;

        # Use real IP from PROXY header
        real_ip_header proxy_protocol;
        set_real_ip_from 10.0.0.0/8;

        location / {
            # $proxy_protocol_addr contains client IP
            proxy_set_header X-Real-IP $proxy_protocol_addr;
            proxy_set_header X-Forwarded-For $proxy_protocol_addr;
            proxy_pass http://backend;
        }
    }
}
```

## GCP Load Balancer TLS Configuration

GKE uses Google Cloud Application Load Balancers for HTTP and HTTPS traffic through Ingress or Gateway. With GKE Ingress, Google-managed certificates are attached to the Ingress, while backend settings are attached to the Service:

```yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: myapp-cert
spec:
  domains:
  - app.example.com
---
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    # Backend settings for the Ingress-created load balancer
    cloud.google.com/backend-config: '{"default": "backend-config"}'

    # NEG (Network Endpoint Group) mode
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: NodePort
  ports:
  - port: 80
    targetPort: 8080
    name: http
  selector:
    app: web
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    networking.gke.io/managed-certificates: "myapp-cert"
spec:
  defaultBackend:
    service:
      name: web-service
      port:
        number: 80
```

Create a backend config for advanced settings:

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: backend-config
spec:
  # Connection draining
  connectionDraining:
    drainingTimeoutSec: 60

  # Health check
  healthCheck:
    checkIntervalSec: 10
    timeoutSec: 5
    healthyThreshold: 2
    unhealthyThreshold: 3
    type: HTTP
    requestPath: /health
    port: 8080

  # Session affinity
  sessionAffinity:
    affinityType: "CLIENT_IP"
    affinityCookieTtlSec: 3600

  # Custom request headers
  customRequestHeaders:
    headers:
    - "X-Client-Region:{client_region}"
    - "X-Client-City:{client_city}"
```

For internal L4 load balancers, a Service of type `LoadBalancer` creates an internal passthrough Network Load Balancer. It does not attach a TLS certificate to the load balancer, so TLS must be terminated in the workload or handled by an internal Ingress or Gateway:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-service
  annotations:
    cloud.google.com/load-balancer-type: "Internal"
    networking.gke.io/internal-load-balancer-allow-global-access: "true"
spec:
  type: LoadBalancer
  loadBalancerIP: 10.128.0.100
  ports:
  - port: 443
    targetPort: 8080
  selector:
    app: internal-app
```

## GCP Proxy Protocol Configuration

GKE Service load balancers are passthrough Network Load Balancers and do not use `BackendConfig` to enable PROXY protocol. Use `externalTrafficPolicy: Local` when you need the original client source IP to reach pods, or build a Google Cloud proxy Network Load Balancer with standalone NEGs if you specifically need PROXY protocol:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: proxy-service
  annotations:
    cloud.google.com/l4-rbs: "enabled"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: web
```

## Azure Load Balancer TLS Configuration

Azure Kubernetes Service uses Azure Load Balancer for Services of type `LoadBalancer`. Azure Load Balancer is a layer 4 passthrough load balancer, so TLS termination typically belongs in an ingress controller, Azure Application Gateway, or the workload itself:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    # Public load balancer
    service.beta.kubernetes.io/azure-load-balancer-internal: "false"

    # Resource group for public IP
    service.beta.kubernetes.io/azure-load-balancer-resource-group: "my-rg"
    service.beta.kubernetes.io/azure-load-balancer-ipv4: "20.10.5.100"

    # Health check settings
    service.beta.kubernetes.io/port_443_health-probe_protocol: "Tcp"
    service.beta.kubernetes.io/azure-load-balancer-health-probe-interval: "5"
    service.beta.kubernetes.io/azure-load-balancer-health-probe-num-of-probe: "2"

    # TCP reset behavior
    service.beta.kubernetes.io/azure-load-balancer-disable-tcp-reset: "false"
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 8080
  selector:
    app: web
```

For internal load balancers:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-service
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    service.beta.kubernetes.io/azure-load-balancer-internal-subnet: "backend-subnet"

    # Static internal IP
    service.beta.kubernetes.io/azure-load-balancer-ipv4: "10.240.0.100"

    # Idle timeout
    service.beta.kubernetes.io/azure-load-balancer-tcp-idle-timeout: "15"
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 8080
  selector:
    app: internal-app
```

## Azure Proxy Protocol Configuration

Azure Load Balancer does not provide a Service annotation to enable PROXY protocol. To preserve the client IP with an AKS LoadBalancer Service, use `externalTrafficPolicy: Local`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: proxy-service
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "false"
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  selector:
    app: web
```

## Testing Load Balancer Configuration

Verify TLS configuration:

```bash
# Get load balancer address
LB_ADDR=$(kubectl get svc web-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}{.status.loadBalancer.ingress[0].ip}')

# Test TLS connection
openssl s_client -connect $LB_ADDR:443 -showcerts

# Check certificate details
echo | openssl s_client -connect $LB_ADDR:443 2>/dev/null | openssl x509 -noout -dates -subject
```

Test proxy protocol:

```bash
# Send request and check headers
curl -v http://$LB_ADDR/

# Check client IP preservation
kubectl logs -l app=web | grep "X-Forwarded-For"
```

## Conclusion

Cloud load balancer annotations give you fine-grained control over TLS termination, client IP preservation, health checks, and connection handling. Each cloud provider offers different capabilities, so understanding the annotation syntax for AWS, GCP, and Azure ensures you can configure production-ready load balancers on any platform.

The key is matching annotations to your requirements: TLS termination at the load balancer reduces CPU usage in pods, proxy protocol preserves client IPs where supported, and custom health checks ensure traffic only reaches healthy backends.
