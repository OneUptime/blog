# Validation Summary: How to Upgrade Calico on Single-Node Kubernetes Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- kubectl
- calicoctl
- Kubernetes NetworkPolicy
- Kubernetes DaemonSet and Deployment rollouts

## Sources Consulted
- Calico documentation: Upgrade Calico on Kubernetes - https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico documentation: Install calicoctl - https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: calicoctl user reference - https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Kubernetes documentation: kubectl scale - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Kubernetes documentation: kubectl rollout - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes documentation: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl logs - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Project Calico GitHub release assets and manifests for v3.27.0 - https://github.com/projectcalico/calico/releases/tag/v3.27.0 and https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

## Issues Found
- The optional workload scale-down command used `kubectl scale deployment --all --replicas=0 --all-namespaces`. The `kubectl scale` reference supports `--all` only within the selected namespace and does not document `--all-namespaces` for this command. I changed the example to save deployment namespace/name/replica counts and scale each deployment with `kubectl -n "$namespace" scale ...`.
- The restore command used `kubectl scale deployment --all --replicas=1 --all-namespaces`, which had the same unsupported namespace issue and would also restore every deployment to one replica instead of its original size. I changed it to restore the replica counts saved before scaling down.
- The Calico manifest upgrade command used plain `kubectl apply -f`. Current Calico documentation for manifest-based Kubernetes API datastore upgrades uses server-side apply with `--server-side --force-conflicts`, so I updated the command accordingly.

## Review Notes
- The post targets Calico v3.27.0. That manifest and the matching `calicoctl-linux-amd64` release asset are still available, but Calico latest documentation is now v3.32 and recommends installing a `calicoctl` version that matches the cluster version after upgrade.
- The backup section covers common Calico and Kubernetes policy resources, but clusters that use additional Calico resource types should back those up as well before upgrading.
