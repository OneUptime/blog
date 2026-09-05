# Validation Summary: Kubernetes Rejects a 3 MB Object: Redesign Oversized ConfigMaps and Custom Resources

## Status
validated

## Post Type
Technical troubleshooting and architecture guide.

## Technologies Covered
- Kubernetes API server, ConfigMaps, Secrets, and kubectl
- Custom resources, CRDs, OpenAPI structural schemas, and status subresources
- etcd storage and request limits
- Server-side apply, managedFields, admission, and dry-run
- Init containers, emptyDir, persistent volumes, and CSI
- External artifact storage, SHA-256 integrity, and configuration rollout

## Sources Consulted
- Kubernetes ConfigMaps: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes custom resources: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/
- CRD validation, pruning, and status subresources: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes API concepts and dry-run: https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run
- kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- kubectl create reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/
- Server-side apply and annotation compatibility: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Generic API-server request-size default: https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/apiserver/pkg/server/config.go
- API-server request-body handling: https://raw.githubusercontent.com/kubernetes/kubernetes/master/staging/src/k8s.io/apiserver/pkg/endpoints/handlers/rest.go
- API-server create handler: https://raw.githubusercontent.com/kubernetes/kubernetes/master/staging/src/k8s.io/apiserver/pkg/endpoints/handlers/create.go
- etcd 3.6 configuration: https://etcd.io/docs/v3.6/op-guide/configuration/
- etcd system limits: https://etcd.io/docs/v3.6/dev-guide/limit/
- Init containers: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Volumes and emptyDir: https://kubernetes.io/docs/concepts/storage/volumes/#emptydir
- Admission webhook practices: https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/

## Issues Found
1. The diagnostic sequence placed an etcd write-size error alongside failures obtainable from server-side dry-run without explaining that persistence is skipped. Added a clarification that dry-run cannot reproduce an etcd write-size rejection and directed readers to the original failed write response and API-server logs.
2. The phrase “decoded write-request body” could imply that the 3 MiB limit measures the decoded Kubernetes object. Corrected both occurrences to specify that the limit applies to the request body before object decoding, consistent with upstream request handling.

## Review Notes
- Confirmed the 3 MiB generic API-server default, 1 MiB ConfigMap/Secret limits, and etcd 3.6 default of 1,572,864 request bytes. These are independent limits, not guarantees about usable application payload size. Decimal MB and binary MiB differ; the post describes a roughly sized manifest rather than an exact rejection threshold.
- Parsed all three YAML snippets and checked both shell snippets with bash syntax validation. Confirmed ConfigMap data values are strings and the sample SHA-256 value has 64 hexadecimal characters. CLI flags and dry-run behavior were checked against official references.
- The custom resource is illustrative and requires a corresponding installed CRD and controller. Its status represents controller output; when the status subresource is enabled, ordinary resource creation does not populate status. The CRD snippet is explicitly an excerpt, not a complete installable CRD.
- OpenAPI length and collection constraints are valid; string length is not a complete encoded-byte budget. The post correctly retains whole-object size checks as a separate concern.
- Confirmed server-side apply ownership tracking and kubectl last-applied annotation compatibility. No deprecated API use was identified in the examples.
- The artifact URLs, custom API group, media type, digest, and byte counts are illustrative placeholders, not verified downloadable artifacts. Official documentation links resolve to the intended resources.
- Artifact integrity, bounded downloads, asynchronous fetching, compact status, and staged migration are sound design guidance. An emptyDir survives container restarts but not Pod removal; cross-Pod rollback requires retained external artifact versions.
- No Kubernetes cluster writes, live admission tests, or etcd failure reproductions were performed. Review consists of official documentation/source verification and local syntax checks. The upstream master source link is mutable; deployed versions and operator overrides should be checked when diagnosing a specific cluster.
