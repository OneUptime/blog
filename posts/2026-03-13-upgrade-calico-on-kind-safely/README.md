# How to Upgrade Calico on Kind Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Upgrade, Kind, CNI

Description: A safe step-by-step process for upgrading Calico to a newer version on a Kind cluster while minimizing disruption.

---

## Introduction

Upgrading Calico on Kind requires care to avoid disrupting pod networking during the transition. While Kind is primarily a development tool, upgrade testing is a valid use case - especially when you want to validate that a Calico version upgrade does not break your network policies or connectivity before applying it to production clusters.

Calico upgrades typically involve updating the calico-node DaemonSet, calico-kube-controllers Deployment, and associated CRDs. The Calico project follows semantic versioning and publishes upgrade guides for each release. Minor version upgrades are usually straightforward, while major version upgrades may require additional steps.

This guide covers upgrading Calico from v3.26.x to v3.27.0 on Kind using the manifest-based approach. The same process applies to other version pairs with appropriate manifest URL adjustments.

## Prerequisites

- Kind cluster running Calico v3.26.x
- kubectl and calicoctl installed
- Backup of existing Calico configuration

## Step 1: Record Current Calico Version

```bash
kubectl get deployment calico-kube-controllers -n kube-system -o jsonpath='{.spec.template.spec.containers[0].image}'
```

Note the current version tag.

## Step 2: Back Up Current Calico Configuration

```bash
calicoctl get ippool -o yaml > calico-ippools-backup.yaml
calicoctl get felixconfiguration -o yaml > calico-felix-backup.yaml
calicoctl get bgpconfiguration -o yaml > calico-bgp-backup.yaml
```

## Step 3: Review the Calico v3.27.0 Release Notes

Before upgrading, read the release notes at https://docs.tigera.io/calico/3.27/release-notes/ to identify any breaking changes or required migration steps.

## Step 4: Apply the New Calico Manifest

Apply the v3.27.0 manifest to update all Calico components:

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

Kubernetes will perform a rolling update of the calico-node DaemonSet and update the calico-kube-controllers Deployment.

## Step 5: Monitor the Upgrade Progress

```bash
kubectl rollout status daemonset calico-node -n kube-system
kubectl rollout status deployment calico-kube-controllers -n kube-system
```

Watch pod status in real time:

```bash
kubectl get pods -n kube-system -l k8s-app=calico-node -w
```

## Step 6: Verify Post-Upgrade Health

```bash
calicoctl node status
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running
```

Run a connectivity test to confirm that pod networking still works after the upgrade:

```bash
kubectl run test-pod --image=busybox --restart=Never -- ping -c 4 8.8.8.8
kubectl logs test-pod
```

## Step 7: Verify calicoctl Version

Update calicoctl to match the new Calico version:

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 -o calicoctl
chmod +x calicoctl && sudo mv calicoctl /usr/local/bin/
calicoctl version
```

## Conclusion

You have safely upgraded Calico on Kind by backing up configuration, applying the new manifest, and verifying health post-upgrade. Practicing upgrades on Kind first reduces the risk of unexpected issues when upgrading production clusters.
