# Validation Summary: How to Enable Persistent Volume Claims and Write Access in Knative Serving

## Status
validated

## Post Type
Technical configuration and troubleshooting guide.

## Technologies Covered
- Knative Serving and Knative Operator
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes ConfigMaps, volume mounts, and filesystem permissions
- kubectl and YAML

## Sources Consulted
- [Knative volume support](https://knative.dev/docs/serving/services/storage/) — PVC feature switches, writable mounts, and startup overhead.
- [Configuring Knative using the Operator](https://knative.dev/docs/install/operator/configuring-with-operator/) — configuration mapping and reconciliation of managed ConfigMaps.
- [Knative Serving feature flags](https://knative.dev/docs/serving/configuration/feature-flags/#kubernetes-persistentvolumeclaim-pvc) — PVC and write-access extensions.
- [Knative dry run](https://knative.dev/docs/serving/dryrun/) — dry-run support.
- [Kubernetes persistent volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/) — claim references, namespaces, access modes, binding, and reclaim policies.
- [kubectl apply reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/) — filename input and server-side dry-run behavior.
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/) — resource selection, namespaces, YAML output, and label selectors.
- [Kubernetes security contexts](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/) — user/group identity, volume permissions, and permission-related startup overhead.

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. Reviewed YAML structure and field types against official examples; both shell blocks pass Bash syntax checking.
- Confirmed both feature names and quoted enabled values, the spec.config.features mapping, and the serving.knative.dev/v1 Service structure. Both readOnly settings correctly express writable use.
- The Operator snippet is intentionally a fragment to merge into an existing resource. The ConfigMap inspection command assumes the conventional knative-serving installation namespace; installations using another namespace must substitute it.
- Confirmed that claims are namespaced and that ReadWriteOnce permits multiple pods on one node. A shared claim does not automatically provide application concurrency control or a distinct claim per replica.
- The distinction between admission, binding, attachment, and application filesystem permissions is sound. Server-side dry run does not persist the Service or exercise actual storage attachment and application writes.
- The image is explicitly illustrative, and the existing claim and application namespace are prerequisites. Runtime behavior depends on the replacement application, storage driver, access mode, and backend permissions.
- No live cluster deployment, image pull, or storage write test was performed. Validation consisted of documentation review and local shell syntax checks; no deprecated API or command was identified in the examples.
- The linked technical documentation resolves to the intended resources. The post does not pin a Knative or Kubernetes release; feature availability should be checked against the installed release.
