# Validation Summary: How to Implement OpenShift GitOps

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Red Hat OpenShift GitOps
- Argo CD
- OpenShift CLI (`oc`)
- Kubernetes manifests
- Kustomize
- Helm
- GitOps workflows

## Sources Consulted
- Red Hat OpenShift GitOps 1.11 documentation, "Installing Red Hat OpenShift GitOps": https://docs.redhat.com/en/documentation/red_hat_openshift_gitops/1.11/html/installing_gitops/installing-openshift-gitops
- Red Hat OpenShift GitOps 1.14 documentation, "Setting up an Argo CD instance": https://docs.redhat.com/en/documentation/red_hat_openshift_gitops/1.14/html/argo_cd_instance/setting-up-argocd-instance
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/

## Issues Found
- The installation step said to accept the default namespace `openshift-gitops`. Current Red Hat OpenShift GitOps documentation lists the default Operator installation namespace as `openshift-gitops-operator`, while the ready-to-use Argo CD instance is created in `openshift-gitops`. Updated the step and follow-up sentence to distinguish those namespaces.

## Review Notes
The Argo CD Application manifest uses the current `argoproj.io/v1alpha1` Application API and valid `syncPolicy.automated.prune` and `syncPolicy.automated.selfHeal` fields. The `CreateNamespace=true` sync option is valid when placed under `spec.syncPolicy.syncOptions`. The `oc get route` and `oc get secret ... -o jsonpath=... | base64 -d` commands are consistent with the documented route and secret names for the default Argo CD instance.
