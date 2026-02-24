# How to Configure Istio with AWS VPC CNI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AWS, VPC CNI, EKS, Kubernetes

Description: A complete guide to configuring Istio service mesh on Amazon EKS with the AWS VPC CNI plugin including security groups, IP management, and load balancer integration.

---

If you are running Kubernetes on Amazon EKS, you are using the AWS VPC CNI plugin by default. This CNI is different from most other Kubernetes networking plugins because it assigns real VPC IP addresses to each pod rather than using an overlay network. This means pods get routable IPs within your VPC, which has implications for how Istio integrates with AWS networking services.

Running Istio on EKS with the VPC CNI is very common in production, and it works well once you understand the specific configuration needs.

## How AWS VPC CNI Differs from Other CNIs

The key difference with the AWS VPC CNI is that each pod gets an IP address from your VPC subnet. This is done by attaching secondary IP addresses to the Elastic Network Interfaces (ENIs) on each node. The implications for Istio are:

1. **No overlay network**: Pods are directly routable within the VPC. No encapsulation overhead.
2. **IP address limits**: Each node can only have a limited number of pod IPs based on its instance type and number of ENIs.
3. **Security groups**: AWS Security Groups can be applied to pods directly (with security groups for pods feature).
4. **VPC Flow Logs**: You can see individual pod traffic in VPC Flow Logs since pods have real VPC IPs.

## Prerequisites

```bash
# Verify you are on EKS
kubectl get nodes -o wide
# Node names should be EC2 instance IDs or EKS-formatted names

# Check the VPC CNI version
kubectl get daemonset aws-node -n kube-system -o jsonpath='{.spec.template.spec.containers[0].image}'

# Verify the CNI is healthy
kubectl get pods -n kube-system -l k8s-app=aws-node

# Check available IPs
kubectl get nodes -o custom-columns=NAME:.metadata.name,PODS:.status.capacity.pods
```

## Installing Istio on EKS

The standard Istio installation works on EKS, but there are EKS-specific settings to consider:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-eks
spec:
  profile: default
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "2000m"
            memory: "2Gi"
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
        nodeSelector:
          kubernetes.io/os: linux
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          serviceAnnotations:
            service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
            service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
            service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
          hpaSpec:
            minReplicas: 2
            maxReplicas: 10
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: "10m"
            memory: "64Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
```

```bash
istioctl install -f istio-eks.yaml -y
```

## Configuring the Ingress Gateway Load Balancer

On EKS, the Istio ingress gateway Service creates an AWS load balancer. You have several options:

### Network Load Balancer (Recommended)

NLB provides better performance and supports static IPs:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"
spec:
  type: LoadBalancer
  selector:
    istio: ingressgateway
  ports:
    - name: http2
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8443
```

### AWS Load Balancer Controller (For More Control)

If you are using the AWS Load Balancer Controller, you can use NLB with IP mode for better performance:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: "/healthz/ready"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-port: "15021"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-protocol: "http"
spec:
  type: LoadBalancer
  selector:
    istio: ingressgateway
  ports:
    - name: http2
      port: 80
      targetPort: 8080
    - name: https
      port: 443
      targetPort: 8443
```

With IP target type, the NLB sends traffic directly to the pod IP (which is a real VPC IP), bypassing the extra hop through NodePort.

## IP Address Capacity Planning

The VPC CNI has a limited number of IP addresses per node based on the instance type. Istio adds a sidecar to every pod, which does not add more pods but does increase resource consumption on each node. The key concern is that you do not run out of allocatable pod IPs:

```bash
# Check maximum pods per node (based on ENI limits)
kubectl get nodes -o custom-columns=NAME:.metadata.name,MAX_PODS:.status.capacity.pods

# Check current pod count per node
kubectl get pods --all-namespaces -o wide --no-headers | awk '{print $8}' | sort | uniq -c | sort -rn
```

Instance type IP limits (examples):

| Instance Type | Max ENIs | Max IPs per ENI | Max Pods |
|---|---|---|---|
| t3.medium | 3 | 6 | 17 |
| m5.large | 3 | 10 | 29 |
| m5.xlarge | 4 | 15 | 58 |
| m5.2xlarge | 4 | 15 | 58 |
| c5.4xlarge | 8 | 30 | 234 |

If you are hitting IP limits, consider:

1. Using larger instance types with more ENI capacity
2. Enabling the VPC CNI prefix delegation feature:

```bash
# Enable prefix delegation for more IPs per node
kubectl set env daemonset aws-node -n kube-system ENABLE_PREFIX_DELEGATION=true
kubectl set env daemonset aws-node -n kube-system WARM_PREFIX_TARGET=1
```

## Security Group Configuration

Your VPC security groups need to allow Istio traffic:

### Node Security Group Rules

```bash
# Minimum security group rules for Istio on EKS
# Inbound:
# - Port 15012 (istiod gRPC) from all nodes
# - Port 15017 (webhook) from all nodes
# - Port 15021 (health check) from NLB CIDR
# - Port 443 (API server to webhook)

