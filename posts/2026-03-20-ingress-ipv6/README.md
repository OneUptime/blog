# How to Configure IPv6 Ingress in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Ingress, Nginx, Dual-Stack, Load Balancer

Description: Configure Kubernetes Ingress controllers for IPv6, set up nginx-ingress-controller to accept IPv6 client connections, and create Ingress resources for dual-stack traffic routing.

## Introduction

Kubernetes Ingress provides HTTP/HTTPS routing to services. For IPv6 support, the cluster networking, Service, and the Ingress controller must all support IPv6 or dual-stack operation. The NGINX Ingress Controller listens on IPv6 (`[::]`) by default when IPv6 is enabled and `disable-ipv6` is not set. Ingress objects themselves are address-family agnostic - IPv6 access is handled at the Service and controller level, not in Ingress YAML.

## Install NGINX Ingress Controller with IPv6

```bash
# Install NGINX Ingress Controller

kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.15.1/deploy/static/provider/cloud/deploy.yaml

# Check if NGINX service has IPv6 ClusterIP
kubectl -n ingress-nginx get svc ingress-nginx-controller

# Patch service to prefer dual-stack on a dual-stack cluster
kubectl -n ingress-nginx patch svc ingress-nginx-controller \
    -p '{"spec":{"ipFamilyPolicy":"PreferDualStack","ipFamilies":["IPv4","IPv6"]}}'

# Verify the service has both ClusterIPs
kubectl -n ingress-nginx get svc ingress-nginx-controller \
    -o jsonpath='{.spec.clusterIPs}'
```

## Verify NGINX Ingress IPv6 Binding

```bash
# Check the generated NGINX config includes IPv6 listeners
kubectl -n ingress-nginx exec deployment/ingress-nginx-controller -- \
    sh -c 'grep "listen \\[::\\]:" /etc/nginx/nginx.conf'
```

## Create Ingress Resource for IPv6 Traffic

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web-ingress
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - example.com
      secretName: example-tls
  rules:
    - host: example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web-service
                port:
                  number: 80
          - path: /api
            pathType: Prefix
            backend:
              service:
                name: api-service
                port:
                  number: 8080
```

```bash
kubectl apply -f ingress.yaml

# Test via IPv6 (if the Service reports an external IPv6 address)
INGRESS_IPV6=$(
  kubectl -n ingress-nginx get svc ingress-nginx-controller \
    -o jsonpath='{range .status.loadBalancer.ingress[*]}{.ip}{"\n"}{end}' | grep ':' | head -n1
)

curl -6 --resolve example.com:443:[$INGRESS_IPV6] https://example.com/ --insecure
```

## NGINX Ingress with External IPv6 Load Balancer

```yaml
# For cloud environments: annotate for dual-stack external LB
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx-controller
  namespace: ingress-nginx
  annotations:
    # AWS: dual-stack NLB
    service.beta.kubernetes.io/aws-load-balancer-ip-address-type: dualstack
    # GKE: required for external dual-stack LoadBalancer Services
    # Additional GKE IPv6 subnet or static-address annotations may also be required
    cloud.google.com/l4-rbs: "enabled"
spec:
  type: LoadBalancer
  ipFamilyPolicy: PreferDualStack
  ipFamilies: [IPv4, IPv6]
  ports:
    - name: http
      port: 80
      targetPort: http
    - name: https
      port: 443
      targetPort: https
  selector:
    app.kubernetes.io/component: controller
    app.kubernetes.io/instance: ingress-nginx
    app.kubernetes.io/name: ingress-nginx
```

## Verify IPv6 Ingress Connectivity

```bash
# Get Ingress external IPs
kubectl -n ingress-nginx get svc ingress-nginx-controller \
    -o jsonpath='{.status.loadBalancer.ingress}'

# Test with curl over IPv6
curl -6 -v "https://example.com/" 2>&1 | grep "Connected to"
# Should show IPv6 address

# Check NGINX access logs for IPv6 clients
kubectl -n ingress-nginx logs deployment/ingress-nginx-controller | \
    grep -E '^[0-9a-fA-F:]+ ' | tail -20

# Add AAAA DNS record for your domain
dig +short AAAA example.com
# Should return the Ingress controller's IPv6 external IP
```

## Conclusion

Configure Kubernetes NGINX Ingress for IPv6 by running on a cluster with IPv6 or dual-stack networking, patching the Service to use `ipFamilyPolicy: PreferDualStack`, and adding the cloud-provider-specific annotations required for a dual-stack `LoadBalancer`. ingress-nginx already listens on `[::]` when IPv6 is enabled, so you normally do not need a special `bind-address` setting. Ingress YAML resources themselves are IP-family agnostic - IPv6 routing happens at the Service and controller level. Add AAAA DNS records pointing to the Ingress controller's external IPv6 for clients to connect via IPv6. Verify connectivity with `curl -6 --resolve example.com:443:[ingress-ipv6] https://example.com/ --insecure`.
