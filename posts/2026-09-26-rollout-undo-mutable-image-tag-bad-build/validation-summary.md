# Validation Summary: How to Fix kubectl rollout undo When Mutable Tags Restore the Bad Build

## Status
validated

## Post Type
Technical troubleshooting and recovery guide.

## Technologies Covered
- Kubernetes Deployments, revision history, Pod templates, and rollout recovery.
- kubectl history, get, set image, and rollout status commands.
- Container registries, mutable tags, image digests, image pull policies, and multi-platform images.
- ConfigMaps, Secrets, release configuration, and GitOps coordination.
- Bash and jq.

## Sources Consulted
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment
- Kubernetes container images and pull policies: https://kubernetes.io/docs/concepts/containers/images/
- kubectl rollout history reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Pod API, including container status fields: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes ConfigMaps: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Docker image digests: https://docs.docker.com/dhi/explore/security-concepts/digests/
- Docker multi-platform images: https://docs.docker.com/build/building/multi-platform/
- Docker Hub immutable tags: https://docs.docker.com/docker-hub/repos/manage/hub-images/immutable-tags/
- CNCF Distribution garbage collection: https://distribution.github.io/distribution/about/garbage-collection/
- jq manual: https://jqlang.org/manual/
- Local Bash builtin documentation: `help set` and `help :`. The GNU Bash online manual could not be retrieved during this review.

## Issues Found
No technical issues found.

## Review Notes
- Confirmed that rollback restores a retained Pod template, not historical registry tag contents or external state. Moving a tag alone does not create a Deployment revision; revisions require a template change.
- Confirmed the distinction between Always resolving the current image reference and IfNotPresent permitting reuse of locally cached content. Digest pinning addresses the mutable-tag failure described.
- Verified the namespace, resource, revision, selector, JSON output, container assignment, and timeout syntax against the kubectl references. The initial get deployment command inspects the current template; rollout history with --revision inspects the retained revision.
- Confirmed that setting the named container image changes the template without restoring its other fields, and that rollout status timeout ends the client watch rather than controller reconciliation. Concurrent releases can change the rollout being watched, supporting the post's coordination advice.
- Checked the Pod container status fields and the distinction between multi-platform indexes and individual manifests. Readiness alone cannot establish that the intended application version is serving.
- Confirmed that referenced configuration is separate from Deployment history, registry artifact retention is necessary for future pulls, and version-shaped tag names do not enforce immutability.
- All three Bash code blocks passed bash -n. Both jq expressions executed successfully against representative JSON fixtures, including a Pod without containerStatuses and an unrelated sidecar.
- The examples require the reader's namespace, Deployment, container name, selector, retained revision, and verified GOOD_IMAGE value. The parameter guard checks that GOOD_IMAGE is set and nonempty; the surrounding procedure requires verifying its digest and provenance.
- All links in the post resolved to the intended documentation or author profile. No deprecated command or API usage was identified; the example v1.2.3 tag is illustrative rather than a Kubernetes version requirement.
- No live cluster or registry recovery was performed. Application behavior, artifact availability, architecture support, and database compatibility require validation in the target environment.
- README.md was left unchanged because no technical corrections were necessary.
