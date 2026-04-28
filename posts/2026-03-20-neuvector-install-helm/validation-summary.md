# Validation Summary: How to Install NeuVector with Helm

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- NeuVector (container security platform)
- Kubernetes
- Helm v3
- kubectl
- Container runtimes (Docker, containerd, CRI-O, k3s)

## Sources Consulted
- NeuVector Helm chart `values.yaml` (master): https://raw.githubusercontent.com/neuvector/neuvector-helm/master/charts/core/values.yaml
- NeuVector Helm chart repository: https://github.com/neuvector/neuvector-helm
- Helm CLI documentation: https://helm.sh/docs/helm/
- NeuVector official Helm repo URL: https://neuvector.github.io/neuvector-helm/

## Issues Found

Several configuration values in the custom `values.yaml` snippet did not match the actual NeuVector Helm chart schema. Each issue was corrected as follows:

1. **Invalid `k8s.platform` key.** The post used a fictitious `k8s.platform: containerd` (and equivalents for `docker`/`crio`) to select a container runtime. The NeuVector chart has no `k8s` top-level value. Runtime selection is done via the top-level `containerd.enabled` / `containerd.path`, `docker.path`, `crio.enabled` / `crio.path`, and `k3s.enabled` / `k3s.runtimePath` keys (or `runtimePath` since 5.3.0). Replaced both occurrences (in the custom values file and the "Customizing for Different Container Runtimes" section) with the correct keys.

2. **`scanner` placed at top level.** The NeuVector chart nests the scanner configuration under `cve.scanner`, not at the top level. Moved the scanner block under a new `cve:` parent.

3. **`updater` placed at top level.** Same issue — `updater` is nested under `cve.updater`. Moved it under the `cve:` parent alongside the scanner.

4. **`admin.password` key does not exist.** The chart exposes the initial admin password via the top-level `bootstrapPassword` value (or via a `controller.secret` `userinitcfg.yaml`). Replaced `admin.password: "..."` with `bootstrapPassword: "..."`.

5. **`persistence` top-level key does not exist.** Persistent storage for controller state is configured under `controller.pvc` (with `enabled`, `accessModes`, `storageClass`, and `capacity`). Replaced the `persistence:` block with the correct `controller.pvc` block. Note that `capacity` (not `size`) is the correct field name.

6. **Misleading comment on `controller.configmap.enabled`.** The post described this as enabling "persistent storage for controller config", but `controller.configmap` is for seeding initialization config files (LDAP, OIDC, SAML, system, users, etc.), not for persistence. Removed this stanza in favor of the correct `controller.pvc` block above.

## Review Notes

- Image tag `5.3.0` is a valid NeuVector release; current chart default at the time of review is `5.5.1`. Readers may want to track newer 5.x releases, but the 5.3.0 example is internally consistent with the upgrade-to-5.3.1 example shown later.
- Default scanner image tag in the upstream chart is currently `"6"` (not `latest`), but `latest` is still pullable and valid as an example.
- The `helm install` flags (`--namespace`, `--values`, `--wait`, `--timeout`), `helm upgrade --set`, `helm history`, `helm rollback`, and `helm uninstall` invocations are all syntactically correct per Helm v3 documentation.
- The manager service name `neuvector-service-webui` matches what the chart's `webui` service template renders.
- The CRD cleanup pipeline (`kubectl get crd | grep neuvector | awk '{print $1}' | xargs kubectl delete crd`) is a reasonable best-effort cleanup; readers on shells without `awk` could substitute `kubectl get crd -o name | grep neuvector | xargs kubectl delete`, but the original is correct.
- Helm v3 and Kubernetes v1.19+ are accurate minimum prerequisites for current NeuVector chart versions.