# If using NLB with IP target type, allow traffic from NLB subnets
aws ec2 authorize-security-group-ingress \
  --group-id <node-security-group-id> \
  --protocol tcp \
  --port 8080 \
  --cidr <nlb-subnet-cidr>
```

### Security Groups for Pods

If you are using the "Security Groups for Pods" feature, Istio sidecar traffic needs to be allowed:

```yaml
apiVersion: vpcresources.k8s.aws/v1beta1
kind: SecurityGroupPolicy
metadata:
  name: istio-pod-sg
  namespace: default
spec:
  podSelector:
    matchLabels:
      security.istio.io/tlsMode: istio
  securityGroups:
    groupIds:
      - sg-0123456789abcdef0
```

The security group needs to allow:

```bash
# Allow mesh traffic between pods in the security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-0123456789abcdef0 \
  --protocol tcp \
  --port 0-65535 \
  --source-group sg-0123456789abcdef0
```

## Configuring Service Mesh with AWS Services

### AWS App Mesh vs Istio

EKS supports both AWS App Mesh and Istio. They should not be used simultaneously. If you are using Istio, make sure App Mesh is not installed:

```bash
# Check if App Mesh controller is installed
kubectl get pods -n appmesh-system
# This should return nothing if you are using Istio
```

### External Service Access

For services accessing AWS services (RDS, ElastiCache, S3, etc.), configure ServiceEntries:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: rds-database
  namespace: backend
spec:
  hosts:
    - mydb.cluster-xxxx.us-east-1.rds.amazonaws.com
  ports:
    - number: 5432
      name: tcp-postgres
      protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL

---
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: aws-s3
  namespace: backend
spec:
  hosts:
    - "*.s3.amazonaws.com"
    - "*.s3.us-east-1.amazonaws.com"
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Handling Cross-AZ Traffic

On EKS, pods in different availability zones communicate through the VPC network. This traffic incurs inter-AZ data transfer charges. Istio can help minimize this with locality-aware load balancing:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: prefer-local-az
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        distribute:
          - from: "us-east-1/us-east-1a/*"
            to:
              "us-east-1/us-east-1a/*": 80
              "us-east-1/us-east-1b/*": 10
              "us-east-1/us-east-1c/*": 10
```

Or use failover mode to only go cross-AZ when the local AZ is unhealthy:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: locality-failover
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          - from: us-east-1/us-east-1a
            to: us-east-1/us-east-1b
          - from: us-east-1/us-east-1b
            to: us-east-1/us-east-1c
```

## Troubleshooting

### Issue: Gateway Load Balancer Not Getting External IP

```bash
# Check the Service events
kubectl describe svc istio-ingressgateway -n istio-system

# Check AWS Load Balancer Controller logs (if using it)
kubectl logs -n kube-system deploy/aws-load-balancer-controller --tail=50

# Verify subnet tags
# Public subnets need: kubernetes.io/role/elb = 1
# Private subnets need: kubernetes.io/role/internal-elb = 1
```

### Issue: Pod IP Exhaustion

```bash
# Check available IPs
kubectl get nodes -o custom-columns=NAME:.metadata.name,PODS_CAPACITY:.status.capacity.pods,PODS_USED:.status.allocatable.pods

# Check CNI metrics
kubectl exec -n kube-system <aws-node-pod> -- curl localhost:61678/v1/enis
```

### Issue: Cross-AZ Connectivity Problems

```bash
# Verify node labels include topology information
kubectl get nodes --show-labels | grep topology

# Check that Istio is using locality information
istioctl proxy-config endpoint <pod> -o json | grep locality
```

The AWS VPC CNI and Istio combination is production-proven on thousands of EKS clusters. The main areas to get right are load balancer configuration, IP capacity planning, security group rules, and cross-AZ traffic optimization. Once those are sorted, it runs smoothly.
