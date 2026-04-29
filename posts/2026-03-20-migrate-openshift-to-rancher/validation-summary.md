# Validation Summary: How to Migrate from OpenShift to Rancher - A Practical Guide

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Red Hat OpenShift (oc CLI, Routes, DeploymentConfig, BuildConfig, ImageStream, SecurityContextConstraints, OpenShift OAuth)
- Rancher (Rancher Projects, Rancher Fleet, Rancher CLI, authentication providers)
- Kubernetes (Ingress, Deployment, PodSecurityAdmission, securityContext, kubectl)
- Tekton Pipelines (buildah task)
- Flux Image Automation
- Argo CD

## Sources Consulted
- Rancher Manager docs — Authentication Config: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/authentication-config
- Tekton Pipelines documentation: https://tekton.dev/docs/pipelines/pipelines/
- Kubernetes Ingress API reference (networking.k8s.io/v1): https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- OpenShift Route API (route.openshift.io/v1): https://docs.openshift.com/container-platform/latest/rest_api/network_apis/route-route-openshift-io-v1.html
- OpenShift `oc` CLI reference

## Issues Found
- **Step 5 (Replace OpenShift OAuth) — UI navigation path:** The original text instructed users to navigate to **Global Settings > Authentication** in Rancher. This path is incorrect for current Rancher (2.6+), where the option lives under **Users & Authentication > Auth Provider** (accessible via the ☰ menu). Updated the step to reflect the current Rancher UI navigation per the official Rancher Manager docs.

## Review Notes
- The Tekton example uses `apiVersion: tekton.dev/v1`, which is the current stable API version — verified against Tekton Pipelines documentation.
- The Tekton pipeline example references `$(tasks.git-clone.results.commit)` without showing a `git-clone` task definition. This is a minor illustrative shortcut rather than a technical error; users assembling a real pipeline would add a git-clone task (commonly the `git-clone` ClusterTask from the Tekton catalog).
- `oc get all` does not include ConfigMaps, Secrets, or PVCs by default, which is why the export script in Step 1 collects them separately — this is correct.
- The PodSecurityAdmission labels (`pod-security.kubernetes.io/enforce`, `pod-security.kubernetes.io/audit`) and the `restricted` profile are valid, and the `securityContext` fields shown comply with the `restricted` Pod Security Standard.
- The OpenShift Route and Kubernetes Ingress API versions are both correct and current.
- The `apps/v1` Deployment API and the manifest structure are correct.
