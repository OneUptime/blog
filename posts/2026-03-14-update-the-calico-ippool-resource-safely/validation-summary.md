# Validation Summary: Safely Updating the Calico IPPool Resource in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico IPPool resources
- Calico IPAM
- calicoctl
- kubectl
- Kubernetes RBAC and CRDs

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl validate command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl configuration overview: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico IP pool migration guide: https://docs.tigera.io/calico/latest/networking/ipam/migrate-pools
- Calico end user RBAC guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/end-user-rbac
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The troubleshooting guidance said unknown fields are silently ignored by `kubectl`. That was too broad for Calico resources, where `calicoctl validate` and Calico API validation should be used to catch structural and field errors. Updated the note to recommend `calicoctl validate -f ippool.yaml`.
- The CRD version review command used `kubectl get crds | grep projectcalico | awk '{print $1, $2}'`, which prints the default second column from `kubectl get crds` rather than CRD API versions. Replaced it with a `custom-columns` command that reads `.spec.versions[*].name`.
- The RBAC check combined `kubectl auth can-i VERB RESOURCE` with `--list`, which are separate usage forms. Replaced it with a valid check for whether the current identity can update `ippools.crd.projectcalico.org`.

## Review Notes
- The core Calico commands for exporting, applying, validating, and inspecting IPPool resources match the official Calico documentation.
- Calico installations may use `calico-system` or another namespace depending on the install method; the post assumes the operator-style namespace used by many current installations.
