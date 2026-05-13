# How to Configure Calico on OpenShift for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenShift, Kubernetes, Networking, CNI, Configuration

Description: A guide to configuring Calico's networking, security context constraints, and network policies on a freshly installed OpenShift cluster.

---

## Introduction

After installing Calico on OpenShift, the default configuration needs to be tuned to match OpenShift's network model and your specific workload requirements. OpenShift's pod CIDRs, machine network, and service CIDRs are predetermined during cluster installation, and Calico must be configured to match them. Additionally, OpenShift has its own RBAC and Security Context Constraint model that interacts with Calico's privilege requirements.

OpenShift also runs many privileged system workloads that require host network access. Calico's host endpoint policies must be carefully configured to avoid blocking these system components. The configuration steps in this guide are specific to OpenShift and supplement the standard Calico configuration workflow.

## Prerequisites

- Calico installed on an OpenShift cluster with the Tigera Operator
- `oc` CLI with cluster admin access
- `calicoctl` installed

## Step 1: Verify and Align IP Pools with OpenShift CIDRs

Check OpenShift's configured pod CIDR:

```bash
oc get network.config cluster -o jsonpath='{.spec.clusterNetwork}'
```

Verify the Calico IP pool is within the OpenShift cluster network:

```bash
calicoctl get ippool -o yaml
```

If the CIDR does not match on a new cluster, update the Tigera Operator `Installation` resource before workloads are scheduled:

```bash
oc patch installation.operator.tigera.io default --type=merge \
  -p '{"spec":{"calicoNetwork":{"ipPools":[{"cidr":"10.128.0.0/14","encapsulation":"VXLAN","natOutgoing":"Enabled","nodeSelector":"all()"}]}}}'
```

For a cluster that is already running workloads, create a replacement IP pool and migrate workloads to it rather than patching the `cidr` field of the existing IP pool.

## Step 2: Configure Felix for OpenShift

Calico's standard Linux data plane uses iptables. Configure Felix accordingly unless you have explicitly enabled and tested Calico's eBPF data plane.

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{
    "logSeverityScreen": "Warning",
    "prometheusMetricsEnabled": true,
    "bpfEnabled": false
  }}'
```

Note: eBPF may have compatibility limitations with OpenShift's kernel configurations. Test before enabling.

## Step 3: Configure Network Policies for OpenShift System Namespaces

OpenShift requires that system pods in `openshift-*` namespaces can communicate freely. Apply permissive policies for system namespaces.

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-openshift-system-namespaces
spec:
  namespaceSelector: projectcalico.org/name starts with 'openshift-'
  ingress:
    - action: Allow
  egress:
    - action: Allow
  order: 10
```

```bash
calicoctl apply -f allow-openshift-system.yaml
```

## Step 4: Configure Calico for OpenShift Routes

OpenShift commonly uses Routes, implemented by the cluster Ingress Controller, for external HTTP and HTTPS access. Ensure Calico does not block router traffic.

```bash
# Verify the OpenShift router pods are using host networking

oc get pods -n openshift-ingress -o wide
```

## Step 5: Enable Calico Metrics

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"prometheusMetricsEnabled":true,"prometheusMetricsPort":9091}}'

oc apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: felix-metrics-svc
  namespace: calico-system
spec:
  clusterIP: None
  selector:
    k8s-app: calico-node
  ports:
    - port: 9091
      targetPort: 9091
EOF
```

## Step 6: Validate Configuration

```bash
oc get tigerastatus
calicoctl get felixconfiguration default -o yaml
calicoctl get ippool -o wide
```

## Conclusion

Configuring Calico on OpenShift requires aligning IP pools with OpenShift's pod CIDRs, configuring Felix for compatibility with OpenShift's kernel environment, creating permissive GlobalNetworkPolicies for OpenShift system namespaces, and ensuring OpenShift's router and system components retain the network access they need. These OpenShift-specific configuration steps prevent common networking failures in this environment.
