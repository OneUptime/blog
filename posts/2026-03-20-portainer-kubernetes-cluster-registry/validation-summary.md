# Validation Summary: How to Set Up Cluster Registry Access in Portainer for Kubernetes - Kubernetes

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Kubernetes
- kubectl CLI
- Kubernetes Secrets (`kubernetes.io/dockerconfigjson`)
- Kubernetes ServiceAccounts
- Kubernetes Deployments
- EmberStack Reflector

## Sources Consulted
- Portainer Kubernetes registries documentation: https://docs.portainer.io/user/kubernetes/cluster/registries
- Portainer Kubernetes namespace management documentation: https://docs.portainer.io/user/kubernetes/namespaces/manage
- Kubernetes `kubectl create secret docker-registry` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_docker-registry/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes private registry image pull task: https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/
- Kubernetes ServiceAccount configuration task: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- EmberStack Reflector README: https://github.com/emberstack/kubernetes-reflector

## Issues Found
1. **Incorrect Portainer navigation for registry access.** The post said cluster registry access was configured from **Settings → Cluster**. Portainer's current Kubernetes docs show registry access is managed from **Cluster → Registries**, then **Manage access** on the registry. I updated the UI steps accordingly.
2. **Namespace flow in Portainer was mislabeled.** The draft referred to a **Registry access** action inside a namespace. Portainer's namespace management page exposes this under the **Registries** section with **Select registries** and **Update namespace**. I corrected the steps to match the documented UI.
3. **Manual secret example used a non-portable shell pipeline.** The original YAML section depended on `base64 -w0`, which is GNU-specific, and embedded shell-generated base64 instead of showing a current Kubernetes-native manifest pattern. I replaced it with a valid `kubernetes.io/dockerconfigjson` Secret manifest using `stringData`, which the Kubernetes docs explicitly support.
4. **Reflector installation example was not a valid deployment manifest.** The sample `Deployment` omitted required fields such as pod template metadata labels and also skipped the supporting resources the Reflector project ships. I replaced it with the official published install manifest command from the Reflector project.
5. **Deployment manifest was invalid for `apps/v1`.** The example `Deployment` lacked the required `.spec.selector` and matching pod template labels. I added the selector and labels required by the Kubernetes Deployment API.
6. **ServiceAccount behavior was overstated.** Patching the `default` ServiceAccount does not retroactively affect every pod in the namespace. It applies to new pods that use that service account. I corrected the explanatory sentence to match the Kubernetes docs.
7. **Verification command did not explicitly force a pull.** I added `--image-pull-policy=Always` to the `kubectl run` example so the verification step actually exercises registry access instead of potentially reusing a locally cached image.

## Review Notes
- Portainer's current documentation describes registry access as environment-scoped and namespace-specific. The revised post reflects that UI model.
- `--docker-email` is still accepted by current `kubectl create secret docker-registry` documentation, but the Kubernetes docs note that the email field is optional.
- Reflector is a third-party controller, not a built-in Kubernetes feature. Its installation and annotation behavior were validated against the project's own README rather than Kubernetes core documentation.
- The post does not specify a Portainer release. The UI paths and behavior were reviewed against the current Portainer docs available on 2026-04-24.
