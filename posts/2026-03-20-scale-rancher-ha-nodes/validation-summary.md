# Validation Summary: How to Scale Rancher HA Nodes - Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Manager
- RKE2
- Kubernetes
- etcd
- Helm
- HAProxy
- PodDisruptionBudget

## Sources Consulted
- RKE2 High Availability documentation: https://docs.rke2.io/install/ha
- RKE2 Embedded Datastore documentation: https://docs.rke2.io/datastore/embedded
- RKE2 CLI Tools documentation: https://docs.rke2.io/reference/cli_tools
- Rancher RKE2 HA cluster setup documentation: https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/kubernetes-cluster-setup/rke2-for-rancher
- Rancher HA RKE2 infrastructure documentation: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/infrastructure-setup/ha-rke2-kubernetes-cluster
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Helm chart templates and values: https://github.com/rancher/rancher/tree/release/v2.12/chart
- etcd cluster status documentation: https://etcd.io/docs/v3.5/tutorials/how-to-check-cluster-status/
- etcd FAQ / cluster sizing guidance: https://etcd.io/docs/v3.7/faq/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Helm upgrade documentation: https://helm.sh/docs/v3/helm/helm_upgrade/

## Issues Found
- The description said "5 or more" server nodes. Changed it to "5 or 7" to match the odd etcd server counts discussed in the post and the usual etcd sizing guidance.
- The introduction described scaling as general capacity growth. Clarified that the capacity increase is for Rancher Server, because adding etcd members increases fault tolerance and read capacity but does not reduce replicated etcd memory usage and can reduce write performance.
- The "When to Scale" section used high etcd CPU or memory as a scaling trigger. Changed it to Rancher Server CPU or memory because each etcd member stores the data set, and adding members is not a general fix for etcd resource pressure.
- The RKE2 config snippet wrote `/etc/rancher/rke2/config.yaml` without creating the directory. Added `mkdir -p /etc/rancher/rke2`, matching Rancher/RKE2 setup instructions.
- The RKE2 join snippet used a single existing server node as the registration endpoint. Changed it to the fixed registration address/load balancer VIP, which is the HA pattern documented for RKE2.
- The RKE2 join snippet applied `CriticalAddonsOnly=true:NoExecute` to the new server nodes. Removed it because the post later expects Rancher Server pods to schedule on those nodes, and Rancher's default chart tolerations do not include that taint.
- The verification commands assumed `kubectl` was already configured. Added the RKE2 kubeconfig and binary path exports.
- The etcd health command checked only the local endpoint while the comment said all 5 endpoints should be healthy. Added `--cluster` so `etcdctl endpoint health` checks all member endpoints.
- The load balancer update text only mentioned the Rancher HTTPS backend. Added a note to update RKE2 9345 and 6443 backends too when the same load balancer is used as the fixed registration/API endpoint.

## Review Notes
- The PodDisruptionBudget example uses the current `policy/v1` API and a valid `minAvailable` selector pattern.
- The Helm command uses valid `helm upgrade`, `--namespace`, `--reuse-values`, and `--set replicas=5` syntax. In production, operators should confirm the installed chart/repository name and preserve any non-default values used during the original Rancher install.
- The `etcdctl` verification block assumes `etcdctl` is installed on the server node. RKE2 documents bundled `kubectl`, `ctr`, and `crictl`; it does not document `etcdctl` as a bundled CLI tool.
