# Validation Summary: How to Migrate from OpenShift to Vanilla K8s Preserving App Configurations

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- OpenShift Routes, BuildConfigs, DeploymentConfigs, ImageStreams, and Security Context Constraints
- Kubernetes Ingress, Deployments, Pod Security Standards, NetworkPolicy, ServiceAccounts, and RBAC
- kubectl and oc CLI workflows
- Docker image migration
- GitHub Actions CI/CD
- NGINX Ingress Controller and cert-manager annotations

## Sources Consulted
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes security context task documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes namespace automatic labels: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- OpenShift Route API reference: https://docs.redhat.com/en/documentation/openshift_container_platform/4.21/html/network_apis/route-route-openshift-io-v1
- OpenShift image stream documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/4.9/html-single/images/index
- OpenShift image mirroring documentation: https://docs.redhat.com/en/documentation/openshift_container_platform/3.11/html/developer_guide/dev-guide-managing-images
- GitHub Actions checkout action: https://github.com/actions/checkout
- Docker setup-buildx-action: https://github.com/docker/setup-buildx-action
- Docker login-action: https://github.com/docker/login-action
- Docker build-push-action: https://github.com/docker/build-push-action

## Issues Found
- The Route conversion script did not handle the `List` object produced by `oc get routes --all-namespaces -o yaml`, so it would convert zero Routes in the documented inventory workflow. Updated it to iterate `items` when the input document is a Kubernetes/OpenShift list.
- The Route conversion script converted `spec.port.targetPort` with `int(...)`, which fails for named Route ports. Updated it to preserve named ports as `service.port.name` and numeric ports as `service.port.number`, matching the Kubernetes Ingress backend API.
- The GitHub Actions example used older major versions of common actions. Updated `actions/checkout`, `docker/setup-buildx-action`, `docker/login-action`, and `docker/build-push-action` to current major versions.
- The Pod Security Standards text implied that PSS can directly enforce custom SCC UID/GID ranges. Clarified that PSS provides comparable baseline constraints, while custom UID/GID ranges require explicit pod security contexts or an admission policy engine.
- The security-context Deployment snippet omitted the required `spec.selector` and matching pod template labels for `apps/v1` Deployments. Added the selector and labels.
- The image migration loop pulled and pushed only the untagged image stream repository, which would not reliably migrate image stream tags. Updated it to iterate `.status.tags[*].tag` and migrate each `repository:tag`.
- The NetworkPolicy example used `name: production` as a namespace label, which is not automatically present on Kubernetes namespaces. Replaced it with the stable `kubernetes.io/metadata.name` namespace label.
- The NetworkPolicy ingress rule used separate `namespaceSelector` and `podSelector` peers, which means namespace OR pod matching. Updated it to place both selectors in the same peer so it matches frontend pods in the production namespace.

## Review Notes
- The migration guidance is technically relevant and generally accurate after the fixes.
- The Route-to-Ingress mapping remains controller-specific for TLS behavior and assumes an NGINX Ingress Controller plus certificate management workflow.
- The image migration example assumes the OpenShift integrated registry is reachable and Docker is already authenticated to both source and destination registries.
