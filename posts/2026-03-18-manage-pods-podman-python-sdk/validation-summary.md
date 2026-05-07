# Validation Summary: How to Manage Pods with Podman Python SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman Python SDK
- Python
- Podman pods
- Kubernetes YAML generation

## Sources Consulted
- Podman Python SDK `PodsManager` documentation: https://podman-py.readthedocs.io/en/stable/podman.domain.pods_manager.html
- Podman Python SDK `Pod` model documentation: https://podman-py.readthedocs.io/en/stable/podman.domain.pods.html
- Podman Python SDK container creation documentation: https://podman-py.readthedocs.io/en/stable/podman.domain.containers_create.html
- Podman Python SDK source for pods and container create payload mapping: https://github.com/containers/podman-py
- Podman `pod create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `pod inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-inspect.1.html
- Podman `kube generate` documentation: https://docs.podman.io/en/v5.8.0/markdown/podman-kube-generate.1.html

## Issues Found
- The post used `pod.status`, but the Podman Python SDK `Pod` model documents `id`, `name`, `short_id`, lifecycle methods, and `attrs`; it does not expose a `status` property. Updated examples to read pod state from `pod.attrs` using documented inspect/list fields.
- The post used `InfraContainerId`, but Podman inspect documentation lists the field as `InfraContainerID`. Updated the examples to use the documented key.
- Container entries in pod inspect output may use lowercase keys such as `id` and `state`, while list-style responses may include other casing. Updated display examples to handle documented lowercase keys and common SDK response variants.
- The post claimed every pod includes an infra container. Podman creates one by default, but `podman pod create --infra=false` is supported. Updated the wording to "By default."
- The opening described pods as "Podman-unique", which was misleading because pods are also a Kubernetes concept. Updated the wording to "first-class Podman feature."
- The post implied the Python SDK itself provides Kubernetes YAML generation. The example correctly shells out to `podman kube generate`, so the surrounding wording and conclusion were updated to clarify that YAML generation is provided by the Podman CLI.

## Review Notes
- The review environment did not have `podman` or the `podman` Python package installed, so validation was documentation- and source-based rather than runtime-based.
- The `podman kube generate` command is current in Podman 5.x. Older Podman versions also documented `podman generate kube`, so readers on older installations may need to check their local `podman --help`.
