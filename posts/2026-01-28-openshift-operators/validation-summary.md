# Validation Summary: How to Use OpenShift Operators

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenShift Container Platform
- Kubernetes Operators
- Operator Lifecycle Manager (OLM)
- OperatorHub
- Custom Resource Definitions (CRDs)
- OpenShift CLI (`oc`)
- YAML manifests

## Sources Consulted
- Red Hat OpenShift Container Platform 4.17 Operators administrator tasks: https://docs.redhat.com/en/documentation/openshift_container_platform/4.17/html/operators/administrator-tasks
- Red Hat OpenShift Container Platform 4.8 Operators user tasks: https://docs.redhat.com/en/documentation/openshift_container_platform/4.8/html/operators/user-tasks
- Red Hat OpenShift Container Platform 4.8 Understanding Operators: https://docs.redhat.com/en/documentation/openshift_container_platform/4.8/html/operators/understanding-operators
- Red Hat OpenShift Container Platform 4.22 Operator Framework glossary: https://docs.redhat.com/en/documentation/openshift_container_platform/4.22/html/extensions/of-terms

## Issues Found
- The installation-mode section described only all-namespaces and single-namespace modes. Official OLM documentation also defines own-namespace and multi-namespace install modes. Updated the wording to describe all-namespaces and single-namespace as common scopes and mention the additional OLM modes.
- The `Subscription` example used a concrete `postgresql` package from the `redhat-operators` catalog without verifying that this package/channel/catalog combination exists. Replaced the concrete values with placeholders and pointed readers to `oc describe packagemanifests <operator-name> -n openshift-marketplace`, matching Red Hat's documented workflow.
- The custom resource example used a fictitious PostgreSQL API group and kind. Reworded the text to clarify that the `apiVersion`, `kind`, and `spec` are installed by the selected operator's CRD, then changed the snippet to a generic CR shape.

## Review Notes
The `oc get subscription`, `oc get csv`, and `oc describe csv <operator-csv-name> -n openshift-operators` commands are consistent with OpenShift resource names and documented OLM troubleshooting workflows. The guide remains version-neutral; readers still need to consult the selected operator's documentation for supported channels, install modes, and CR schemas.
