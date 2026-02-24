# How to Configure Ambient Mode on Different Kubernetes Platforms

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Kubernetes, Cloud Platforms, GKE, EKS, AKS

Description: Platform-specific configuration guide for running Istio ambient mode on GKE, EKS, AKS, kind, k3s, and other Kubernetes distributions.

---

Istio ambient mode works across Kubernetes platforms, but each platform has its quirks. The CNI plugin configuration, node networking, and security contexts differ between GKE, EKS, AKS, and local distributions like kind and k3s. Getting these details right saves you from debugging mysterious connectivity failures.

This guide covers platform-specific configurations and gotchas for the most common Kubernetes environments.

## Google Kubernetes Engine (GKE)

GKE is one of the best-supported platforms for Istio ambient mode. Google is a major contributor to Istio and tests ambient mode heavily on GKE.

### Standard GKE Clusters

Install works out of the box:

```bash
istioctl install --set profile=ambient -y
```

No special configuration needed. The istio-cni plugin works with GKE's default CNI (kubenet or VPC-native).

### GKE Autopilot

GKE Autopilot has restrictions on privileged pods and host networking. The istio-cni DaemonSet needs special handling:

```bash
istioctl install --set profile=ambient \
  --set values.cni.ambient.configDir=/etc/cni/net.d \
  --set values.cni.ambient.enabled=true \
  -y
```

Autopilot enforces resource requests on all pods. Make sure your ztunnel and istio-cni have reasonable resource requests:

```yaml
# ztunnel values
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: "1"
    memory: 512Mi
```

### GKE with Dataplane V2

GKE Dataplane V2 uses Cilium as the CNI. Istio's CNI plugin needs to coexist with Cilium:

```bash
istioctl install --set profile=ambient \
  --set values.cni.cniBinDir=/home/kubernetes/bin \
  -y
```

The `cniBinDir` differs from the default because GKE stores CNI binaries in a non-standard location.

## Amazon Elastic Kubernetes Service (EKS)

### EKS with VPC CNI

EKS uses the AWS VPC CNI plugin by default. Istio's CNI plugin chains with the VPC CNI:

```bash
istioctl install --set profile=ambient \
  --set values.cni.cniBinDir=/opt/cni/bin \
  -y
```

One important consideration: EKS nodes have security groups that may block inter-node traffic on port 15008 (HBONE). Make sure the node security group allows this:

```bash
# Get the node security group
NODE_SG=$(aws eks describe-cluster --name my-cluster \
  --query 'cluster.resourcesVpcConfig.clusterSecurityGroupId' --output text)

# Allow HBONE traffic between nodes
aws ec2 authorize-security-group-ingress \
  --group-id $NODE_SG \
  --protocol tcp \
  --port 15008 \
  --source-group $NODE_SG
```

### EKS with Calico

If you are using Calico on EKS, the CNI configuration needs to chain correctly:

```bash
istioctl install --set profile=ambient \
  --set values.cni.chained=true \
  -y
```

Verify the CNI config was inserted correctly:

```bash
kubectl exec -n istio-system -l k8s-app=istio-cni-node -- \
  cat /etc/cni/net.d/10-aws.conflist | head -30
```

You should see the Istio CNI plugin listed in the plugins array.

## Azure Kubernetes Service (AKS)

### AKS with Azure CNI

```bash
istioctl install --set profile=ambient -y
```

AKS with Azure CNI works well with ambient mode. The main thing to verify is that the network security group allows port 15008 between nodes.

### AKS with kubenet

AKS kubenet uses bridge networking, which works differently:

```bash
istioctl install --set profile=ambient \
  --set values.cni.cniBinDir=/opt/cni/bin \
  -y
```

### AKS with Istio Addon

AKS offers a managed Istio addon, but it may not support ambient mode yet (as of early 2026). Check the latest AKS documentation. If you need ambient mode, install Istio yourself rather than using the managed addon.

## kind (Kubernetes IN Docker)

kind is popular for local development. It works well with ambient mode but needs one configuration tweak.

Create a kind cluster:

