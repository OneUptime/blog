# Validation Summary: Safely Updating the Calico BlockAffinity Resource in Kubernetes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Calico IPAM
- Calico BlockAffinity resources
- Kubernetes
- kubectl
- calicoctl

## Sources Consulted
- Calico Enterprise BlockAffinity resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/blockaffinity
- Calico Open Source resource definitions: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl overview: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl installation and usage guidance: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico IPAM overview: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes API field validation documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/

## Issues Found
- The original post recommended manually applying edited BlockAffinity manifests with `calicoctl apply`. Calico documents BlockAffinity as managed by Calico IPAM and supports get/list/watch, not create, delete, or update. I changed the article from a manual update workflow to a read-only review and supported remediation workflow.
- The original rollback instructions recommended reapplying a saved BlockAffinity manifest. Since manual updates are unsupported, I changed rollback guidance to revert the supported higher-level change and use the saved BlockAffinity snapshot only for comparison.
- The original examples used `calicoctl get blockaffinity -o yaml` as the primary resource command. Current Calico Open Source resource docs do not list BlockAffinity as a normal `projectcalico.org/v3` resource managed by calicoctl, while BlockAffinity exists as an internal `crd.projectcalico.org` resource. I changed inspection examples to use `kubectl get blockaffinities.crd.projectcalico.org -o yaml` and kept changes read-only.
- The original troubleshooting note said unknown fields are silently ignored by kubectl. Current Kubernetes documentation says modern `kubectl` defaults to strict validation, while the API server can ignore, warn, or reject unknown fields depending on field validation mode. I updated the wording.
- The original RBAC check combined `kubectl auth can-i` arguments in a way that did not match the command's purpose, and the text implied it could list who has access. `kubectl auth can-i` checks whether the current identity can perform an action. I changed the example to check the current identity's `update` permission for `blockaffinities.crd.projectcalico.org`.

## Review Notes
The post is now technically valid as a safety guide for reviewing BlockAffinity state. Future improvements could add explicit Calico-supported remediation examples for specific scenarios, but those should be scenario-specific because BlockAffinity itself should not be edited manually.
