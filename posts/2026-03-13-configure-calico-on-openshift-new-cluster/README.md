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

Update the Calico IP pool to match:

```bash
calicoctl get ippool -o yaml
```

If the CIDR does not match, patch it:

```bash
calicoctl patch ippool default-ipv4-ippool \
  --patch '{"spec":{"cidr":"10.128.0.0/14"}}'
```

## Step 2: Configure Felix for OpenShift

OpenShift uses iptables by default. Configure Felix accordingly.

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

OpenShift uses Routes (not Ingress) for external access. Ensure Calico does not block router traffic.

```bash
# Verify the OpenShift router pods are using host networking
oc get pods -n openshift-ingress -o wide
```

## Step 5: Enable Calico Metrics

```bash
calicoctl patch felixconfiguration default \
  --patch '{"spec":{"prometheusMetricsEnabled":true,"prometheusMetricsPort":9091}}'

oc create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico-prometheus.yaml
```

## Step 6: Validate Configuration

```bash
oc get tigerastatus
calicoctl get felixconfiguration default -o yaml
calicoctl get ippool -o wide
```

## Conclusion

Configuring Calico on OpenShift requires aligning IP pools with OpenShift's pod CIDRs, configuring Felix for compatibility with OpenShift's kernel environment, creating permissive GlobalNetworkPolicies for OpenShift system namespaces, and ensuring OpenShift's router and system components retain the network access they need. These OpenShift-specific configuration steps prevent common networking failures in this environment.
