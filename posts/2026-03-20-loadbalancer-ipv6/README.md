# How to Configure IPv6 LoadBalancer Services in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, LoadBalancer, Service, Dual-Stack, Cloud Load Balancer

Description: Configure Kubernetes LoadBalancer Services to receive IPv6 external IPs, set up dual-stack load balancers on AWS, GCP, and Azure, and verify external IPv6 connectivity to Kubernetes services.

## Introduction

Kubernetes LoadBalancer Services provision external load balancers through the cloud provider integration. In clusters that support dual-stack Services, LoadBalancer Services can receive both IPv4 and IPv6 external endpoints. Cloud-specific settings control whether the provisioned load balancer supports IPv6. The `status.loadBalancer.ingress` field shows the published load balancer endpoints, which can be IP addresses or hostnames depending on the provider.

## Create Dual-Stack LoadBalancer Service

```yaml
# lb-dual-stack.yaml

apiVersion: v1
kind: Service
metadata:
  name: web-lb
spec:
  selector:
    app: web
  ports:
    - name: http
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8443
  ipFamilyPolicy: PreferDualStack
  ipFamilies: [IPv4, IPv6]
  type: LoadBalancer
```

If your cloud provider requires additional annotations, add the provider-specific settings from the sections below before applying the Service.

```bash
kubectl apply -f lb-dual-stack.yaml

# Wait for external IP assignment
kubectl get svc web-lb -w

# Check the published external endpoint(s)
# Some providers return IP addresses, while others return a hostname
kubectl get svc web-lb -o jsonpath='{range .status.loadBalancer.ingress[*]}{.ip}{" "}{.hostname}{"\n"}{end}'
```

## AWS EKS with IPv6 Load Balancer

```yaml
# EKS: IPv6 Service behind a dual-stack NLB
apiVersion: v1
kind: Service
metadata:
  name: web-lb-aws
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
    service.beta.kubernetes.io/aws-load-balancer-ip-address-type: "dualstack"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
  ipFamilyPolicy: SingleStack
  ipFamilies: [IPv6]
  type: LoadBalancer
```

## GCP GKE with IPv6 Load Balancer

```yaml
# GKE: new 1.29+ clusters support dual-stack LoadBalancer Services
apiVersion: v1
kind: Service
metadata:
  name: web-lb-gcp
  annotations:
    # Standard external LB with IPv6
    cloud.google.com/l4-rbs: "enabled"
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
  ipFamilyPolicy: PreferDualStack
  ipFamilies: [IPv4, IPv6]
  type: LoadBalancer
```

## Azure AKS with IPv6 Load Balancer

```yaml
# AKS 1.27+: dual-stack LoadBalancer (requires dual-stack cluster)
apiVersion: v1
kind: Service
metadata:
  name: web-lb-azure
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
  ipFamilyPolicy: PreferDualStack
  ipFamilies: [IPv4, IPv6]
  type: LoadBalancer
```

## Test External IPv6 Connectivity

```bash
# Show provider-published endpoints
kubectl get svc web-lb -o jsonpath='{range .status.loadBalancer.ingress[*]}{.ip}{" "}{.hostname}{"\n"}{end}'

# For providers that publish IPs in Service status, find the IPv6 external IP
LB_IPV6=$(kubectl get svc web-lb \
    -o jsonpath='{range .status.loadBalancer.ingress[*]}{.ip}{"\n"}{end}' | \
    grep ":")

echo "LoadBalancer IPv6: $LB_IPV6"

# Test HTTP over IPv6
curl -6 "http://[$LB_IPV6]/"

# Test HTTPS over IPv6
curl -6 "https://[$LB_IPV6]/" --insecure

# On AWS/EKS, Service status typically contains a load balancer hostname
LB_HOSTNAME=$(kubectl get svc web-lb-aws -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')

# Test the AWS load balancer over IPv6
curl -6 "http://$LB_HOSTNAME/"

# Add DNS records for your domain
# GKE/AKS: A record -> IPv4 LB IP, AAAA record -> IPv6 LB IP
# AWS: create alias records that point at the load balancer hostname

# Test via DNS
curl -6 https://example.com/
```

## Troubleshoot LoadBalancer IPv6 Assignment

```bash
# Check events for LB provisioning errors
kubectl describe svc web-lb | grep -A20 Events

# Inspect the load balancer status reported on the Service
kubectl get svc web-lb -o yaml | grep -A20 "status:"

# For EKS, check AWS LB Controller
kubectl -n kube-system logs deployment/aws-load-balancer-controller | \
    grep -E -i "dualstack|ipv6"

# Verify service spec
kubectl get svc web-lb -o yaml | grep -A10 "ipFamily"
```

## Conclusion

Kubernetes LoadBalancer Services can receive external IPv6 endpoints when the cluster and cloud provider support them. `ipFamilyPolicy: PreferDualStack` requests both IPv4 and IPv6 on platforms that support dual-stack Services, but it can fall back to single-stack behavior when dual-stack is unavailable. On AWS EKS, use the AWS Load Balancer Controller with `aws-load-balancer-ip-address-type: dualstack`, but note that EKS IPv6 clusters use single-stack IPv6 Services behind a dual-stack load balancer rather than Kubernetes dual-stack Services. On GCP GKE, dual-stack `LoadBalancer` Services require an `ipv4-ipv6` cluster, the `cloud.google.com/l4-rbs: "enabled"` annotation, and a new GKE cluster running version 1.29 or later. On Azure AKS, one Service gets both public IPv4 and IPv6 addresses starting in AKS 1.27. Check `status.loadBalancer.ingress` for the provider-published endpoint and add the corresponding A, AAAA, or alias DNS records for full IPv6 accessibility.
