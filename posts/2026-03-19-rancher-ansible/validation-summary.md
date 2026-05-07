# Validation Summary: How to Install Rancher Using Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- K3s
- Kubernetes
- Helm
- cert-manager
- Ansible

## Sources Consulted
- Rancher Helm CLI Quick Start: https://ranchermanager.docs.rancher.com/v2.14/getting-started/quick-start-guides/deploy-rancher-manager/helm-cli
- Install/Upgrade Rancher on a Kubernetes Cluster: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Choosing a Rancher Version: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/choose-a-rancher-version
- Setting up the Bootstrap Password: https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/bootstrap-password
- Upgrading Cert-Manager: https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/upgrade-cert-manager
- Rancher v2.14.0 release notes: https://documentation.suse.com/cloudnative/rancher-manager/v2.14/en/release-notes/v2.14.0.html
- K3s configuration options: https://docs.k3s.io/installation/configuration
- K3s high availability with embedded etcd: https://docs.k3s.io/datastore/ha-embedded
- K3s cluster access: https://docs.k3s.io/cluster-access
- K3s release notes for v1.35.X: https://docs.k3s.io/release-notes/v1.35.X
- Helm installation docs: https://helm.sh/docs/v3/intro/install
- Helm `repo add` reference: https://helm.sh/docs/helm/helm_repo_add
- Kubernetes `kubectl rollout status` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/

## Issues Found
- The post described the workflow as a multi-server Rancher install, but the playbook actually builds a single-node K3s cluster per host. I corrected the description, prerequisites, and the "Running Against Multiple Servers" section to explain that adding more hosts would create separate Rancher instances, not one HA Rancher deployment.
- The K3s install step did not pin a Rancher-supported K3s version and did not use the documented `server --cluster-init` pattern from Rancher's current Helm CLI quick start. I updated the example to use `INSTALL_K3S_VERSION={{ k3s_version }}` with `server --cluster-init --write-kubeconfig-mode 644`.
- The default version variables were outdated or misleading. I changed `rancher_version` from `stable` to the current Rancher release `2.14.0`, pinned `k3s_version` to `v1.35.2+k3s1`, updated `cert_manager_version` to `v1.13.1` based on Rancher's current cert-manager guidance, and raised `helm_version` to `3.18.0` to align with Rancher's current Helm requirement.
- The Helm installation snippet used an undocumented pipe-to-bash one-liner. I replaced it with Helm's documented `get_helm.sh` download-and-execute flow.
- The cert-manager install step did not pin the chart version even though Rancher documents cert-manager compatibility concerns. I added `--version {{ cert_manager_version }}` to the Helm command.
- The cert-manager readiness check waited on a pod label instead of the deployments Rancher and Kubernetes documentation use to confirm rollout status. I changed it to explicit rollout checks for `cert-manager`, `cert-manager-webhook`, and `cert-manager-cainjector`.
- The inventory and defaults used `admin` as the bootstrap password example. Rancher's documentation recommends setting a unique bootstrap password, so I replaced it with a placeholder value.
- The summary claimed the playbook produced "idempotent" deployments. That was overstated for the provided shell-heavy snippets, so I changed the language to "repeatable deployment process."

## Review Notes
- The corrected examples now target Rancher `2.14.0`, which was the current released Rancher version on 2026-05-07. If the post is updated to a different Rancher minor version later, the pinned K3s, Helm, and cert-manager values should be revalidated together.
- Rancher's current documentation still states it was last tested with cert-manager `v1.13.1`, even though newer cert-manager releases exist. The post now reflects that documented compatibility point.
- The tutorial remains a single-node proof-of-concept flow. A production HA Rancher deployment still requires a properly built multi-node supported Kubernetes cluster and usually a load balancer.
- No end-to-end playbook execution was performed in this environment.
