# How to Validate Istio Prerequisites Before Installation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Prerequisites, Kubernetes, Validation, Service Mesh

Description: A comprehensive pre-installation checklist for Istio covering Kubernetes version, cluster resources, network requirements, and common pitfalls to avoid.

---

Installing Istio on a cluster that does not meet the prerequisites is a recipe for frustration. You will hit cryptic errors, pods that refuse to start, and configuration that silently fails. Running through a proper validation before installation saves you from debugging problems that should have been caught upfront.

This guide covers every prerequisite check you should run before installing Istio.

## Kubernetes Version Check

Istio supports specific Kubernetes versions. As a general rule, Istio 1.24 supports Kubernetes 1.27 through 1.31. Always check the official support matrix for your specific Istio version.

```bash
kubectl version --short
```

Verify both client and server versions:

```
Client Version: v1.30.2
Server Version: v1.30.2
```

If your cluster version is too old, upgrade Kubernetes first.

## Cluster Access and Permissions

You need cluster-admin permissions to install Istio because it creates CRDs, webhooks, and cluster-scoped RBAC resources:

```bash
kubectl auth can-i create customresourcedefinitions --all-namespaces
kubectl auth can-i create clusterroles --all-namespaces
kubectl auth can-i create mutatingwebhookconfigurations --all-namespaces
```

All should return `yes`. If not, get cluster-admin access before proceeding.

Check your current context:

```bash
kubectl config current-context
kubectl cluster-info
```

Make sure you are targeting the right cluster. Installing Istio on the wrong cluster is a mistake that happens more often than people admit.

## Node Resources

Istio's control plane needs resources. Check what is available:

```bash
kubectl top nodes
```

Minimum recommendations for a development setup:
- At least 2 CPU cores available across nodes
- At least 4 GiB of free memory

For production:
- At least 4 CPU cores available
- At least 8 GiB of free memory
- 3+ nodes for high availability

Check allocatable resources:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,CPU:.status.allocatable.cpu,MEMORY:.status.allocatable.memory
```

## Available Pod Capacity

Each Istio sidecar adds a pod to every application pod (technically, a container within the pod). Make sure your nodes can handle the additional pods:

```bash
kubectl get nodes -o custom-columns=NAME:.metadata.name,PODS:.status.capacity.pods
kubectl get pods -A --no-headers | wc -l
```

Compare the total pod capacity against current usage. Istio itself adds about 5-10 pods (depending on profile), plus every application pod gets a sidecar container.

## Network Requirements

### CNI Plugin

Verify your cluster has a working CNI plugin:

```bash
kubectl get pods -n kube-system -l k8s-app
```

You should see your CNI pods (Calico, Cilium, Flannel, etc.) running. Istio works with most CNI plugins, but some have known quirks:

- **Calico** - Works well, minor configuration needed for NetworkPolicy integration
- **Cilium** - Works well, can replace some Istio features
- **Flannel** - Works but lacks NetworkPolicy support
- **AWS VPC CNI** - Works, watch for IP exhaustion with sidecars

### Pod-to-Pod Connectivity

Test that pods can communicate across nodes:

```bash
# Create test pods on different nodes
kubectl run test-1 --image=busybox --restart=Never -- sleep 3600
kubectl run test-2 --image=busybox --restart=Never -- sleep 3600

# Get pod IPs
kubectl get pods -o wide

# Test connectivity
kubectl exec test-1 -- ping -c 3 <test-2-pod-ip>

# Clean up
kubectl delete pod test-1 test-2
```

### DNS Resolution

Verify cluster DNS is working:

```bash
kubectl run dns-test --image=busybox --restart=Never --rm -it -- nslookup kubernetes.default
```

You should see the cluster DNS resolve the `kubernetes.default` service.

### Port Availability

Istio uses several ports. Make sure nothing conflicts:

| Port | Used By | Protocol |
|---|---|---|
| 15000 | Envoy admin (per sidecar) | TCP |
| 15001 | Envoy outbound | TCP |
| 15006 | Envoy inbound | TCP |
| 15010 | istiod (plaintext xDS) | TCP |
| 15012 | istiod (mTLS xDS) | TCP |
| 15014 | istiod (monitoring) | TCP |
| 15017 | Webhook | HTTPS |
| 15020 | Merged Prometheus telemetry | TCP |
| 15021 | Health check | TCP |
| 15090 | Prometheus stats | TCP |

Check if any of these ports are already in use:

```bash
kubectl get svc -A -o json | jq -r '.items[] | select(.spec.ports[].port == 15012 or .spec.ports[].port == 15017) | .metadata.name'
```

## API Server Configuration

### Admission Webhooks

Istio requires MutatingAdmissionWebhook and ValidatingAdmissionWebhook to be enabled on the API server:

```bash
kubectl api-versions | grep admissionregistration.k8s.io/v1
```

This should return `admissionregistration.k8s.io/v1`. If not, your API server needs webhook admission controllers enabled.

### Third-Party Token Support

Istio uses projected service account tokens. Verify support:

```bash
kubectl get --raw /api/v1/namespaces/default/serviceaccounts/default/token -X POST \
  -H 'Content-Type: application/json' \
  -d '{"apiVersion":"authentication.k8s.io/v1","kind":"TokenRequest","spec":{"audiences":["istio-ca"],"expirationSeconds":3600}}' 2>/dev/null

