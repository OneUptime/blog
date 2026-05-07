# Validation Summary: How to Use kubectl with Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher CLI
- Kubernetes
- kubectl
- kubeconfig
- Rancher Kubernetes API

## Sources Consulted
- Rancher CLI: https://ranchermanager.docs.rancher.com/v2.12/reference-guides/cli-with-rancher/rancher-cli
- Access a Cluster with Kubectl and kubeconfig: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- kubectl Utility: https://ranchermanager.docs.rancher.com/reference-guides/cli-with-rancher/kubectl-utility
- Kubeconfigs workflow: https://ranchermanager.docs.rancher.com/api/workflows/kubeconfigs
- Using API Tokens: https://ranchermanager.docs.rancher.com/api/api-tokens
- RKE Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke1-cluster-configuration
- Projects workflow: https://ranchermanager.docs.rancher.com/api/workflows/projects
- kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/

## Issues Found
- The Rancher UI workflow for downloading kubeconfig was inaccurate. The post said to use Kubectl Shell or a dashboard button, but Rancher’s current docs instruct users to go to **Cluster Management**, open the cluster row menu, and choose **Download KubeConfig**. I updated the steps to match the documented flow.
- The API-based kubeconfig examples used the legacy `POST /v3/clusters/{id}?action=generateKubeconfig` flow and expected a `.config` field. Rancher’s current documented kubeconfig workflow uses the Rancher Kubernetes API resource `kubeconfigs.ext.cattle.io` at `POST /apis/ext.cattle.io/v1/kubeconfigs`, and the generated kubeconfig is returned in `.status.value`. I updated Method 3, the multi-cluster example, and the troubleshooting example accordingly.
- The post did not mention that downloaded kubeconfigs may require the Rancher CLI when `kubeconfig-generate-token` is disabled. Rancher’s official docs call this out explicitly. I added a note so readers do not assume every downloaded kubeconfig is fully self-contained.
- The ACE section was too broad and used a non-documented context name example. Rancher’s current docs distinguish between RKE and RKE2/K3s behavior, and document ACE context names as `<CLUSTER_NAME>-fqdn` or `<CLUSTER_NAME>-<NODE_NAME>`. I corrected the explanation and example.
- The context rename examples assumed raw cluster IDs as context names. Actual context names vary depending on how the kubeconfig was generated, so I replaced those examples with placeholders that instruct readers to rename the contexts they actually have.
- The `kubectl top` examples did not mention their dependency on Metrics Server. Kubernetes’ official reference states that Metrics Server must be installed and running for `kubectl top` to work. I added that caveat inline.

## Review Notes
The post is technically relevant and salvageable. It now aligns with Rancher’s latest published documentation as of 2026-05-07, but Rancher UI labels and kubeconfig/token behavior can drift across releases, so this post may need another validation pass when Rancher’s documented kubeconfig workflows change again.
