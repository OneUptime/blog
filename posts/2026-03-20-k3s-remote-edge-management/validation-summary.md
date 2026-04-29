# Validation Summary: How to Manage K3s Edge Clusters Remotely - Part 3

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- K3s
- Kubernetes
- Rancher Fleet
- Rancher Manager
- GitOps
- Helm
- cert-manager
- WireGuard
- Bash
- kubectl

## Sources Consulted
- Fleet Installation Details: https://fleet.rancher.io/how-tos-for-operators/installation
- Fleet Register Downstream Clusters: https://fleet.rancher.io/0.14/how-tos-for-operators/cluster-registration
- Fleet Namespaces: https://fleet.rancher.io/0.14/namespaces
- Fleet Custom Resources Spec: https://fleet.rancher.io/reference/ref-crds
- Fleet deployment tutorial: https://fleet.rancher.io/tutorials/tut-deployment
- Rancher install on Kubernetes: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher registering existing clusters: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Rancher API keys: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher previous v3 API guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher certificate update guide for `clusterregistrationtokens` usage: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/resources/update-rancher-certificate
- K3s cluster access: https://docs.k3s.io/cluster-access
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/
- WireGuard quick start: https://www.wireguard.com/quickstart/
- Kubernetes `kubectl create secret generic`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes kubectl commands reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- Fleet standalone multi-cluster installation was incomplete. The original post installed Fleet using the single-cluster defaults, but then used manager-initiated remote cluster registration. I updated the Fleet install snippet to include the documented `apiServerURL` and `apiServerCA` settings required for standalone multi-cluster Fleet.
- Fleet registration mixed standalone Fleet with Rancher-created workspace defaults. The original examples used `fleet-default`, referred to token generation, and attempted to discover a Fleet controller service URL that is not the documented setup for this workflow. I changed the text to the documented manager-initiated flow, added the required `clusters` namespace, removed the incorrect API-server snippet, and kept the `Cluster` plus kubeconfig `Secret` example aligned with Fleet documentation.
- The Rancher install example omitted the Jetstack Helm repository and used the older `installCRDs=true` flag for cert-manager. I added the documented `helm repo add jetstack https://charts.jetstack.io` step and updated the install flag to `--set crds.enabled=true`.
- The Rancher cluster registration example hardcoded a manifest URL instead of using the exact command Rancher generates for each cluster. I replaced that with the documented workflow: verify the kubeconfig points to the downstream cluster and then run the command shown by Rancher.
- The automated Rancher registration script attempted to create a cluster via `POST /v3/clusters` with an incomplete payload and used an auth pattern that did not match the v3 API guide. I replaced it with a script that takes an existing Rancher cluster ID, fetches the registration command from `clusterregistrationtokens`, uses HTTP basic auth with the API key, and supports `insecureCommand` for private CA deployments.

## Review Notes
- Fleet standalone manager-initiated registration requires the HQ Fleet manager to be able to reach the downstream Kubernetes API during registration.
- Rancher documentation now uses the term "register existing clusters", although the UI still shows the action as `Import Existing`.
- cert-manager now recommends OCI-based installs for the latest chart releases, but the Jetstack repository flow is still documented and is still used in Rancher's installation guidance.
