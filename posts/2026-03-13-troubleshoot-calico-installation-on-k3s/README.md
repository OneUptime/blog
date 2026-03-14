# How to Troubleshoot Installation Issues with Calico on K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, K3s, CNI

Description: Diagnose and fix common Calico installation issues on K3s clusters including CNI conflicts and CIDR mismatches.

---

## Introduction

Calico installation issues on K3s commonly stem from K3s-specific behaviors such as the embedded CNI system, Flannel remnants if K3s was not started with `--flannel-backend=none`, or CIDR mismatches between K3s's `--cluster-cidr` and Calico's IP pool configuration. Identifying the root cause requires checking both K3s-specific logs and standard Calico diagnostic output.

K3s writes logs through the system journal rather than to files, which means you need to use `journalctl` to access K3s logs. The K3s agent logs are particularly relevant for CNI issues because the CNI plugin is initialized by the agent, not the server process.

This guide provides a structured troubleshooting process for Calico on K3s, organized by symptom with specific remediation steps.

## Prerequisites

- K3s cluster experiencing Calico issues
- root or sudo access on K3s nodes
- kubectl configured

## Step 1: Check K3s Node Status

```bash
kubectl get nodes
kubectl describe node <node-name> | grep -A10 Conditions
```

## Step 2: View K3s Agent Logs

```bash
sudo journalctl -u k3s-agent -n 100 --no-pager | grep -i cni
sudo journalctl -u k3s -n 100 --no-pager | grep -i calico
```

## Step 3: Check Calico Pod Status

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide
kubectl describe pod -n kube-system -l k8s-app=calico-node
kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=50
```

## Step 4: Verify K3s Was Started Without Flannel

Check the K3s installation arguments:

```bash
cat /etc/systemd/system/k3s.service | grep flannel
ps aux | grep k3s | grep flannel
```

If Flannel arguments are missing `--flannel-backend=none`, reinstall K3s:

```bash
/usr/local/bin/k3s-uninstall.sh
curl -sfL https://get.k3s.io | sh -s - \
  --flannel-backend=none \
  --disable-network-policy \
  --cluster-cidr=192.168.0.0/16
```

## Step 5: Fix CIDR Mismatch

Ensure Calico's IP pool matches K3s's cluster CIDR:

```bash
kubectl get node -o jsonpath='{.items[0].spec.podCIDR}'
calicoctl get ippool -o yaml | grep cidr
```

If they do not match, update the IP pool:

```bash
calicoctl delete ippool default-ipv4-ippool
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  ipipMode: Always
  natOutgoing: true
EOF
```

## Step 6: Check CNI Directory

```bash
ls /var/lib/rancher/k3s/agent/etc/cni/net.d/
```

Should contain a Calico CNI config file. If empty or missing:

```bash
kubectl rollout restart daemonset calico-node -n kube-system
```

## Step 7: Verify containerd Is Using CNI

```bash
sudo k3s crictl pods | head -5
sudo k3s crictl ps | head -5
```

## Conclusion

Troubleshooting Calico on K3s involves verifying the K3s installation flags, checking K3s agent logs, resolving CIDR mismatches, and confirming the CNI configuration is written to the correct K3s directory. These steps resolve the majority of Calico issues encountered on K3s clusters.
