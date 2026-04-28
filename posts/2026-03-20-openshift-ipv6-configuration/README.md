# How to Configure OpenShift with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenShift, IPv6, Dual-Stack, OVNKubernetes, Kubernetes, Red Hat

Description: A guide to deploying OpenShift with IPv6 and dual-stack networking using OVN-Kubernetes, covering installation configuration, network operator settings, and workload verification.

OpenShift 4.8+ supports dual-stack (IPv4 + IPv6) networking using OVN-Kubernetes as the network plugin (initially on bare metal IPI; broader platform support was added in later releases). Single-stack IPv6 requires OpenShift 4.12+. This guide covers setting up dual-stack OpenShift clusters.

## Installation Configuration for Dual-Stack

IPv6 configuration in OpenShift is set at install time via `install-config.yaml`:

```yaml
# install-config.yaml

apiVersion: v1
metadata:
  name: my-cluster
baseDomain: example.com

networking:
  networkType: OVNKubernetes   # Required for dual-stack
  clusterNetwork:
    - cidr: 10.128.0.0/14
      hostPrefix: 23
    - cidr: fd01::/48          # IPv6 pod network
      hostPrefix: 64
  serviceNetwork:
    - 172.30.0.0/16
    - fd02::/112               # IPv6 service network
  machineNetwork:
    - cidr: 192.168.0.0/16
    - cidr: fd00::/48          # IPv6 machine network

platform:
  none: {}                     # Or baremetal, vsphere, etc.

pullSecret: '...'
sshKey: '...'
```

```bash
# Create installation directory and run installer

mkdir -p ~/ocp-install
cp install-config.yaml ~/ocp-install/
openshift-install create cluster --dir=~/ocp-install --log-level=info
```

## Verifying Dual-Stack After Installation

```bash
# Check network operator config
oc get network.config cluster -o yaml

# Expected output includes:
# clusterNetworks:
# - cidr: 10.128.0.0/14
#   hostPrefix: 23
# - cidr: fd01::/48
#   hostPrefix: 64

# Verify nodes have dual-stack pod CIDRs
oc get nodes -o custom-columns=NAME:.metadata.name,PODCIDR:.spec.podCIDR,PODCIDRS:.spec.podCIDRs

# Check a node's IPv6 address
oc get node <node-name> -o jsonpath='{.status.addresses}' | python3 -m json.tool
```

## OVN-Kubernetes Dual-Stack Configuration

OVN-Kubernetes is configured by the network operator. To modify after installation:

```yaml
# Check current OVN-K config
oc get network.operator cluster -o yaml

# The network operator manages OVN-Kubernetes pods
oc get pods -n openshift-ovn-kubernetes

# Check OVN-K logs for IPv6 issues
oc logs -n openshift-ovn-kubernetes \
  $(oc get pod -n openshift-ovn-kubernetes -l app=ovnkube-master -o name | head -1) \
  -c ovnkube-master | grep -i ipv6 | tail -20
```

## Services with Dual-Stack in OpenShift

```yaml
# Service with dual-stack ClusterIPs
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  ipFamilyPolicy: RequireDualStack   # or PreferDualStack
  ipFamilies:
    - IPv4
    - IPv6
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 8080
```

```bash
# Apply and verify dual-stack service
oc apply -f service.yaml
oc get svc my-service -o wide
# Should show two ClusterIPs: one IPv4 and one IPv6

oc get svc my-service -o jsonpath='{.spec.clusterIPs}'
```

## Routes and Ingress with IPv6

OpenShift Routes are served by the HAProxy-based Ingress Controller:

```bash
# Check if ingress controller is listening on IPv6
oc get ingresscontroller default -n openshift-ingress-operator -o yaml | grep -A 10 endpointPublishingStrategy

# Get the router pods and check their listeners
oc exec -n openshift-ingress \
  $(oc get pod -n openshift-ingress -l ingresscontroller.operator.openshift.io/deployment-ingresscontroller=default -o name | head -1) \
  -- ss -6 -tlnp | grep 80
```

## Deploying IPv6-Aware Applications

```yaml
# Deployment that binds to all interfaces (IPv4 and IPv6)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
        - name: nginx
          image: nginx:alpine
          ports:
            - containerPort: 80
          # nginx default config listens on :: which covers IPv4 and IPv6
```

```bash
oc apply -f deployment.yaml

# Check pods have dual-stack addresses
oc get pod -l app=web-app -o wide
POD=$(oc get pod -l app=web-app -o name | head -1)
oc exec $POD -- ip -6 addr show
oc exec $POD -- ip -6 route show
```

## Single-Stack IPv6 (OpenShift 4.12+)

```yaml
# install-config.yaml for IPv6-only cluster
networking:
  networkType: OVNKubernetes
  clusterNetwork:
    - cidr: fd01::/48
      hostPrefix: 64
  serviceNetwork:
    - fd02::/112
  machineNetwork:
    - cidr: fd00::/48
```

## Troubleshooting OpenShift IPv6

```bash
# Check OVN-Kubernetes is healthy
oc get pods -n openshift-ovn-kubernetes -o wide

# Check for IPv6 configuration in OVN northbound database
oc exec -n openshift-ovn-kubernetes \
  $(oc get pod -n openshift-ovn-kubernetes -l app=ovnkube-master -o name | head -1) \
  -c northd -- ovn-nbctl show | grep -A 3 "ipv6\|::"

# Check machine config for host-level IPv6 settings
oc get machineconfig | grep network

# Verify sysctl on a node
oc debug node/<node-name> -- chroot /host sysctl net.ipv6.conf.all.forwarding
```

OpenShift's dual-stack support requires OVN-Kubernetes and must be configured at install time. Once deployed, pods, services, and routes all work with both IPv4 and IPv6, with the `ipFamilyPolicy` field on Services controlling dual-stack behavior per workload.
