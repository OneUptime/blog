# Validation Summary: How to Install Flux CD on Minikube for Local Development

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- Minikube
- kubectl
- Kustomize
- GitHub bootstrap authentication
- NGINX container deployment

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux GitHub bootstrap documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux CLI reference for `flux bootstrap github`: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux CLI reference for `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI reference for `flux logs`: https://fluxcd.io/flux/cmd/flux_logs/
- Flux CLI reference for `flux uninstall`: https://fluxcd.io/flux/cmd/flux_uninstall/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Minikube start command reference: https://minikube.sigs.k8s.io/docs/commands/start/
- Minikube Kubernetes version configuration: https://minikube.sigs.k8s.io/docs/handbook/config/
- Minikube service command reference: https://minikube.sigs.k8s.io/docs/commands/service/
- Minikube accessing applications guide: https://minikube.sigs.k8s.io/docs/handbook/accessing/
- Minikube addons command reference: https://minikube.sigs.k8s.io/docs/commands/addons/
- Kubernetes version skew policy: https://kubernetes.io/releases/version-skew-policy/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes port-forward task documentation: https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/

## Issues Found
- The post pinned Kubernetes to `v1.30.0`, which is older than the currently supported Kubernetes versions listed by Flux. Updated the Minikube prerequisite to `v1.38 or later` and the Minikube start command to use Kubernetes `v1.34.1`, matching Flux's current minimum for Kubernetes v1.34.
- The prerequisite said kubectl should match the Kubernetes version exactly. Kubernetes supports kubectl within one minor version of kube-apiserver, so this was corrected.
- The GitHub token prerequisite and comment were too vague for Flux bootstrap. Clarified that the token must be able to administer the repository and that classic GitHub tokens need the `repo` scope.
- The sample Service was declared as `ClusterIP` while the access step used `minikube service`, which Minikube documents for NodePort service access. Changed the sample Service to `NodePort` and updated the comment accordingly.

## Review Notes
- The Flux Kustomization, Kubernetes Deployment, Namespace, and Service manifests use current stable API versions.
- The Flux CLI commands and Minikube addon commands checked against official references are current.
- The Flux `logs` command is documented as preview by Flux, but the flags used in the post are valid.
