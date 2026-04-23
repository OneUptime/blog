# Validation Summary: How to Troubleshoot Rancher Server Not Starting

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- kubectl
- Helm
- cert-manager
- Ingress NGINX and Traefik
- TLS certificates
- etcd and Kubernetes control plane health

## Sources Consulted
- Rancher troubleshooting docs: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster/troubleshooting
- Rancher install/upgrade on a Kubernetes cluster: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher high-availability architecture: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-cluster-setup/high-availability-installs
- Rancher RKE2 HA cluster setup: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-cluster-setup/rke2-for-rancher
- Rancher uninstall and cleanup FAQ: https://ranchermanager.docs.rancher.com/v2.12/faq/rancher-is-no-longer-needed
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes API health checks: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Helm `rollback` reference: https://helm.sh/docs/v3/helm/helm_rollback/
- Helm `history` reference: https://helm.sh/docs/helm/helm_history
- cert-manager FAQ: https://cert-manager.io/docs/faq/
- cert-manager troubleshooting/logging example: https://cert-manager.io/v1.15-docs/installation/continuous-deployment-and-gitops/

## Issues Found
- The post described Kubernetes-installed Rancher as using an external database. I corrected this to management-cluster datastore health, because Rancher HA installs store server data in the management cluster datastore, typically etcd, rather than a separate MySQL database.
- The deployment patch example used JSON Patch `replace` operations on nested `resources` paths that may not exist on a default Rancher deployment. I replaced it with a valid deployment patch keyed by container name.
- The cert-manager log command used an older label selector. I updated it to the current `app.kubernetes.io/instance=cert-manager` selector and added `--all-containers` to make the health check match current cert-manager examples.
- The error table mixed pod events with app log strings and included external-database guidance that does not fit Rancher on Kubernetes. I corrected the table to use Rancher/Kubernetes-relevant errors and events.
- The uninstall warning overstated the effect of `helm uninstall`. I corrected it to clarify that the Rancher Helm release is removed, while CRDs and custom namespaces may still need separate cleanup.
- The `kubectl top` example assumed a working metrics pipeline. I made the `metrics-server` dependency explicit.

## Review Notes
- The Traefik namespace can vary by Kubernetes distribution, so operators may need to adjust that example for their cluster layout.