```yaml
# kind-config.yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: worker
  - role: worker
networking:
  disableDefaultCNI: false
```

```bash
kind create cluster --config kind-config.yaml
```

Install Istio:

```bash
istioctl install --set profile=ambient -y
```

kind uses kindnet as its CNI. Istio's CNI plugin chains with it automatically. The main limitation is that kind nodes share the host kernel, so eBPF features may not work correctly. Stick with iptables-based interception.

## k3s

k3s uses Flannel as its default CNI and has a non-standard CNI configuration path:

```bash
istioctl install --set profile=ambient \
  --set values.cni.cniConfDir=/var/lib/rancher/k3s/agent/etc/cni/net.d \
  --set values.cni.cniBinDir=/var/lib/rancher/k3s/data/current/bin \
  -y
```

Verify the CNI plugin was installed:

```bash
kubectl logs -l k8s-app=istio-cni-node -n istio-system --tail=20
```

k3s also runs with a minimal set of Kubernetes APIs. Make sure the Kubernetes Gateway API CRDs are installed for waypoint proxy support:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml
```

## Minikube

Minikube works with ambient mode using the default CNI:

```bash
minikube start --cpus=4 --memory=8192

istioctl install --set profile=ambient -y
```

If you are using Minikube with the Docker driver, note that network policies may not work as expected. For testing ambient mode features, the Minikube VM driver (VirtualBox or Hyperkit) gives more realistic networking behavior.

## OpenShift

OpenShift has stricter security contexts. ztunnel and istio-cni need special permissions:

```bash
# Create the istio-system namespace with proper SCC
oc adm policy add-scc-to-group privileged system:serviceaccounts:istio-system

# Install with OpenShift-specific settings
istioctl install --set profile=ambient \
  --set values.cni.privileged=true \
  --set values.global.platform=openshift \
  -y
```

OpenShift's default network plugin (OVN-Kubernetes) works with Istio's CNI chaining.

## Helm Installation Across Platforms

If you use Helm, the platform-specific settings go in your values files:

```yaml
# gke-values.yaml
cni:
  cniBinDir: /home/kubernetes/bin

# eks-values.yaml
cni:
  cniBinDir: /opt/cni/bin

# k3s-values.yaml
cni:
  cniConfDir: /var/lib/rancher/k3s/agent/etc/cni/net.d
  cniBinDir: /var/lib/rancher/k3s/data/current/bin
```

```bash
helm install istio-cni istio/cni -n istio-system -f platform-values.yaml
```

## Verifying Platform Compatibility

After installation, run a quick smoke test regardless of platform:

```bash
# Check all ambient components
kubectl get pods -n istio-system

# Verify ztunnel DaemonSet
kubectl get ds ztunnel -n istio-system

# Verify CNI DaemonSet
kubectl get ds istio-cni-node -n istio-system

# Create a test namespace
kubectl create namespace ambient-test
kubectl label namespace ambient-test istio.io/dataplane-mode=ambient

# Deploy test pods
kubectl apply -f samples/sleep/sleep.yaml -n ambient-test
kubectl apply -f samples/httpbin/httpbin.yaml -n ambient-test

# Test connectivity
kubectl exec deploy/sleep -n ambient-test -- curl -s http://httpbin:8000/headers

# Verify mTLS
istioctl ztunnel-config workloads | grep ambient-test
```

If the test passes, your platform is configured correctly. If it fails, check the ztunnel and istio-cni logs for platform-specific errors.

## Cross-Platform Considerations

A few things to keep in mind regardless of platform:

1. Port 15008 must be open between nodes for HBONE
2. The istio-cni DaemonSet needs privileged access or appropriate security context
3. The CNI binary directory varies by platform - get this wrong and traffic interception fails silently
4. Some platforms restrict DaemonSets from running on control plane nodes - this is fine since you usually do not run application workloads there anyway

Test your specific platform configuration thoroughly before relying on it in production. The ambient mode installation is platform-aware, but edge cases exist, especially with custom CNI plugins or unusual network configurations.
