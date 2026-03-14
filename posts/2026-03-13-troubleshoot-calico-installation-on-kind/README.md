# How to Troubleshoot Installation Issues with Calico on Kind

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, Kind, CNI

Description: A practical troubleshooting guide for resolving common Calico installation problems on Kind clusters.

---

## Introduction

Installing Calico on Kind can encounter several common issues related to Docker networking, IPIP encapsulation, and Kubernetes configuration. When pods remain in `Pending` state, nodes stay `NotReady`, or inter-pod traffic fails, a systematic troubleshooting approach is essential to identify and fix the root cause quickly.

Kind runs Kubernetes nodes as Docker containers, which creates a unique networking environment. IPIP packets, for example, may be blocked by Docker's default network configuration. Additionally, misconfigured Kind cluster settings - such as not disabling the default CNI - can cause conflicts with Calico.

This guide covers the most frequently encountered Calico installation problems on Kind and provides step-by-step commands to diagnose and resolve each issue.

## Prerequisites

- Kind cluster where Calico installation has issues
- kubectl and calicoctl installed
- Docker CLI access

## Step 1: Check Calico Pod Status and Logs

Start by examining Calico pod status:

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide
kubectl describe pod -n kube-system -l k8s-app=calico-node
```

View logs from the calico-node container:

```bash
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=50
```

Look for errors related to BIRD, Felix, or CNI plugin initialization.

## Step 2: Verify Kind Cluster Was Created With CNI Disabled

If the default CNI was not disabled, kindnet conflicts with Calico:

```bash
kubectl get pods -n kube-system | grep kindnet
```

If kindnet pods are present, the cluster must be recreated with `disableDefaultCNI: true`.

## Step 3: Fix IPIP Encapsulation Issues

Kind may block IPIP traffic by default. Check if the `ipip` kernel module is loaded inside Kind nodes:

```bash
docker exec -it calico-cluster-control-plane modprobe ipip
```

Alternatively, switch Calico to VXLAN mode which works better with Docker:

```bash
kubectl set env daemonset/calico-node -n kube-system CALICO_IPV4POOL_IPIP=Never
kubectl set env daemonset/calico-node -n kube-system CALICO_IPV4POOL_VXLAN=Always
```

## Step 4: Resolve Pod CIDR Mismatch

Ensure the Calico IP pool CIDR matches the Kind cluster's `podSubnet`:

```bash
calicoctl get ippool -o yaml | grep cidr
kubectl get nodes -o jsonpath='{.items[*].spec.podCIDR}'
```

If they do not match, delete and recreate the IP pool with the correct CIDR.

## Step 5: Check Felix and BIRD Health

```bash
kubectl exec -n kube-system -it $(kubectl get pod -n kube-system -l k8s-app=calico-node -o name | head -1) -- calico-node -felix-live
kubectl exec -n kube-system -it $(kubectl get pod -n kube-system -l k8s-app=calico-node -o name | head -1) -- calico-node -bird-live
```

## Step 6: Verify iptables Rules

On the Kind node, check that Calico's iptables chains are present:

```bash
docker exec -it calico-cluster-control-plane iptables -L cali-INPUT --line-numbers
```

## Conclusion

Troubleshooting Calico on Kind requires checking pod logs, verifying cluster creation settings, addressing IPIP encapsulation limitations, and confirming CIDR alignment. Working through these steps systematically resolves the majority of Calico installation issues encountered in Kind environments.
