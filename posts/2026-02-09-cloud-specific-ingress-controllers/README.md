# How to Configure Cloud-Specific Ingress Controllers on EKS, GKE, and AKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Ingress, AWS, GCP, Azure

Description: Configure cloud-native ingress controllers on EKS, GKE, and AKS including AWS Load Balancer Controller, GKE Ingress, and Azure Application Gateway Ingress Controller.

---

While NGINX and Traefik work on any Kubernetes cluster, cloud-specific ingress controllers integrate deeply with cloud load balancers, provide better performance, and offer native cloud features. Each major cloud provider has their own ingress controller implementation.

This guide shows you how to set up and configure cloud-native ingress controllers on AWS EKS, Google GKE, and Azure AKS.

## AWS Load Balancer Controller for EKS

The AWS Load Balancer Controller provisions Application Load Balancers (ALB) and Network Load Balancers (NLB) for Kubernetes ingress resources.

Install using Helm:

```bash
# Create IAM policy
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/main/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam-policy.json

# Create service account
eksctl create iamserviceaccount \
  --cluster=my-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::ACCOUNT_ID:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve

# Install controller
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=my-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

Create an ingress with ALB:

```yaml
# alb-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:region:account:certificate/xxxxx
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTP": 80}, {"HTTPS": 443}]'
    alb.ingress.kubernetes.io/ssl-redirect: '443'
spec:
  ingressClassName: alb
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

For internal ALB:

```yaml
annotations:
  alb.ingress.kubernetes.io/scheme: internal
  alb.ingress.kubernetes.io/target-type: ip
  alb.ingress.kubernetes.io/subnets: subnet-xxxxx,subnet-yyyyy
```

## GKE Ingress Controller

GKE has a built-in ingress controller that creates Google Cloud Load Balancers. It is enabled by default.

Create an ingress:

```yaml
# gke-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    kubernetes.io/ingress.class: "gce"
    kubernetes.io/ingress.global-static-ip-name: "web-static-ip"
    networking.gke.io/managed-certificates: "app-cert"
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: app-service
            port:
              number: 80
```

Create a managed certificate:

```yaml
# managed-cert.yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: app-cert
spec:
  domains:
    - app.example.com
    - www.app.example.com
```

Reserve static IP:

```bash
gcloud compute addresses create web-static-ip --global
```

For internal load balancer:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: internal-ingress
  annotations:
    kubernetes.io/ingress.class: "gce-internal"
    kubernetes.io/ingress.regional-static-ip-name: "internal-ip"
spec:
  rules:
  - host: internal.example.com
    http:
      paths:
      - path: /*
        pathType: ImplementationSpecific
        backend:
          service:
            name: internal-service
            port:
              number: 80
```

## Azure Application Gateway Ingress Controller

AGIC integrates with Azure Application Gateway for advanced routing features.

Install using Helm:

```bash
# Create Application Gateway
az network application-gateway create \
  --name myAppGateway \
  --location eastus \
  --resource-group myResourceGroup \
  --vnet-name myVNet \
  --subnet gateway-subnet \
  --capacity 2 \
  --sku Standard_v2 \
  --http-settings-cookie-based-affinity Disabled \
  --frontend-port 80 \
  --http-settings-port 80 \
  --http-settings-protocol Http \
  --public-ip-address myAGPublicIPAddress

# Install AGIC
helm repo add application-gateway-kubernetes-ingress https://appgwingress.blob.core.windows.net/ingress-azure-helm-package/
helm repo update

helm install agic application-gateway-kubernetes-ingress/ingress-azure \
  --namespace kube-system \
  --set appgw.name=myAppGateway \
  --set appgw.resourceGroup=myResourceGroup \
  --set appgw.subscriptionId=SUBSCRIPTION_ID \
  --set appgw.shared=false \
  --set kubernetes.watchNamespace=default \
  --set armAuth.type=servicePrincipal \
  --set armAuth.secretJSON=$(cat sp.json | base64 -w0)
```

Create ingress:

```yaml
# agic-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
    appgw.ingress.kubernetes.io/ssl-redirect: "true"
    appgw.ingress.kubernetes.io/backend-path-prefix: "/"
spec:
  tls:
  - secretName: app-tls-secret
    hosts:
    - app.example.com
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

Advanced routing with path-based:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: multi-path-ingress
  annotations:
    kubernetes.io/ingress.class: azure/application-gateway
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api/*
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
      - path: /*
        pathType: Prefix
        backend:
          service:
            name: web-service
            port:
              number: 80
```

## Configuring TLS/SSL

AWS ALB with ACM certificate:

```yaml
annotations:
  alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:123456789:certificate/xxxxx
  alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-TLS-1-2-2017-01
```

GKE with managed certificates:

```yaml
annotations:
  networking.gke.io/managed-certificates: "app-cert,api-cert"
```

Azure AGIC with Key Vault:

```yaml
annotations:
  appgw.ingress.kubernetes.io/appgw-ssl-certificate: "myAppGatewaySslCert"
```

## Health Check Configuration

AWS ALB health checks:

```yaml
annotations:
  alb.ingress.kubernetes.io/healthcheck-path: /health
  alb.ingress.kubernetes.io/healthcheck-interval-seconds: '15'
  alb.ingress.kubernetes.io/healthcheck-timeout-seconds: '5'
  alb.ingress.kubernetes.io/healthy-threshold-count: '2'
  alb.ingress.kubernetes.io/unhealthy-threshold-count: '2'
```

GKE backend config:

```yaml
apiVersion: cloud.google.com/v1
kind: BackendConfig
metadata:
  name: app-backendconfig
spec:
  healthCheck:
    checkIntervalSec: 10
    port: 8080
    type: HTTP
    requestPath: /healthz
```

## Monitoring Ingress Controllers

Check AWS LB Controller:

```bash
kubectl logs -n kube-system deployment/aws-load-balancer-controller
kubectl get targetgroupbindings
```

Monitor GKE ingress:

```bash
kubectl describe ingress app-ingress
gcloud compute backend-services list
```

Check AGIC status:

```bash
kubectl logs -n kube-system deployment/ingress-azure
az network application-gateway show-backend-health \
  --name myAppGateway \
  --resource-group myResourceGroup
```

## Troubleshooting

AWS ALB issues:

```bash
# Check ingress events
kubectl describe ingress app-ingress

# Verify target groups
aws elbv2 describe-target-groups

# Check target health
aws elbv2 describe-target-health --target-group-arn arn:aws:...
```

GKE ingress issues:

```bash
# Check ingress status
kubectl get ingress -o yaml

# View backend service
gcloud compute backend-services describe k8s-be-xxxxx --global
```

## Conclusion

Cloud-native ingress controllers provide optimal integration with cloud load balancers, offering better performance and cloud-specific features compared to generic controllers. Choose the AWS Load Balancer Controller for EKS, the built-in GKE Ingress for GKE, or AGIC for AKS to leverage native cloud capabilities.
