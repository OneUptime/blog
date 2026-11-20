# Validation summary

Reviewed mount-level denial versus process-level denial, numeric identity, root squashing, preprovisioned server ownership and the distinction between built-in NFS and CSI ownership handling.

## Local checks

All three objects passed the official Kubernetes v1.34.0 OpenAPI schemas using PyYAML 6.0.2 and jsonschema 4.25.1. Binding relationships, retained storage, group and versioned image assertions passed. The published manifest matches the checked file; embedded and standalone shell syntax passed. Tagged NFS source was inspected to confirm no recursive ownership change in SetUpAt. BusyBox 1.37.0 is listed in the official image manifest. Mermaid was checked structurally (six nodes, five edges), not rendered. The generated social image was visually reviewed and the title fits.

## Limits

No live API, admission, Kubernetes scheduling, PV binding, image runtime, NFS export or permission test occurred. The article explicitly separates local schema checks from its proposed server dry run and actual probe. The security example is static built-in NFS with sec=sys, not a universal CSI or Kerberos configuration. No immutable image digest was resolved.

## Checked sources

- https://man7.org/linux/man-pages/man5/exports.5.html
- https://man7.org/linux/man-pages/man1/stat.1.html
- https://man7.org/linux/man-pages/man8/exportfs.8.html
- https://github.com/kubernetes/kubernetes/blob/v1.34.0/pkg/volume/nfs/nfs.go
- https://v1-34.docs.kubernetes.io/docs/tasks/configure-pod-container/security-context/
- https://github.com/docker-library/official-images/blob/master/library/busybox
- https://v1-34.docs.kubernetes.io/docs/concepts/storage/persistent-volumes/
- https://busybox.net/downloads/BusyBox.html
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- https://raw.githubusercontent.com/kubernetes/kubernetes/v1.34.0/api/openapi-spec/swagger.json

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
