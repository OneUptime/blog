# Validation Summary: How to Configure OpenShift Security Context Constraints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenShift Container Platform
- Security Context Constraints (SCC)
- Kubernetes Deployments and service accounts
- OpenShift RBAC
- OpenShift CLI (`oc`)

## Sources Consulted
- Red Hat OpenShift Container Platform 4.18, Managing security context constraints: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/authentication_and_authorization/managing-pod-security-policies
- Red Hat OpenShift Container Platform 4.11, SCC defaults and `restricted-v2`: https://docs.redhat.com/en/documentation/openshift_container_platform/4.11/html/authentication_and_authorization/managing-pod-security-policies
- Red Hat OpenShift architecture, SCC admission and prioritization: https://docs.redhat.com/en/documentation/openshift_container_platform/3.5/html/architecture/additional-concepts
- Red Hat OpenShift Container Platform 4.18 CLI reference for `oc adm policy add-scc-to-user`: https://docs.redhat.com/en/documentation/openshift_container_platform/4.18/html/cli_tools/openshift-cli-oc

## Issues Found
- The post said admission selects "the first SCC" that satisfies the pod spec. Red Hat documents SCC ordering by highest priority, then most restrictive, then name. Updated the statement to describe that ordering.
- The post listed `restricted` as the safest default. For new OpenShift 4.11+ installations, `restricted-v2` is the default restrictive SCC for authenticated users. Updated the common SCC list to use `restricted-v2`.
- The post described `anyuid` as allowing a fixed user ID. That was incomplete because `anyuid` allows containers to run as any UID, including root. Updated the description accordingly.

## Review Notes
- The `oc get scc`, `oc adm policy add-scc-to-user <scc> -z <serviceaccount> -n <namespace>`, `oc create serviceaccount`, Deployment `serviceAccountName`, event lookup, and pod description examples are technically valid.
- Current OpenShift documentation generally recommends RBAC-scoped SCC access for user-defined SCCs, while `oc adm policy add-scc-to-user` remains documented and valid for granting SCC access to service accounts.