echo $?
```

A return code of 0 means it works. If this fails, your API server might not have `--service-account-issuer` configured.

## Existing Istio Installation

Check if Istio is already installed (partially or fully):

```bash
# Check for existing CRDs
kubectl get crds | grep istio.io

# Check for existing namespaces
kubectl get namespace istio-system 2>/dev/null

# Check for existing webhooks
kubectl get mutatingwebhookconfiguration | grep istio
kubectl get validatingwebhookconfiguration | grep istio
```

If you find remnants of a previous installation, clean them up first. Leftover webhooks are especially problematic - they can intercept pod creation and fail because the old istiod is gone.

## istioctl Pre-Check

Istio provides a built-in pre-check command:

```bash
istioctl x precheck
```

This runs a comprehensive set of checks and reports any issues:

```
✔ No issues found when checking the cluster. Istio is safe to install or upgrade!
  To get started, check out https://istio.io/latest/docs/setup/getting-started/
```

If there are issues, you will see specific error messages with recommendations.

## Helm Pre-Flight

If installing with Helm, do a dry-run first:

```bash
helm install istio-base istio/base -n istio-system --create-namespace --dry-run

helm install istiod istio/istiod -n istio-system --dry-run
```

This validates that the templates render correctly and checks for obvious issues.

## Platform-Specific Checks

### GKE

```bash
# Check if you have the right permissions
gcloud container clusters describe <cluster-name> --zone <zone> --format='get(masterAuth)'

# Verify Workload Identity if using it
gcloud container clusters describe <cluster-name> --zone <zone> --format='get(workloadIdentityConfig)'
```

### EKS

```bash
# Check OIDC provider (needed for IAM roles)
aws eks describe-cluster --name <cluster-name> --query 'cluster.identity.oidc'

# Check node instance types have enough resources
aws ec2 describe-instance-types --instance-types <type> --query 'InstanceTypes[*].{Type:InstanceType,CPU:VCpuInfo.DefaultVCpus,Memory:MemoryInfo.SizeInMiB}'
```

### AKS

```bash
# Check cluster config
az aks show --resource-group <rg> --name <cluster> --query '{kubernetesVersion:kubernetesVersion,networkPlugin:networkProfile.networkPlugin}'
```

## Firewall and Security Group Checks

If your cluster uses network policies or external firewalls, make sure these ports are open between nodes:

- TCP 15012 (istiod xDS)
- TCP 15017 (webhook)
- TCP 15443 (east-west gateway, if multicluster)

Check for network policies that might block Istio:

```bash
kubectl get networkpolicies -A
```

If you have deny-all policies, you will need to add exceptions for Istio traffic.

## Storage Class (Optional)

If you plan to use Istio's persistent features (like Envoy access log files stored to disk), check available storage classes:

```bash
kubectl get storageclasses
```

## Automated Validation Script

Here is a script that runs all the essential checks:

```bash
#!/bin/bash
echo "=== Istio Pre-Installation Validation ==="
echo ""

echo "1. Kubernetes Version"
kubectl version --short 2>/dev/null || kubectl version
echo ""

echo "2. Cluster Admin Access"
kubectl auth can-i create crds --all-namespaces
echo ""

echo "3. Node Resources"
kubectl top nodes 2>/dev/null || echo "Metrics server not available, skipping"
echo ""

echo "4. Admission Webhooks"
kubectl api-versions | grep admissionregistration
echo ""

echo "5. Existing Istio Resources"
echo "CRDs: $(kubectl get crds 2>/dev/null | grep -c istio.io)"
echo "Webhooks: $(kubectl get mutatingwebhookconfiguration 2>/dev/null | grep -c istio)"
echo ""

echo "6. DNS Check"
kubectl run dns-check --image=busybox --restart=Never --rm -it --timeout=30s -- nslookup kubernetes.default 2>/dev/null
echo ""

echo "7. istioctl Precheck"
istioctl x precheck 2>/dev/null || echo "istioctl not found, skipping"
echo ""

echo "=== Validation Complete ==="
```

## Common Pre-Installation Pitfalls

**Wrong cluster context**: Always double-check `kubectl config current-context` before installing.

**Insufficient RBAC**: Using a service account without cluster-admin will cause partial installation failures.

**Stale webhooks from previous install**: These cause pod creation failures across the entire cluster. Always clean up before reinstalling.

**Metrics server not installed**: `kubectl top` will not work, and HPA for istiod will not function.

```bash
kubectl get deployment metrics-server -n kube-system
```

If missing, install it:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## Wrapping Up

Spending ten minutes on pre-installation validation saves hours of post-installation debugging. Run `istioctl x precheck` as a baseline, then go through the manual checks for anything specific to your environment. Pay special attention to existing Istio remnants, webhook configurations, and network connectivity. Once everything checks out, you can install with confidence knowing the cluster is ready for the mesh.
