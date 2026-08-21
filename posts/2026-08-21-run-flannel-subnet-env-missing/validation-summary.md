# Validation Summary: Why `/run/flannel/subnet.env` Is Missing

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- Flannel v0.28.9
- Flannel CNI plugin v1.9.1-flannel3
- Container Network Interface (CNI)
- `bridge` and `host-local` CNI plugins
- Kubernetes container runtimes and kubelet
- kubectl, Kubernetes RBAC, DaemonSets, ConfigMaps, and hostPath volumes

## Sources Consulted
- Flannel v0.28.9 upstream Kubernetes manifest - https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/kube-flannel.yml
- Flannel v0.28.9 configuration reference - https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/configuration.md
- Flannel v0.28.9 running guide - https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/running.md
- Flannel v0.28.9 troubleshooting guide - https://github.com/flannel-io/flannel/blob/v0.28.9/Documentation/troubleshooting.md
- Flannel Kubernetes subnet-manager source - https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/subnet/kube/kube.go
- Flannel subnet-file writer and Linux atomic-write implementation - https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/subnet/subnet.go and https://github.com/flannel-io/flannel/blob/v0.28.9/pkg/subnet/writefile_other.go
- Flannel startup and readiness implementation - https://github.com/flannel-io/flannel/blob/v0.28.9/main.go
- Flannel CNI plugin documentation and v1.9.1-flannel3 source - https://github.com/flannel-io/cni-plugin/tree/v1.9.1-flannel3
- CNI specification - https://github.com/containernetworking/cni/blob/main/SPEC.md
- Kubernetes Network Plugins documentation - https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- kubectl references for `wait`, `auth can-i`, `logs`, `run`, JSONPath, and field selectors - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/, https://kubernetes.io/docs/reference/kubectl/jsonpath/, and https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes PR and v1.33 changelog for waiting on creation when a selector initially matches no resources - https://github.com/kubernetes/kubernetes/pull/128662 and https://github.com/kubernetes/kubernetes/blob/v1.33.0/CHANGELOG/CHANGELOG-1.33.md

## Issues Found
- The affected-Pod assignment indexed `.items[0]`, which causes a JSONPath array-index error when no Pod matches. Changed it to iterate over the result and select the first name, allowing an empty result as the following troubleshooting branch expects.
- The introduction described both `bridge` and `host-local` as direct delegates. Clarified that Flannel delegates to an interface plugin, `bridge` by default, and configures `host-local` as the default IPAM plugin.
- The readiness wording implied that Pod `Ready` verifies the subnet file. Flannel v0.28.9 latches readiness after traffic-rule setup and the initial successful write, but `/readyz` does not continuously check whether the file still exists. Updated the explanation accordingly.
- Selector-based `kubectl wait --for=create` did not state its client-version requirement. Added that waiting for an initially absent selector match requires kubectl v1.33 or later and described what older-client users must do first.

## Review Notes
The remaining manifest names, labels, init-container sequence, RBAC checks, Node Pod CIDR handling, hostPath paths, dual-stack caveat, subnet-file fields, CNI delegation behavior, recovery guidance, and sandbox test are accurate for the upstream Linux Flannel v0.28.9 manifest and its pinned v1.9.1-flannel3 CNI plugin. The atomic-write statement is Linux-specific, consistent with that manifest's Linux node affinity. `kubectl logs --previous` will normally report an error when no previous container instance exists, and the `kubectl auth can-i --as` checks require the caller to be authorized to impersonate the Flannel service account. Custom or distribution-specific manifests may use different namespaces, labels, and host paths.
