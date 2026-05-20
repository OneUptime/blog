# Validation Summary: How to Use ArgoCD with OpenShift

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Red Hat OpenShift GitOps Operator
- OpenShift Container Platform
- Kubernetes RBAC
- OpenShift Security Context Constraints
- OpenShift Routes
- Dex and OpenShift OAuth
- Argo CD AppProject and Application custom resources

## Sources Consulted
- Red Hat OpenShift GitOps 1.20 installation documentation: https://docs.redhat.com/en/documentation/red_hat_openshift_gitops/1.20/html/installing_gitops/installing-openshift-gitops
- Red Hat OpenShift GitOps Argo CD instance documentation: https://docs.redhat.com/en/documentation/red_hat_openshift_gitops/1.19/html-single/argo_cd_instance/
- Red Hat OpenShift GitOps SSO with Dex documentation: https://docs.redhat.com/en/documentation/red_hat_openshift_gitops/1.20/html/access_control_and_user_management/configuring-sso-for-argo-cd-using-dex
- Argo CD Operator ArgoCD CR reference: https://argocd-operator.readthedocs.io/en/stable/reference/argocd/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD diffing customization documentation: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/diffing/
- Argo CD declarative setup and AppProject documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD upstream install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- OpenShift SCC documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.12/html/authentication_and_authorization/managing-pod-security-policies

## Issues Found
- The OpenShift GitOps Operator install example used the older `openshift-operators` namespace. Current Red Hat documentation for GitOps 1.10 and later uses `openshift-gitops-operator`, with an OperatorGroup in that namespace. Updated the CLI example accordingly.
- The OpenShift OAuth example used `spec.dex.openShiftOAuth`, which Red Hat documents as unsupported from OpenShift GitOps 1.10 onward. Updated it to `spec.sso.provider: dex` and `spec.sso.dex.openShiftOAuth: true`.
- The upstream Argo CD SCC examples omitted the current upstream `argocd-applicationset-controller` and `argocd-notifications-controller` service accounts. Added them to the SCC grant commands and custom SCC user list.
- The cluster-scoped resource section said the default operator-created Argo CD instance can only manage resources in its own namespace. Red Hat documents that the default instance has additional permissions for certain cluster-scoped resources, while user-defined instances are namespace-scoped by default. Updated the wording.

## Review Notes
The examples are generally accurate but remain version-sensitive. Red Hat OpenShift GitOps route defaults changed in GitOps 1.13 and later to `reencrypt`, so readers on older GitOps releases may see different generated route behavior.
