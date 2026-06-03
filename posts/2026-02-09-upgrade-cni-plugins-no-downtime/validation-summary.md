# Validation Summary: How to Upgrade Kubernetes Networking CNI Plugins Without Downtime

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Container Network Interface (CNI)
- Calico
- Cilium
- Flannel
- Helm
- kubectl
- Kubernetes NetworkPolicy

## Sources Consulted
- Calico upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico Helm installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/helm
- Cilium upgrade guide: https://docs.cilium.io/en/latest/operations/upgrade/
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium CLI status reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI connectivity test reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Flannel upstream README and deployment instructions: https://github.com/flannel-io/flannel
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The description mentioned dual-stack approaches, but the post did not cover dual-stack upgrade techniques. Changed it to refer to health checks and validation instead.
- The pre-upgrade CNI detection script only searched DaemonSets in `kube-system` and assumed the DaemonSet name was also the pod label value. Updated it to search all namespaces and map common CNI DaemonSet names to their actual labels.
- The test scripts used fixed sleeps before checking pod networking. Replaced those waits with `kubectl wait --for=condition=Ready` so the examples do not race pod startup.
- BusyBox `wget` examples used `--timeout`, which is not portable for the BusyBox image. Changed the examples to use `wget -T` and explicit `http://` URLs.
- The Calico manifest upgrade used `kubectl apply -f`, while current Calico upgrade docs recommend server-side apply with force-conflicts for the upgrade manifest. Updated the command.
- The Calico backup command used singular resource aliases and `-A` for Calico resources. Updated it to use plural resource names without namespace-wide selection.
- The Calico manifest rollback applied an old manifest filename that the upgrade script had not downloaded. Added download of the old manifest before the upgrade.
- The Calico Helm example used the `kube-system` namespace for the Tigera Operator chart. Updated it to use `tigera-operator` and to check Calico pods in `calico-system`, matching Calico Helm documentation.
- The Calico Helm upgrade omitted CRD application for the target version. Added the documented server-side CRD apply step before `helm upgrade`.
- The Cilium section used `--reuse-values` for a minor chart upgrade, which Cilium documentation warns against. Updated it to save existing values to a file, pass that file explicitly, and set `upgradeCompatibility`.
- The Cilium section did not mention Cilium's consecutive-minor-version upgrade/rollback constraint or L7/userspace proxy disruption caveat. Added that caveat.
- The Cilium Helm example assumed the repository already existed. Added the official Cilium Helm repository command.
- The Flannel example used `kube-system`, but the upstream `kube-flannel.yml` manifest deploys into the `kube-flannel` namespace. Updated the DaemonSet diff, rollout, and pod checks to use `kube-flannel`.
- The rollback and NetworkPolicy validation examples used `kubectl run -it` in scripts, which can fail in non-interactive automation. Removed TTY allocation while keeping stdin where useful.
- The post-upgrade validation script counted pods in `Running` phase as "ready." Updated it to count the Kubernetes `Ready=True` condition instead.

## Review Notes
- The post is now technically valid as a general guide, but real CNI upgrades remain version-, install-method-, and cluster-provider-specific. Operators should still read the target CNI's release notes and upgrade notes before applying these examples.
