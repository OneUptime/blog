# Validation Summary: How to Upgrade Kubernetes Addons After Control Plane Upgrade

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes control plane addons
- CoreDNS
- kube-proxy
- Kubernetes CNI plugins
- Calico
- Cilium
- Amazon EKS addons
- Google Kubernetes Engine addons
- metrics-server
- Argo CD

## Sources Consulted
- Kubernetes kubeadm upgrade documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/
- Kubernetes CoreDNS documentation: https://kubernetes.io/docs/tasks/administer-cluster/coredns/
- CoreDNS version in Kubernetes reference: https://github.com/coredns/deployment/blob/master/kubernetes/CoreDNS-k8s_version.md
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes DaemonSet rolling update documentation: https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Calico Kubernetes upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Cilium upgrade documentation: https://docs.cilium.io/en/latest/operations/upgrade/
- metrics-server installation documentation: https://github.com/kubernetes-sigs/metrics-server
- Amazon EKS addon update documentation: https://docs.aws.amazon.com/eks/latest/userguide/updating-an-add-on.html
- Google Cloud gcloud container clusters update reference: https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/update
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/

## Issues Found
- The opening claim said addons do not automatically upgrade after a control plane upgrade. This is not universally true: kubeadm can upgrade CoreDNS and kube-proxy during `kubeadm upgrade`, and managed Kubernetes services may manage some addons. Changed the wording to say some addons might not automatically upgrade depending on cluster management.
- The CoreDNS section implied CoreDNS always needs a manual upgrade after the control plane. Changed it to recommend verifying the version and upgrading only if cluster tooling did not already do so.
- The kube-proxy guidance said it should match or be close to the control plane version. Kubernetes version skew policy is more specific: kube-proxy must not be newer than kube-apiserver and can be older within supported skew. Updated the explanation.
- The Calico review command compared a live DaemonSet YAML to a full release manifest with `diff`, which is not a reliable preview of Kubernetes changes. Replaced it with `kubectl diff -f calico-v3.27.0.yaml`.
- The Cilium Helm example used `--reuse-values` while upgrading to a chart version. Cilium documentation warns not to use Helm's `--reuse-values` for minor version upgrades because it can omit newly introduced values. Replaced it with saving current values to `cilium-values.yaml` and passing that file, and added the official Cilium Helm repository setup command.
- The EKS VPC CNI update used `--resolve-conflicts OVERWRITE`, which can reset customized addon settings to EKS defaults. Changed it to `--resolve-conflicts PRESERVE`.
- The best-practices section recommended keeping addon versions within one minor version of the control plane. This is too broad because supported skew varies by Kubernetes component, distribution, and addon. Changed it to recommend staying within supported version skew for the distribution and addon.

## Review Notes
The examples use Kubernetes 1.28 and 1.29-era addon versions, which are useful as examples but should be replaced with versions returned by the current compatibility commands for the specific cluster. Local CLI verification with `kubectl`, `helm`, `aws`, and `gcloud` was not possible because those binaries are not installed in this environment, so command checks were performed against official documentation and direct URL validation where applicable.
