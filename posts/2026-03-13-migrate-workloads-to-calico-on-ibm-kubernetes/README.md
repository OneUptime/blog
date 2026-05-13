# How to Migrate Existing Workloads to Calico on IBM Kubernetes Service

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Migration, IBM Kubernetes Service

Description: Migrate existing IBM Kubernetes Service workloads to leverage Calico's advanced networking features.

---

## Introduction

IBM Kubernetes Service (IKS) ships with Calico pre-installed as the cluster network plug-in, making it one of the few managed Kubernetes services that provides Calico network policy functionality out of the box. This means IKS users have access to Calico policy resources such as NetworkPolicy, GlobalNetworkPolicy, and HostEndpoint policies without installing Calico themselves, although IBM does not support changing the managed Calico plug-in, components, default IPPool resources, or Calico nodes.

For teams migrating workloads onto IKS or upgrading from older IKS clusters with limited Calico configurations, understanding how to leverage the pre-installed Calico is key. In classic clusters, IKS also uses Calico to protect worker node network interfaces through HostEndpoint policies, adding an extra layer of security that must be considered when writing policies. For VPC clusters, review IBM's secure-by-default VPC networking and managed security group behavior in addition to pod network policies.

This guide covers working with Calico on IBM Kubernetes Service, migrating workloads with appropriate network policies, and configuring Calico to enforce zero-trust networking while respecting IKS's existing Calico host protection rules.

## Prerequisites

- IBM Cloud account with IKS cluster provisioned
- `ibmcloud` CLI with `ks` plugin installed
- `kubectl` configured for the IKS cluster
- `calicoctl` installed with a version that matches the Calico version running in the IKS cluster
- IBM Cloud Object Storage or similar for workload backup (optional)

## Step 1: Configure calicoctl for IBM Kubernetes Service

Set up `calicoctl` to connect to the Calico datastore embedded in your IKS cluster.

Download the IKS Kubernetes and Calico configuration, and configure `calicoctl` to use the Kubernetes datastore:

```bash
# Log in to IBM Cloud and set the cluster context

ibmcloud login -a https://cloud.ibm.com
ibmcloud ks cluster config --cluster <cluster-name>
export DATASTORE_TYPE=kubernetes

# Download the Calico configuration for your IKS cluster
ibmcloud ks cluster config --cluster <cluster-name> --admin --network

# Verify that calicoctl can connect to the datastore
calicoctl get nodes

# Check the Calico version running on IKS
calicoctl version
```

## Step 2: Review Existing IKS Calico Policies

IKS pre-configures Calico host protection policies for classic clusters. Review these before adding new policies.

List all existing Calico policies including IKS system policies:

```bash
# List all GlobalNetworkPolicies including IBM-managed ones
calicoctl get globalnetworkpolicies -o wide

# List HostEndpoints configured by IBM for node protection
calicoctl get hostendpoint -o wide

# Review the IBM-managed allow rules to understand baseline traffic
calicoctl get globalnetworkpolicy -o yaml
```

## Step 3: Migrate Workloads to IKS

Deploy application workloads to the IKS cluster using standard Kubernetes manifests.

Apply your application manifests to the IKS cluster:

```bash
# Apply namespace and workload definitions
kubectl apply -f namespace.yaml
kubectl apply -f deployments.yaml
kubectl apply -f services.yaml

# Verify all pods are running with Calico-assigned IPs
kubectl get pods -n production -o wide

# Check that Calico has allocated IPs for the new pods
calicoctl get workloadendpoints -n production -o wide
```

## Step 4: Apply Application-Level Calico Policies

Add Calico network policies for your applications, being careful not to conflict with IKS system policies.

Create namespace isolation and application-level policies:

```yaml
# iks-app-policy.yaml - application network policy for IKS
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-app-ingress
  namespace: production
spec:
  selector: "app == 'backend'"
  order: 500        # Higher order than IKS system policies (which use low order numbers)
  types:
  - Ingress
  - Egress
  ingress:
  - action: Allow
    protocol: TCP
    source:
      selector: "app == 'frontend'"
    destination:
      ports:
      - 8080
  egress:
  - action: Allow
    protocol: TCP
    destination:
      selector: "app == 'database'"
      ports:
      - 5432
```

Apply the policy and verify it is active:

```bash
calicoctl apply -f iks-app-policy.yaml

# Verify the policy was created successfully
calicoctl get networkpolicies -n production
```

## Step 5: Validate Connectivity and IBM HostEndpoint Compatibility

Test that your application policies work correctly alongside IBM's pre-configured host protection policies.

Run end-to-end connectivity tests to confirm policies are working:

```bash
# Test allowed traffic between application components
kubectl exec -it <frontend-pod> -n production -- \
  curl http://backend.production.svc.cluster.local:8080/health

# Verify IKS node-to-node communication is not disrupted
kubectl get nodes -o wide
kubectl get --raw='/readyz?verbose'

# Check for any policy deny events in Calico logs
kubectl logs -n kube-system -l k8s-app=calico-node --tail=50 | grep -i deny
```

## Best Practices

- Always review IBM-managed Calico policies before adding new GlobalNetworkPolicies to avoid conflicts
- Use order numbers above 500 for application policies to let IBM system policies (low order numbers) take precedence
- Use Calico log policies on IKS for detailed visibility into denied traffic between pods and nodes
- Use IBM Cloud Activity Tracker to audit Calico policy changes in your IKS cluster
- Monitor pod connectivity with OneUptime to detect when policy changes impact service availability

## Conclusion

IBM Kubernetes Service's pre-installed Calico gives you enterprise-grade network policy enforcement from day one, without the complexity of managing the CNI lifecycle yourself. By understanding the relationship between IBM's system policies and your application policies, and using appropriate policy ordering, you can build a robust zero-trust network model on IKS. Integrate with OneUptime to maintain continuous monitoring of network connectivity across your workloads.
