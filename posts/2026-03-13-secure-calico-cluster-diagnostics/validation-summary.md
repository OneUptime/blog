# Validation Summary: How to Secure Calico Cluster Diagnostics

## Status
validated

## Post Type
Tutorial / Security Guide

## Technologies Covered
- Calico (Tigera/Calico Enterprise)
- Kubernetes RBAC (ClusterRole, ClusterRoleBinding)
- Calico CRDs (`projectcalico.org`, `crd.projectcalico.org`)
- Tigera Operator (`operator.tigera.io`)
- `calicoctl cluster diags` command
- AWS S3 with KMS encryption (SSE-KMS)
- Mermaid diagrams

## Sources Consulted
- Tigera/Calico Enterprise documentation for `calicoctl cluster diags`: https://docs.tigera.io/calico-enterprise/latest/operations/troubleshoot/
- Tigera Operator installation docs (calico-system namespace, operator.tigera.io API group): https://docs.tigera.io/calico/latest/getting-started/kubernetes/quickstart
- Kubernetes RBAC documentation (subresources like `pods/log`): https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Calico API resource reference (projectcalico.org/v3): https://docs.tigera.io/calico/latest/reference/resources/
- AWS CLI `aws s3 cp` reference (KMS encryption flags): https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html

## Issues Found
- **Incorrect AWS CLI flag**: The command used `--kms-key-id` for `aws s3 cp`. The correct flag for the high-level `aws s3 cp` command is `--sse-kms-key-id`. The `--kms-key-id` flag does not exist on `aws s3 cp` and would cause the command to fail with an unknown-option error. Fixed by replacing `--kms-key-id` with `--sse-kms-key-id`.

## Review Notes
- The post targets Calico Enterprise / Tigera-flavored Calico (the `calicoctl cluster diags` command, `operator.tigera.io` API group, `calico-system` namespace, and "Tigera Support" references all align with this). Open-source Calico users would need to adapt this; that scoping is implicit in the post.
- The `pods/log` subresource (singular) used in the RBAC rules is correct for granting access to pod logs.
- The wildcard `resources: ["*"]` under `projectcalico.org` / `crd.projectcalico.org` / `operator.tigera.io` is functionally appropriate for a read-only diagnostic role; teams with stricter posture may prefer enumerating specific resources, but this is a stylistic preference rather than a correctness issue.
- The Mermaid `flowchart LR` syntax is valid.
