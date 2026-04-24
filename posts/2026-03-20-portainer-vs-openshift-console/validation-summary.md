# Validation Summary: Portainer vs OpenShift Console: Enterprise Container Comparison

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- Portainer
- Red Hat OpenShift Container Platform
- OpenShift web console
- Kubernetes
- Docker
- Docker Swarm
- Security Context Constraints (SCC)
- Source-to-Image (S2I)
- OpenShift Builds
- OpenShift Pipelines (Tekton)
- OpenShift GitOps (Argo CD)

## Sources Consulted
- Portainer Documentation: Welcome — https://docs.portainer.io/
- Portainer Documentation: Environment-related — https://docs.portainer.io/2.27/admin/environments
- Portainer Documentation: The Portainer Edge Agent — https://docs.portainer.io/advanced/edge-agent
- OpenShift Container Platform 4.21: Web console — https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html-single/web_console/index
- OpenShift Container Platform 4.21: Managing security context constraints — https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/authentication_and_authorization/managing-pod-security-policies
- OpenShift Container Platform 4.21: CI/CD overview — https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/cicd_overview/ci-cd-overview
- OpenShift Container Platform 4.21: Builds using BuildConfig — https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html-single/builds_using_buildconfig/index
- Red Hat OpenShift Pipelines: Installing and configuring — https://docs.redhat.com/en/documentation/red_hat_openshift_pipelines/latest/html-single/installing_and_configuring/index
- Red Hat OpenShift GitOps: About Red Hat OpenShift GitOps — https://docs.redhat.com/en/documentation/red_hat_openshift_gitops/latest/html/understanding_openshift_gitops/about-redhat-openshift-gitops
- OpenShift Container Platform 4.21: Support for FIPS cryptography — https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/installation_overview/installing-fips
- Red Hat Customer Portal: FedRAMP — https://access.redhat.com/compliance/fedramp
- Red Hat Customer Portal: Common Criteria — https://access.redhat.com/compliance/common-criteria
- Red Hat Developer: OpenShift in the public cloud — https://developers.redhat.com/products/openshift/openshift-public-cloud

## Issues Found
- The post described OpenShift CI/CD as simply "built-in" via Pipelines/Tekton. Current Red Hat documentation distinguishes between platform-native OpenShift Builds and Operator-delivered services such as OpenShift Pipelines and OpenShift GitOps. I corrected the table and the feature bullet to reflect that split.
- The OpenShift security wording was too absolute and too version-specific. Current OpenShift documentation shows default restricted SCC behavior varies by release (`restricted-v2` and `restricted-v3`), and SCC admission enforces equivalent constraints rather than literally requiring that exact pod snippet. I updated the security sections to describe the default restricted SCC behavior accurately.
- The article's "Developer perspective" wording was version-sensitive. In current OpenShift releases, console perspectives are unified and the old Developer perspective is no longer the default experience. I changed those references to developer workflows in the console so the comparison stays accurate across current releases.
- The compliance bullet overstated OpenShift certifications. Red Hat documents FIPS support for OpenShift Container Platform, but FedRAMP applies only to specific managed offerings and the current Red Hat Common Criteria page does not list OpenShift Container Platform as a certified product. I replaced the blanket certification claim with accurate wording about FIPS support, compliance tooling, and offer-specific certifications.
- The multi-cloud and edge-management phrasing needed tightening. I changed the OpenShift row to factual multi-cloud deployment options and replaced the unsupported "superior" Portainer edge claim with neutral wording that matches Portainer's documented Edge Agent capabilities.

## Review Notes
- The YAML fragment in the post is syntactically valid, but it is best understood as an example of a `securityContext` compatible with OpenShift defaults, not as a complete manifest or a field set OpenShift injects verbatim.
- Portainer's current documentation also covers Azure ACI and, in Business Edition, Podman. The post scopes Portainer to Docker, Swarm, and Kubernetes, which is acceptable for this comparison.
- A few statements in the post, especially around setup complexity and licensing cost, remain comparative judgments rather than vendor-documented facts. They are reasonable for a comparison post and were left intact because they are not technical inaccuracies.
