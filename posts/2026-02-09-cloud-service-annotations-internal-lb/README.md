# How to Configure Cloud Provider Service Annotations for Internal Load Balancers on EKS, GKE, and AKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Load Balancer, AWS, GCP, Azure

Description: Configure internal load balancers on EKS, GKE, and AKS using cloud-specific service annotations for private network access without public internet exposure.

---

Kubernetes LoadBalancer services create public load balancers by default. For internal microservices, APIs, and databases, you want private load balancers accessible only within your VPC or virtual network. Each cloud provider uses different annotations to configure internal load balancers.

This guide shows you how to create internal load balancers on AWS EKS, Google GKE, and Azure AKS using the correct service annotations.

## Understanding Internal Load Balancers

Internal load balancers provide:

**Private IP addresses** in your VPC/VNet.

**No public internet exposure** for sensitive services.

**Lower latency** for internal traffic.

**Reduced costs** since public IPs and internet data transfer are avoided.

**Access from on-premises** via VPN or Direct Connect.

Use internal load balancers for databases, internal APIs, and services that should never be internet-facing.

## Creating Internal Load Balancer on EKS

AWS Network Load Balancer (NLB) internal configuration:

```yaml
# internal-lb-eks.yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-api
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
    service.beta.kubernetes.io/aws-load-balancer-subnets: "subnet-xxxxx,subnet-yyyyy"
spec:
  type: LoadBalancer
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
```

Key annotations:
- `aws-load-balancer-scheme: internal` - Creates internal NLB
- `aws-load-balancer-subnets` - Specifies which private subnets to use

For legacy Classic Load Balancer:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-internal: "true"
```

Apply the service:

```bash
kubectl apply -f internal-lb-eks.yaml

# Get internal IP
kubectl get svc internal-api

# Should show private IP from VPC
NAME           TYPE           CLUSTER-IP      EXTERNAL-IP    PORT(S)
internal-api   LoadBalancer   10.100.200.50   10.0.1.100     80:31234/TCP
```

## Creating Internal Load Balancer on GKE

Google Cloud internal load balancer:

```yaml
# internal-lb-gke.yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-api
  annotations:
    cloud.google.com/load-balancer-type: "Internal"
    networking.gke.io/internal-load-balancer-allow-global-access: "true"
spec:
  type: LoadBalancer
  loadBalancerIP: 10.128.0.100
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
```

Key annotations:
- `cloud.google.com/load-balancer-type: Internal` - Creates internal ILB
- `networking.gke.io/internal-load-balancer-allow-global-access` - Allows access from other regions

For specific subnet:

```yaml
metadata:
  annotations:
    cloud.google.com/load-balancer-type: "Internal"
    networking.gke.io/internal-load-balancer-subnet: "backend-subnet"
```

Apply and verify:

```bash
kubectl apply -f internal-lb-gke.yaml

# Check status
kubectl get svc internal-api

# Get backend service details
gcloud compute backend-services list --filter="name~internal-api"
```

## Creating Internal Load Balancer on AKS

Azure internal load balancer:

```yaml
# internal-lb-aks.yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-api
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    service.beta.kubernetes.io/azure-load-balancer-internal-subnet: "backend-subnet"
spec:
  type: LoadBalancer
  loadBalancerIP: 10.240.0.100
  selector:
    app: api
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
```

Key annotations:
- `azure-load-balancer-internal: true` - Creates internal load balancer
- `azure-load-balancer-internal-subnet` - Specifies subnet

For cross-resource-group deployment:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    service.beta.kubernetes.io/azure-load-balancer-resource-group: "networking-rg"
```

Apply and test:

```bash
kubectl apply -f internal-lb-aks.yaml

# Verify
kubectl get svc internal-api

# Check Azure load balancer
az network lb list \
  --resource-group MC_myResourceGroup_myAKSCluster_eastus \
  --query "[?contains(name, 'internal')]"
```

## Specifying Subnet and IP Address

EKS with specific subnet and IP:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
    service.beta.kubernetes.io/aws-load-balancer-subnets: "subnet-xxxxx"
    service.beta.kubernetes.io/aws-load-balancer-eip-allocations: "eipalloc-xxxxx"
```

GKE with reserved IP:

```bash
# Reserve internal IP
gcloud compute addresses create api-internal-ip \
  --region=us-central1 \
  --subnet=backend-subnet \
  --addresses=10.128.0.100
```

Use in service:

```yaml
spec:
  type: LoadBalancer
  loadBalancerIP: 10.128.0.100
```

AKS with static IP:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    service.beta.kubernetes.io/azure-load-balancer-ipv4: "10.240.0.100"
```

## Database Service Example

PostgreSQL internal service on EKS:

```yaml
# postgres-internal.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
spec:
  type: LoadBalancer
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
    protocol: TCP
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
```

## Health Check Configuration

EKS health check settings:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internal"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-interval: "10"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-timeout: "5"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-healthy-threshold: "2"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-unhealthy-threshold: "2"
```

GKE with BackendConfig:

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: internal-backend
spec:
  healthCheck:
    checkIntervalSec: 10
    port: 8080
    type: HTTP
    requestPath: /health
---
apiVersion: v1
kind: Service
metadata:
  name: internal-api
  annotations:
    cloud.google.com/load-balancer-type: "Internal"
    cloud.google.com/backend-config: '{"default": "internal-backend"}'
```

AKS health probe:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    service.beta.kubernetes.io/azure-load-balancer-health-probe-protocol: "http"
    service.beta.kubernetes.io/azure-load-balancer-health-probe-request-path: "/health"
```

## Session Affinity Configuration

EKS with client IP affinity:

```yaml
spec:
  type: LoadBalancer
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
```

GKE session affinity:

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: session-affinity
spec:
  sessionAffinity:
    affinityType: "CLIENT_IP"
    affinityCookieTtlSec: 3600
```

AKS session persistence:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
    service.beta.kubernetes.io/azure-load-balancer-disable-tcp-reset: "false"
```

## Testing Internal Load Balancers

Test from within VPC/VNet:

```bash
# Deploy test pod
kubectl run test-pod --image=curlimages/curl:latest --command -- sleep 3600

# Get internal LB IP
INTERNAL_IP=$(kubectl get svc internal-api -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Test connectivity
kubectl exec test-pod -- curl -v http://$INTERNAL_IP
```

From on-premises via VPN:

```bash
# Assuming VPN connection established
curl http://10.0.1.100

# Test database connection
psql -h 10.0.1.150 -U postgres -d mydb
```

## Monitoring Internal Load Balancers

EKS monitoring:

```bash
# Check NLB target health
aws elbv2 describe-target-health \
  --target-group-arn arn:aws:elasticloadbalancing:region:account:targetgroup/...
```

GKE monitoring:

```bash
# Check backend service health
gcloud compute backend-services get-health BACKEND_SERVICE_NAME \
  --region=us-central1
```

AKS monitoring:

```bash
# Check load balancer backend health
az network lb show \
  --resource-group MC_myResourceGroup_myAKSCluster_eastus \
  --name kubernetes-internal
```

## Conclusion

Internal load balancers provide private network access to Kubernetes services without public internet exposure. Each cloud provider uses different annotations: EKS uses `aws-load-balancer-scheme: internal`, GKE uses `cloud.google.com/load-balancer-type: Internal`, and AKS uses `azure-load-balancer-internal: true`.

Proper configuration of subnets, IP addresses, and health checks ensures reliable private load balancing for internal services, databases, and APIs that should remain accessible only within your private network or to on-premises systems via VPN or dedicated connectivity.
