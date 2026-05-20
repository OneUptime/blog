# Validation Summary: How to Install ArgoCD on Red Hat OpenShift

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Argo CD
- Red Hat OpenShift GitOps Operator
- OpenShift Container Platform
- OpenShift Routes
- OpenShift Security Context Constraints
- Dex OpenShift OAuth connector
- Kubernetes manifests and ConfigMaps
- OpenShift CLI (`oc`)

## Sources Consulted
- Red Hat OpenShift GitOps 1.17: Installing Red Hat OpenShift GitOps Operator using CLI: https://docs.redhat.com/en/documentation/red_hat_openshift_gitops/1.17/html/installing_gitops/installing-openshift-gitops
- Red Hat OpenShift GitOps 1.19: Setting up an Argo CD instance and namespace labels: https://docs.redhat.com/en/documentation/red_hat_openshift_gitops/1.19/html-single/argo_cd_instance/
- Argo CD Getting Started: install manifests and initial admin password: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD Installation: standard install manifests and namespace behavior: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD Resource Health: Lua custom health checks in `argocd-cm`: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Dex OpenShift connector documentation: https://dexidp.io/docs/connectors/openshift/
- OpenShift Container Platform route documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/latest/html/ingress_and_load_balancing/routes
- Argo CD user management documentation for secret references in configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/

## Issues Found
- The GitOps Operator CLI installation used the older `openshift-operators` namespace only. Updated the example to create the current `openshift-gitops-operator` namespace, include the required `OperatorGroup`, and place the `Subscription` in that namespace.
- The operator pod watch command checked `openshift-operators`. Updated it to check `openshift-gitops-operator`.
- The default Argo CD admin password command used `oc extract`, which can dump multiple secret keys. Replaced it with the documented `admin.password` jsonpath lookup and base64 decode.
- The namespace management text overstated that the default operator-created Argo CD can only manage `openshift-gitops`. Reworded it to focus on labeling target namespaces for workload deployment.
- The custom Argo CD example used `sourceNamespaces` as if it scoped deployment target namespaces. Removed that field from the target-namespace example and added the correct `argocd.argoproj.io/managed-by=<argocd_namespace>` labels.
- The manual SCC example omitted current service accounts from the upstream install, including ApplicationSet and Notifications. Added those service accounts to the SCC commands.
- The upstream Argo CD install command did not use server-side apply. Updated it to use `--server-side --force-conflicts`, matching current Argo CD installation guidance for large CRDs.
- The Route custom health check marked a Route healthy whenever `.status.ingress` existed. Updated it to inspect the `Admitted` condition and return `Healthy`, `Degraded`, or `Progressing` appropriately.
- The OpenShift OAuth section referenced `$dex.openshift.clientSecret` but did not store that key in `argocd-secret`. Added an `oc patch secret` command to store the matching Dex client secret.

## Review Notes
- Manual upstream Argo CD installation on OpenShift remains more operationally sensitive than the operator path; production users should pin an Argo CD release instead of using the moving `stable` branch.
- The `anyuid` SCC example is broad. It can be useful for a quick upstream install, but production OpenShift clusters should prefer the Red Hat OpenShift GitOps Operator or a tighter security review.
