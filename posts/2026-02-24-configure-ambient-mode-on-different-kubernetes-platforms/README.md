# How to Configure Ambient Mode on Different Kubernetes Platforms

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mode, Kubernetes, Cloud Platform, GKE, EKS, AKS

Description: Platform-specific configuration guide for running Istio ambient mode on GKE, EKS, AKS, kind, k3s, and other Kubernetes distributions.

---

Istio ambient mode works across Kubernetes platforms, but each platform has its quirks. The CNI plugin configuration, node networking, and security contexts differ between GKE, EKS, AKS, and local distributions like kind and k3s. Getting these details right saves you from debugging mysterious connectivity failures.

This guide covers platform-specific configurations and gotchas for the most common Kubernetes environments.

## Google Kubernetes Engine (GKE)

GKE is one of the best-supported platforms for Istio ambient mode. Google is a major contributor to Istio and tests ambient mode heavily on GKE.

### Standard GKE Clusters

Install with the GKE platform profile:

```bash
kubectl create namespace istio-system
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: ResourceQuota
metadata:
  name: gcp-critical-pods
  namespace: istio-system
spec:
  hard:
    pods: 1000
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values:
      - system-node-critical
EOF

istioctl install --set profile=ambient \
  --set values.global.platform=gke \
  --skip-confirmation
```

The `global.platform=gke` setting is required because GKE uses non-standard CNI binary paths. If you install `ztunnel` and `istio-cni` into `istio-system`, the namespace also needs a ResourceQuota that allows `system-node-critical` pods; alternatively, install those node components into `kube-system`.

### GKE Autopilot

GKE Autopilot is not a good target for ambient mode today. Ambient mode requires the Istio CNI node agent, and the Istio CNI node agent requires node-level privileges that are not available on GKE Autopilot.

If you need Istio on Autopilot, use a supported sidecar installation path or a managed Cloud Service Mesh option instead of ambient mode. For ambient mode, use GKE Standard.

```yaml
# Example resource sizing for non-Autopilot clusters
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
  --set values.global.platform=gke \
  --skip-confirmation
```

The GKE platform profile sets the CNI paths Istio needs. If you are managing Cilium yourself on another platform, make sure Cilium is configured with `cni.exclusive=false` so it does not remove chained CNI configuration.

## Amazon Elastic Kubernetes Service (EKS)

### EKS with VPC CNI

EKS uses the AWS VPC CNI plugin by default. Istio's CNI plugin chains with the VPC CNI:

```bash
istioctl install --set profile=ambient \
  --skip-confirmation
```

One important consideration: EKS nodes and pods can have security groups that may block inter-node traffic on port 15008 (HBONE). Make sure the node or pod security groups that apply to your workloads allow this traffic between nodes or pods:

```bash
# Replace sg-... with the node or pod security group that applies to your workloads
NODE_SG=sg-0123456789abcdef0

# Allow HBONE traffic within that security group
aws ec2 authorize-security-group-ingress \
  --group-id $NODE_SG \
  --protocol tcp \
  --port 15008 \
  --source-group $NODE_SG
```

If you use AWS VPC CNI pod ENI trunking with pod-attached security groups, set `POD_SECURITY_GROUP_ENFORCING_MODE=standard` or kubelet health probes can fail:

```bash
kubectl set env daemonset aws-node -n kube-system \
  POD_SECURITY_GROUP_ENFORCING_MODE=standard
```

### EKS with Calico

If you are using Calico on EKS, the CNI configuration needs to chain correctly:

```bash
istioctl install --set profile=ambient \
  --set values.cni.chained=true \
  --skip-confirmation
```

Verify the CNI config was inserted correctly:

```bash
kubectl exec -n istio-system -l k8s-app=istio-cni-node -- \
  sh -c 'ls -1 /host/etc/cni/net.d && sed -n "1,40p" /host/etc/cni/net.d/*.conflist'
```

You should see the Istio CNI plugin listed in the plugins array.

## Azure Kubernetes Service (AKS)

### AKS with Azure CNI

```bash
istioctl install --set profile=ambient --skip-confirmation
```

AKS with Azure CNI works well with ambient mode. The main thing to verify is that the network security group allows port 15008 between nodes.

### AKS with kubenet

AKS kubenet uses bridge networking, which works differently:

```bash
istioctl install --set profile=ambient \
  --set values.cni.cniBinDir=/opt/cni/bin \
  --skip-confirmation
```

### AKS with Istio Addon

AKS offers a managed Istio addon, but it does not support sidecar-less ambient mode yet. If you need ambient mode, install open source Istio yourself rather than using the managed addon.

## kind (Kubernetes IN Docker)

kind is popular for local development. It works well with ambient mode using its default CNI.

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
istioctl install --set profile=ambient --skip-confirmation
```

kind uses kindnet as its CNI. Istio's CNI plugin chains with it automatically. The main limitation is that kind nodes share the host kernel, so eBPF features may not work correctly. Stick with iptables-based interception.

## k3s

k3s uses Flannel as its default CNI and has a non-standard CNI configuration path:

```bash
istioctl install --set profile=ambient \
  --set values.global.platform=k3s \
  --skip-confirmation
```

If you have overridden the bundled k3s CNI paths or use a custom CNI, set the paths explicitly:

```bash
istioctl install --set profile=ambient \
  --set values.cni.cniConfDir=/var/lib/rancher/k3s/agent/etc/cni/net.d \
  --set values.cni.cniBinDir=/var/lib/rancher/k3s/data/current/bin/ \
  --skip-confirmation
```

Verify the CNI plugin was installed:

```bash
kubectl logs -l k8s-app=istio-cni-node -n istio-system --tail=20
```

k3s also runs with a minimal set of Kubernetes APIs. Make sure the Kubernetes Gateway API CRDs are installed for waypoint proxy support:

```bash
kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.4.0/experimental-install.yaml
```

## Minikube

Minikube works with ambient mode using the default CNI:

```bash
minikube start --cpus=4 --memory=8192

istioctl install --set profile=ambient --skip-confirmation
```

If you are using Minikube with the Docker driver, add the minikube platform profile because the Docker driver uses a non-standard bind mount path:

```bash
istioctl install --set profile=ambient \
  --set values.global.platform=minikube \
  --skip-confirmation
```

## OpenShift

OpenShift has stricter security contexts. ztunnel and istio-cni need special permissions:

```bash
istioctl install --set profile=openshift-ambient --skip-confirmation
```

OpenShift requires the `ztunnel` and `istio-cni` components to run in `kube-system`, and the OpenShift ambient profile sets the required platform values. With OVN-Kubernetes, set `routingViaHost: true` in the `gatewayConfig` spec so kubelet probe traffic is routed through the host correctly.

## Helm Installation Across Platforms

If you use Helm, the platform-specific settings go in your values files:

```yaml
# gke-values.yaml
global:
  platform: gke

# eks-values.yaml
# No platform override is required for default EKS VPC CNI.

# k3s-values.yaml
global:
  platform: k3s
```

```bash
helm install istio-cni istio/cni -n istio-system \
  --set profile=ambient \
  -f platform-values.yaml \
  --wait
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
