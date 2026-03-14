# How to Configure Calico on Minikube for a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Configuration, Minikube

Description: Learn how to configure Calico networking settings on a new Minikube cluster including IP pools, Felix parameters, and encapsulation options.

---

## Introduction

After installing Calico on Minikube, the default configuration is functional for basic pod networking but may not match your specific requirements. Configuring Calico properly on Minikube allows you to test behavior that mirrors your production environment — including specific CIDR ranges, encapsulation modes, and security settings.

Minikube is a single-node cluster, which means some Calico features like BGP peering between nodes are not applicable. However, IP pool configuration, Felix tuning, and network policy settings are all relevant and configurable. Using calicoctl alongside kubectl gives you full access to Calico's configuration API.

This guide covers key Calico configuration tasks for a new Minikube cluster, including adjusting the IP pool, tuning Felix, and setting up log levels for development.

## Prerequisites

- Minikube cluster with Calico installed
- calicoctl v3.27.0 installed
- kubectl configured for the Minikube cluster

## Step 1: Install calicoctl

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 -o calicoctl
chmod +x calicoctl
sudo mv calicoctl /usr/local/bin/
export DATASTORE_TYPE=kubernetes
export KUBECONFIG=~/.kube/config
```

## Step 2: View Default IP Pool

```bash
calicoctl get ippool default-ipv4-ippool -o yaml
```

The default pool uses `192.168.0.0/16` with IPIP enabled.

## Step 3: Change the IP Pool CIDR (Optional)

If you need a different CIDR to match production:

```bash
calicoctl delete ippool default-ipv4-ippool
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: custom-ipv4-ippool
spec:
  cidr: 10.244.0.0/16
  ipipMode: Always
  natOutgoing: true
EOF
```

## Step 4: Configure Felix Settings for Development

```bash
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: FelixConfiguration
metadata:
  name: default
spec:
  logSeverityScreen: Debug
  healthEnabled: true
  iptablesRefreshInterval: 30s
EOF
```

## Step 5: Disable IPv6 (if not needed)

On Minikube, IPv6 is typically not configured. Explicitly disable it:

```bash
kubectl set env daemonset/calico-node -n kube-system IP6=none
kubectl set env daemonset/calico-node -n kube-system CALICO_IPV6POOL_CIDR=""
```

## Step 6: Set IPIP Encapsulation Mode

For Minikube's single-node environment, IPIP may be unnecessary. Switch to no encapsulation:

```bash
calicoctl patch ippool default-ipv4-ippool -p '{"spec":{"ipipMode":"Never","vxlanMode":"Never"}}'
```

## Step 7: Verify All Changes

```bash
calicoctl get ippool -o yaml
calicoctl get felixconfiguration default -o yaml
kubectl rollout restart daemonset calico-node -n kube-system
kubectl rollout status daemonset calico-node -n kube-system
```

## Conclusion

You have configured Calico on Minikube by adjusting the IP pool CIDR, tuning Felix for development, disabling unnecessary IPv6 support, and setting an appropriate encapsulation mode for a single-node environment. These configurations bring your local Minikube setup closer to your target production behavior.
