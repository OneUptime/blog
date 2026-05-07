# How to Configure IPv6 for AWS EKS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, EKS, Kubernetes, CNI, Container Networking

Description: Configure AWS EKS clusters to use IPv6 for pod networking, enabling each pod to have a unique IPv6 address and eliminating IPv4 address exhaustion concerns.

## Introduction

AWS EKS supports IPv6 pod networking using the AWS VPC CNI plugin. In IPv6 mode, each pod gets a unique IPv6 address from a delegated prefix in the VPC subnet, eliminating the IPv4 address exhaustion problem common in large clusters. IPv6 EKS clusters are single-stack IPv6 for pods and services, while nodes still have both IPv4 and IPv6 addresses and pods get a host-local IPv4 address for outbound communication with IPv4 endpoints.

## Create IPv6 EKS Cluster

```bash
# Create EKS cluster with IPv6 IP family using an eksctl config file
cat << 'EOF' > /tmp/eks-ipv6-cluster.yaml
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: ipv6-cluster
  region: us-east-1
  version: "1.35"
kubernetesNetworkConfig:
  ipFamily: IPv6
addons:
  - name: vpc-cni
    version: latest
  - name: coredns
    version: latest
  - name: kube-proxy
    version: latest
iam:
  withOIDC: true
managedNodeGroups:
  - name: managed-workers
    instanceType: t3.medium
    desiredCapacity: 3
    minSize: 1
    maxSize: 5
EOF

eksctl create cluster -f /tmp/eks-ipv6-cluster.yaml
```

## Verify IPv6 Pod Networking

```bash
# Get kubeconfig
aws eks update-kubeconfig --name ipv6-cluster --region us-east-1

# Check default pods
kubectl get pods -n kube-system -o wide
# IP column should show IPv6 addresses

# Check node address families
kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{" "}{range .status.addresses[*]}{.type}={.address}{" "}{end}{"\n"}{end}'
# Nodes should have both IPv4 and IPv6 addresses

# Deploy a test pod
kubectl run test --image=nginx --port=80
kubectl get pod test -o wide
# IP column should be an IPv6 address

# Verify pod IP directly
kubectl get pod test -o jsonpath='{.status.podIP}{"\n"}'

# Check pods in all namespaces
kubectl get pods -A -o wide | grep -v "^NAMESPACE" | \
    awk '{print $2, $7}' | head -20
```

## Configure Services for IPv6

```yaml
# service-ipv6.yaml - Service with IPv6
apiVersion: v1
kind: Service
metadata:
  name: web-service
  namespace: default
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
  type: ClusterIP

  # EKS IPv6 clusters are single-stack for pods and services
  ipFamilies:
    - IPv6
  ipFamilyPolicy: SingleStack
```

```yaml
# deployment-ipv6.yaml - Deployment targeting IPv6 service
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "250m"
          limits:
            memory: "128Mi"
            cpu: "500m"
```

## Load Balancer Service for IPv6

```yaml
# lb-service-ipv6.yaml - Network LoadBalancer with IPv6 client support
apiVersion: v1
kind: Service
metadata:
  name: web-lb
  namespace: default
  annotations:
    # Use a dualstack NLB so clients can connect over IPv4 or IPv6
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "ip"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    service.beta.kubernetes.io/aws-load-balancer-ip-address-type: "dualstack"
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
  type: LoadBalancer
```

## AWS Load Balancer Controller for IPv6

```bash
# Create IAM policy and service account for AWS Load Balancer Controller
curl -O https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.14.1/docs/install/iam_policy.json

aws iam create-policy \
    --policy-name AWSLoadBalancerControllerIAMPolicy \
    --policy-document file://iam_policy.json

eksctl create iamserviceaccount \
    --cluster=ipv6-cluster \
    --namespace=kube-system \
    --name=aws-load-balancer-controller \
    --attach-policy-arn=arn:aws:iam::<AWS_ACCOUNT_ID>:policy/AWSLoadBalancerControllerIAMPolicy \
    --override-existing-serviceaccounts \
    --region us-east-1 \
    --approve

# Install AWS Load Balancer Controller
helm repo add eks https://aws.github.io/eks-charts
helm repo update eks

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
    -n kube-system \
    --set clusterName=ipv6-cluster \
    --set serviceAccount.create=false \
    --set serviceAccount.name=aws-load-balancer-controller \
    --version 1.14.0

# Verify installation
kubectl get deployment -n kube-system aws-load-balancer-controller
```

## Troubleshoot IPv6 Pod Networking

```bash
# Check VPC CNI IPv6 settings on the aws-node daemonset
kubectl -n kube-system describe daemonset aws-node | grep -E 'ENABLE_IPv6|ENABLE_PREFIX_DELEGATION'
# Should show ENABLE_IPv6=true and ENABLE_PREFIX_DELEGATION=true

# Check pod IP allocation
kubectl get pods -A -o jsonpath='{range .items[*]}{.metadata.namespace}{"/"}{.metadata.name}{" "}{.status.podIP}{"\n"}{end}'

# Check the cluster's service IPv6 CIDR
aws eks describe-cluster \
    --name ipv6-cluster \
    --region us-east-1 \
    --query 'cluster.kubernetesNetworkConfig.serviceIpv6Cidr' \
    --output text

# Test IPv6 pod-to-pod communication
kubectl exec pod-a -- ping -6 -c 3 <pod-b-ipv6-address>
```

## Conclusion

AWS EKS IPv6 mode assigns pods IPv6 addresses from a `/80` prefix delegated to each node, eliminating IPv4 exhaustion concerns for pod networking. Enable IPv6 at cluster creation with `ipFamily: IPv6` - it cannot be changed after creation. Services in IPv6 clusters get IPv6 ClusterIPs, while nodes remain dual-stack and pods use host-local IPv4 for outbound IPv4 access. Use the AWS Load Balancer Controller with IP targets and `dualstack` annotations when exposing IPv6 Pods through an AWS load balancer. Verify pod networking with `kubectl get pods -o wide` and confirm IPv6 addresses appear in the `IP` column.
