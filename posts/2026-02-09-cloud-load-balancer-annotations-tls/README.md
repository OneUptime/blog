# How to Configure Cloud Provider Load Balancer Annotations for TLS and Proxy Protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Load Balancer, TLS, Cloud

Description: Master cloud-specific load balancer annotations for TLS termination and proxy protocol configuration on AWS, GCP, and Azure Kubernetes clusters.

---

Kubernetes Service objects with type LoadBalancer automatically provision cloud load balancers, but the default configuration rarely meets production requirements. Cloud providers expose advanced features through service annotations that control TLS termination, proxy protocol, connection draining, and health checks.

This guide demonstrates how to configure load balancer annotations for TLS and proxy protocol across AWS EKS, Google GKE, and Azure AKS.

## Understanding Load Balancer Annotations

Each cloud provider implements the Kubernetes LoadBalancer service type differently and exposes provider-specific features through annotations. These annotations are key-value pairs in the service metadata:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
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

AWS supports both Network Load Balancers (NLB) and Application Load Balancers (ALB) through the AWS Load Balancer Controller. For TLS termination with ACM certificates:

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
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "http"

    # SSL policy
    service.beta.kubernetes.io/aws-load-balancer-ssl-negotiation-policy: "ELBSecurityPolicy-TLS-1-2-2017-01"
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

The load balancer terminates TLS using the ACM certificate and forwards unencrypted traffic to pods on port 8080. The SSL policy ensures only TLS 1.2+ connections.

For Application Load Balancers with advanced features:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: app-service
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "instance"

    # Multiple certificates
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: |
      arn:aws:acm:us-east-1:123456789:certificate/cert1,
      arn:aws:acm:us-east-1:123456789:certificate/cert2

    # HTTPS listener with redirect
    service.beta.kubernetes.io/aws-load-balancer-ssl-ports: "443"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "http"

    # Connection draining
    service.beta.kubernetes.io/aws-load-balancer-connection-draining-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-connection-draining-timeout: "60"
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

GKE uses Google Cloud Load Balancer with SSL certificates from Certificate Manager:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
  annotations:
    # Use external load balancer
    cloud.google.com/load-balancer-type: "External"

    # SSL certificate from Certificate Manager
    networking.gke.io/load-balancer-ssl-certificates: "myapp-cert"

    # Backend protocol
    cloud.google.com/backend-config: '{"default": "backend-config"}'

    # NEG (Network Endpoint Group) mode
    cloud.google.com/neg: '{"ingress": true}'
spec:
  type: LoadBalancer
  ports:
  - port: 443
    targetPort: 8080
    name: https
  selector:
    app: web
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

For internal load balancers with TLS:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-service
  annotations:
    cloud.google.com/load-balancer-type: "Internal"
    networking.gke.io/internal-load-balancer-allow-global-access: "true"

    # Use pre-created SSL certificate
    networking.gke.io/load-balancer-ssl-certificates: "internal-cert"
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

GCP load balancers support PROXY protocol for preserving client IPs:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: proxy-service
  annotations:
    cloud.google.com/load-balancer-type: "External"

    # Backend configuration with proxy protocol
    cloud.google.com/backend-config: '{"default": "proxy-backend"}'
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: web
```

Backend config with proxy protocol:

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: proxy-backend
spec:
  # Enable connection draining
  connectionDraining:
    drainingTimeoutSec: 30

  # Logging
  logging:
    enable: true
    sampleRate: 1.0
```

## Azure Load Balancer TLS Configuration

Azure Kubernetes Service uses Azure Load Balancer. For TLS, you typically use an ingress controller, but for L4 load balancers:

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

    # Health check settings
    service.beta.kubernetes.io/azure-load-balancer-health-probe-protocol: "tcp"
    service.beta.kubernetes.io/azure-load-balancer-health-probe-interval: "5"
    service.beta.kubernetes.io/azure-load-balancer-health-probe-num-of-probe: "2"

    # Session persistence
    service.beta.kubernetes.io/azure-load-balancer-disable-tcp-reset: "false"
spec:
  type: LoadBalancer
  loadBalancerIP: 20.10.5.100
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

Azure supports PROXY protocol through annotations:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: proxy-service
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "false"

    # Enable proxy protocol
    service.beta.kubernetes.io/azure-load-balancer-enable-high-availability-ports: "false"

    # Connection draining
    service.beta.kubernetes.io/azure-load-balancer-disable-tcp-reset: "false"
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
LB_ADDR=$(kubectl get svc web-service -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test TLS connection
openssl s_client -connect $LB_ADDR:443 -showcerts

# Check certificate details
echo | openssl s_client -connect $LB_ADDR:443 2>/dev/null | openssl x509 -noout -dates -subject
```

Test proxy protocol:

```bash
# Send request and check headers
curl -v https://$LB_ADDR/

# Check client IP preservation
kubectl logs -l app=web | grep "X-Forwarded-For"
```

## Conclusion

Cloud load balancer annotations give you fine-grained control over TLS termination, proxy protocol, health checks, and connection handling. Each cloud provider offers different capabilities, so understanding the annotation syntax for AWS, GCP, and Azure ensures you can configure production-ready load balancers on any platform.

The key is matching annotations to your requirements: TLS termination at the load balancer reduces CPU usage in pods, proxy protocol preserves client IPs for logging and security, and custom health checks ensure traffic only reaches healthy backends.
