# How to Troubleshoot Installation Issues with Calico on MicroK8s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, MicroK8s, CNI

Description: A guide to diagnosing and resolving common Calico installation and configuration issues on MicroK8s clusters.

---

## Introduction

Calico installation issues on MicroK8s can arise from snap package conflicts, networking configuration problems, or hardware-specific limitations. The MicroK8s add-on system abstracts much of the Calico installation process, but issues can still occur especially on machines with custom network configurations or restricted internet access.

Common symptoms include the `microk8s enable calico` command hanging, Calico pods failing to start after enabling the add-on, or nodes remaining in `NotReady` state. The MicroK8s-specific log locations and diagnostic tools differ slightly from standard Kubernetes, requiring knowledge of MicroK8s's architecture.

This guide covers the most common Calico issues on MicroK8s and provides step-by-step diagnostic and remediation procedures.

## Prerequisites

- MicroK8s cluster experiencing Calico installation issues
- sudo access on the MicroK8s host
- kubectl access through microk8s kubectl

## Step 1: Check MicroK8s Status

```bash
microk8s status
microk8s inspect
```

The `microk8s inspect` command generates a detailed diagnostic report in `/var/snap/microk8s/`.

## Step 2: Check Calico Pod Logs

```bash
microk8s kubectl get pods -n kube-system | grep calico
microk8s kubectl describe pods -n kube-system -l k8s-app=calico-node
microk8s kubectl logs -n kube-system -l k8s-app=calico-node -c calico-node --tail=50
```

## Step 3: Check MicroK8s Journal Logs

```bash
sudo journalctl -u snap.microk8s.daemon-kubelite --since "1 hour ago" | grep -i calico
sudo journalctl -u snap.microk8s.daemon-containerd --since "1 hour ago" | tail -50
```

## Step 4: Fix IP Pool Conflicts

If MicroK8s's default Calico CIDR `10.1.0.0/16` conflicts with existing network ranges:

```bash
calicoctl delete ippool default-ipv4-ippool
calicoctl apply -f - <<EOF
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 172.16.0.0/16
  ipipMode: Always
  natOutgoing: true
EOF
```

## Step 5: Resolve DNS Issues

If CoreDNS is failing after Calico installation:

```bash
microk8s kubectl rollout restart deployment coredns -n kube-system
microk8s kubectl logs -n kube-system -l k8s-app=kube-dns --tail=20
```

## Step 6: Re-enable Calico Add-On

If the add-on is in a broken state:

```bash
microk8s disable calico
microk8s enable calico
```

## Step 7: Check System Requirements

Ensure the host kernel supports required modules:

```bash
lsmod | grep ipip
lsmod | grep vxlan
sudo modprobe ipip
sudo modprobe vxlan
```

## Step 8: Full MicroK8s Reset (Last Resort)

```bash
sudo snap remove microk8s
sudo snap install microk8s --classic --channel=1.28/stable
microk8s enable calico
```

## Conclusion

Troubleshooting Calico on MicroK8s involves using MicroK8s-specific diagnostic tools alongside standard Kubernetes commands. By systematically checking logs, addressing IP conflicts, and verifying kernel module availability, you can resolve the majority of Calico issues on MicroK8s.
