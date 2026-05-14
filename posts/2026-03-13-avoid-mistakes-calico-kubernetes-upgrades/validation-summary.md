# Validation Summary: How to Avoid Common Mistakes with Calico on Kubernetes Upgrades

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Tigera Operator
- Kubernetes
- kubectl
- Flux/GitOps
- Container network connectivity testing

## Sources Consulted
- Calico upgrade documentation: https://docs.tigera.io/calico/latest/operations/upgrading/kubernetes-upgrade
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico ImageSet documentation: https://docs.tigera.io/calico/latest/operations/image-options/imageset
- Calico v3.28.0 operator manifest and CRDs: https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/tigera-operator.yaml
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes command and args documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/

## Issues Found
- The first example used `kubectl patch installation default ... '{"spec":{"version":"v3.28.0"}}'`, but the Tigera operator `Installation` spec does not expose a `version` field for upgrading Calico. Updated the example to apply the v3.28.0 Tigera operator manifest, matching the documented operator-managed upgrade flow.
- The GitOps upgrade flow said to "Make changes to ImageSet", which could imply editing an existing ImageSet. Updated the wording to add the new ImageSet first when image digests are pinned, then update the operator manifests.
- The connectivity test used `kubectl run ... -- sh -c ...` without `--command`, which would pass `sh -c` as container args instead of reliably overriding the container command. Updated it to use `--command --`.
- The connectivity test used Alpine `wget` against `http://kubernetes.default.svc`; the Kubernetes service is normally HTTPS. Updated the probe to use a curl image, `https://kubernetes.default.svc/version`, and curl's built-in timing output.

## Review Notes
- The Calico compatibility guidance is directionally correct: Calico documents tested Kubernetes versions per release, and operators should verify the matrix before upgrading.
- The ImageSet cleanup command assumes GNU utilities such as `sort -V` and `head -n -N`; it is suitable for typical Linux operator workstations but may need adjustment on macOS.
