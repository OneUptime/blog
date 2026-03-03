# How to Integrate Istio with AWS Application Load Balancer

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, AWS, ALB, Kubernetes, EKS, Networking

Description: How to set up AWS Application Load Balancer in front of Istio ingress gateway on Amazon EKS clusters.

---

If you are running Istio on Amazon EKS, there is a good chance you want to use the AWS Application Load Balancer (ALB) for your ingress traffic. ALB gives you native AWS integration with features like WAF, Cognito authentication, and tight integration with Route53 and ACM for TLS certificates. Pairing it with Istio means you get ALB's AWS-native features on the outside and Istio's traffic management on the inside.

## The Setup

The standard architecture puts the ALB in front of the Istio ingress gateway. AWS traffic flows like this:

```text
Internet -> ALB -> Target Group -> Istio Ingress Gateway Pods -> Mesh Services
```

You need the AWS Load Balancer Controller installed in your EKS cluster. This controller watches for Kubernetes Ingress and Service resources with specific annotations and provisions ALBs automatically.

## Installing the AWS Load Balancer Controller

First, create an IAM policy for the controller:

```bash
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.0/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam-policy.json
```

Create a service account with IRSA (IAM Roles for Service Accounts):

```bash
eksctl create iamserviceaccount \
  --cluster=my-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::111122223333:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve
```

Install the controller with Helm:

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=my-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller
```

## Configuring the Istio Ingress Gateway

Change the Istio ingress gateway service to use NodePort instead of the default LoadBalancer type. The ALB will handle the load balancing:

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
          type: NodePort
        serviceAnnotations:
          alb.ingress.kubernetes.io/healthcheck-path: /healthz/ready
          alb.ingress.kubernetes.io/healthcheck-port: "15021"
```

Alternatively, you can keep the service as ClusterIP and use IP mode targeting, which is cleaner:

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
          type: ClusterIP
```

## Creating the ALB Ingress Resource

Now create a Kubernetes Ingress resource that tells the AWS Load Balancer Controller to provision an ALB:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: istio-ingress-alb
  namespace: istio-system
  annotations:
    kubernetes.io/ingress.class: alb
    alb.ingress.kubernetes.io/scheme: internet-facing
    alb.ingress.kubernetes.io/target-type: ip
    alb.ingress.kubernetes.io/listen-ports: '[{"HTTPS":443}]'
    alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:111122223333:certificate/abc123
    alb.ingress.kubernetes.io/ssl-policy: ELBSecurityPolicy-TLS13-1-2-2021-06
    alb.ingress.kubernetes.io/healthcheck-path: /healthz/ready
    alb.ingress.kubernetes.io/healthcheck-port: "15021"
    alb.ingress.kubernetes.io/backend-protocol: HTTP
spec:
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: istio-ingressgateway
            port:
              number: 80
```

The `target-type: ip` annotation is important because it uses the pod IPs directly instead of going through node ports. This is more efficient and works with the VPC CNI plugin on EKS.

## Adding TLS with ACM

AWS Certificate Manager (ACM) certificates are free and auto-renewing. Reference them in the ALB Ingress annotation:

```yaml
annotations:
  alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:111122223333:certificate/your-cert-id
  alb.ingress.kubernetes.io/ssl-redirect: "443"
```

For multiple domains, you can specify multiple certificate ARNs:

```yaml
annotations:
  alb.ingress.kubernetes.io/certificate-arn: arn:aws:acm:us-east-1:111122223333:certificate/cert1,arn:aws:acm:us-east-1:111122223333:certificate/cert2
```

The ALB terminates TLS and forwards plain HTTP to the Istio ingress gateway. Inside the mesh, Istio handles mTLS between services.

## Enabling WAF

One of the reasons to use ALB is AWS WAF integration. Associate a WAF WebACL with your ALB:

```yaml
annotations:
  alb.ingress.kubernetes.io/waf-acl-id: your-waf-web-acl-id
```

Or with WAFv2:

```yaml
annotations:
  alb.ingress.kubernetes.io/wafv2-acl-arn: arn:aws:wafv2:us-east-1:111122223333:regional/webacl/my-acl/abc123
```

## Preserving Client IP

ALB adds the `X-Forwarded-For` header automatically. Tell Istio to trust it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 1
```

This way, Istio's access logs and authorization policies can use the real client IP instead of the ALB's internal IP.

## Setting Up Route53

Point your domain to the ALB. Get the ALB DNS name:

```bash
kubectl get ingress istio-ingress-alb -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

Create a Route53 alias record:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "myapp.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "k8s-istiosys-istioing-abc123.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

Or use external-dns to automate this:

```bash
helm install external-dns bitnami/external-dns \
  --set provider=aws \
  --set domainFilters[0]=example.com \
  --set policy=sync
```

## Configuring the Istio Gateway and VirtualService

With the ALB handling external traffic, set up your Istio Gateway and VirtualService as usual:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: app-gateway
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
    - myapp.example.com
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
  - myapp.example.com
  gateways:
  - istio-system/app-gateway
  http:
  - route:
    - destination:
        host: myapp.default.svc.cluster.local
        port:
          number: 8080
```

## Monitoring

Check the ALB health and target group status:

```bash
# Get ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers --names k8s-istiosys-istioing --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# Check target health
TG_ARN=$(aws elbv2 describe-target-groups --load-balancer-arn $ALB_ARN --query 'TargetGroups[0].TargetGroupArn' --output text)
aws elbv2 describe-target-health --target-group-arn $TG_ARN
```

The ALB plus Istio combination works well on EKS. You get native AWS features like WAF, ACM certificates, and Cognito auth at the edge, while Istio handles everything inside the cluster. The key gotcha is making sure health checks are configured correctly and that the target type matches your service type.
