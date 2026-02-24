# How to Install Istio on Kubernetes Using Kops

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kops, Kubernetes, AWS, Service Mesh, Infrastructure

Description: How to set up Istio on a Kubernetes cluster provisioned with kops, including cluster creation, networking, and mesh configuration.

---

kops (Kubernetes Operations) is one of the original tools for creating production-grade Kubernetes clusters, primarily on AWS. Unlike managed services like EKS, kops gives you full control over the control plane, networking, and node configuration. If you're running kops-managed clusters and want to add Istio, the process is straightforward with a few networking considerations.

## Prerequisites

- AWS account with appropriate permissions
- kops installed
- kubectl
- istioctl
- An S3 bucket for kops state store
- A DNS domain configured in Route53

Install kops:

```bash
# macOS
brew install kops

# Linux
curl -Lo kops https://github.com/kubernetes/kops/releases/download/v1.29.0/kops-linux-amd64
chmod +x kops
sudo mv kops /usr/local/bin/
```

Set up environment variables:

```bash
export KOPS_STATE_STORE=s3://your-kops-state-bucket
export NAME=istio.k8s.example.com
```

## Step 1: Create a kops Cluster

Create a cluster specification:

```bash
kops create cluster \
  --name $NAME \
  --state $KOPS_STATE_STORE \
  --zones us-east-1a,us-east-1b,us-east-1c \
  --node-count 3 \
  --node-size t3.xlarge \
  --control-plane-size t3.large \
  --control-plane-count 3 \
  --networking calico \
  --dns-zone example.com \
  --cloud aws
```

A few important choices here:

- **t3.xlarge** for worker nodes gives you 4 vCPUs and 16 GB RAM - enough for Istio plus workloads
- **3 control plane nodes** across 3 AZs for high availability
- **Calico networking** works well with Istio and supports NetworkPolicy

Review the cluster config:

```bash
kops edit cluster $NAME
```

Apply it:

```bash
kops update cluster $NAME --yes
```

Wait for the cluster to be ready (this takes 5-10 minutes):

```bash
kops validate cluster $NAME --wait 10m
```

Verify with kubectl:

```bash
kubectl get nodes
```

## Step 2: Install Istio

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

Pre-check:

```bash
istioctl x precheck
```

Install with a kops-friendly configuration:

```yaml
# istio-kops.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          serviceAnnotations:
            service.beta.kubernetes.io/aws-load-balancer-type: nlb
            service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
```

```bash
istioctl install -f istio-kops.yaml -y
```

## Step 3: Verify

```bash
kubectl get pods -n istio-system
kubectl get svc -n istio-system
```

Since kops on AWS has the cloud controller manager, LoadBalancer services get AWS ELBs or NLBs automatically.

## Step 4: Test

```bash
kubectl label namespace default istio-injection=enabled
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Get the load balancer hostname:

```bash
export INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}')
curl http://$INGRESS_HOST/productpage
```

## Networking Considerations

### Calico and Istio

Calico is the recommended CNI plugin for kops with Istio. It supports NetworkPolicy and doesn't conflict with Istio's traffic management. If you used a different CNI, make sure it's compatible.

In the cluster spec, verify Calico is configured:

```bash
kops edit cluster $NAME
```

Look for:

```yaml
networking:
  calico: {}
```

### Pod CIDR and Service CIDR

Make sure your CIDRs don't overlap and have enough IPs for Istio sidecars. Each pod with a sidecar still uses one IP, but you need to account for the additional pods (istiod, gateways, addons).

Check the cluster's networking config:

```yaml
networking:
  calico: {}
nonMasqueradeCIDR: 100.64.0.0/10
```

## Security Groups

kops creates security groups automatically. But if you've customized them, make sure:

- Worker nodes can talk to each other on all ports (for Istio mesh traffic)
- The load balancer security group allows inbound traffic on 80 and 443
- Control plane nodes can reach worker nodes on port 15017 (for webhook calls)

You can check security groups in the AWS console or with:

```bash
aws ec2 describe-security-groups --filters "Name=tag:KubernetesCluster,Values=$NAME"
```

## Using kops Instance Groups for Istio

You might want dedicated nodes for Istio components. Create a separate instance group:

```bash
kops create instancegroup istio-system \
  --name $NAME \
  --role Node \
  --subnet us-east-1a
```

Edit it to add labels and taints:

```yaml
apiVersion: kops.k8s.io/v1alpha2
kind: InstanceGroup
metadata:
  name: istio-system
spec:
  image: 099720109477/ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-20240701
  machineType: t3.xlarge
  maxSize: 3
  minSize: 2
  nodeLabels:
    dedicated: istio
  taints:
    - dedicated=istio:NoSchedule
  subnets:
    - us-east-1a
```

Then configure Istio to use these nodes:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  components:
    pilot:
      k8s:
        nodeSelector:
          dedicated: istio
        tolerations:
          - key: dedicated
            value: istio
            effect: NoSchedule
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          nodeSelector:
            dedicated: istio
          tolerations:
            - key: dedicated
              value: istio
              effect: NoSchedule
```

Apply the instance group changes:

```bash
kops update cluster $NAME --yes
kops rolling-update cluster $NAME --yes
```

## Upgrading Kubernetes and Istio

With kops, you manage Kubernetes upgrades yourself. When upgrading both Kubernetes and Istio:

1. Upgrade Kubernetes first through kops
2. Then upgrade Istio

```bash
# Upgrade Kubernetes
kops edit cluster $NAME
# Change kubernetesVersion to the new version
kops update cluster $NAME --yes
kops rolling-update cluster $NAME --yes

# Then upgrade Istio
istioctl upgrade -y
```

Always check the Istio compatibility matrix for supported Kubernetes versions before upgrading.

## HA Configuration

kops makes it easy to run a highly available setup. With 3 control plane nodes across 3 AZs and multiple worker nodes, your Istio mesh gets the same HA benefits:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        replicaCount: 2
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          replicaCount: 2
          hpaSpec:
            minReplicas: 2
            maxReplicas: 10
```

## Troubleshooting kops + Istio

If the NLB/ELB isn't being created, verify the cloud controller manager is running:

```bash
kubectl get pods -n kube-system | grep cloud-controller
```

If node-to-node communication is failing, check the security groups and Calico status:

```bash
kubectl get pods -n kube-system | grep calico
```

If istiod fails to start with certificate errors, check the kube-apiserver flags. kops sometimes configures the API server differently than managed services, and this can affect webhook certificate validation.

kops gives you a level of control over the Kubernetes cluster that managed services don't. This means more work during setup, but also more flexibility in how you configure things like networking, node types, and placement. Once the cluster is set up and Istio is installed, the day-to-day mesh operations are the same as on any other platform.
