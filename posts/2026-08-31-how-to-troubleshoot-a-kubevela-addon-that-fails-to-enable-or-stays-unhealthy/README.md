# How to Troubleshoot a KubeVela Addon That Fails to Enable or Stays Unhealthy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Troubleshooting, Application Delivery, Platform Engineering

Description: Diagnose KubeVela addon registry, compatibility, rendering, definition, admission, and runtime health failures without destructive reinstallation.

---

Enabling a KubeVela addon is a pipeline. The CLI finds an addon and version in a registry, validates KubeVela/Kubernetes constraints and dependencies, renders its parameters into a KubeVela Application, applies definitions and resources, and waits for health. Failures before an addon Application exists and an unhealthy existing Application point to different portions of this pipeline, so preserve the first error before retrying.

An addon can install controllers, CRDs, cluster-wide RBAC, webhooks, definitions, and workloads in managed clusters. Disabling and re-enabling blindly is not a harmless cache reset; it can remove resources or disturb Applications that use the addon's capabilities.

## Record versions, context, and current status

```bash
kubectl config current-context
vela version
kubectl version
vela addon list
vela addon status <addon-name> --verbose
```

Record the selected addon version, registry, parameters, dependencies, destination clusters, CLI/core versions, and first error. Addon metadata can constrain both KubeVela and Kubernetes versions. Do not use `--skip-version-validating` merely to get past an incompatibility; it disables a safety check and can produce unsupported APIs or controller failures later.

If the addon name exists in multiple registries, list each explicitly:

```bash
vela addon list --registry <registry-name>
vela addon registry list
vela addon registry get <registry-name>
```

The same addon name from another registry can have different source, version, dependencies, and trust. Enable with a registry-qualified name when ambiguity exists:

```bash
vela addon enable <registry-name>/<addon-name> \
  --version <tested-version>
```

## 1. Diagnose discovery and download

Errors while listing or fetching an addon or version usually belong to registry access:

- wrong or obsolete registry endpoint;
- DNS, proxy, firewall, or TLS failure from the machine running `vela`;
- missing version in the selected registry;
- private Git/Helm registry authentication failure; or
- a moved legacy KubeVela registry after an upgrade.

Inspect the registry configuration and use its official HTTPS endpoint. KubeVela's migration guide documents historical registry moves; follow the guide for the source release rather than copying an old blog's URL. Configure a trusted CA instead of `--insecureSkipTLS` wherever possible, and keep registry tokens out of shell history.

Render without applying:

```bash
vela addon enable <addon-name> \
  --version <tested-version> \
  --dry-run
```

Add required addon parameters to that command. Review any namespaces, RBAC, Secrets, image and chart references, CRDs, webhooks, definitions, and target clusters present in the output. The addon dry-run does not expand referenced Helm charts, so render those charts separately when you need to inspect their contents. Dry-run cannot prove image pulls or admission will succeed, and applying its output with `kubectl` or GitOps bypasses normal addon compatibility and dependency checks. Use it to separate fetch/render errors from runtime errors, not as evidence that the addon is supported.

## 2. Check compatibility and dependencies

Addon `metadata.yaml` can declare semantic-version dependencies and `system.vela` or `system.kubernetes` constraints. Read the source metadata for those constraints; use verbose status for the installed version, registry, clusters, dependencies, and parameters. Upgrade through KubeVela's supported sequence when the core is too old; do not install a newer addon around an old controller by skipping checks.

Confirm dependencies are not merely listed but healthy:

```bash
vela addon status <dependency> --verbose
```

For example, a chart-delivery addon may require Flux controllers; an ingress addon requires a suitable Service exposure environment; an autoscaling addon needs metrics or an external event source. Each controller's CRDs must be established before dependent custom resources are admitted.

## 3. Find the addon Application

KubeVela assembles an enabled addon into an Application, commonly named `addon-<name>` in `vela-system`:

```bash
kubectl get applications --namespace vela-system
vela status addon-<addon-name> --namespace vela-system --tree --detail
kubectl get application addon-<addon-name> --namespace vela-system -o yaml
```

Confirm the real name from the list rather than assuming it. Inspect workflow steps, conditions, component health, and resource tree. A blocked workflow may wait on a Helm release, Deployment, Job, or managed-cluster dispatch.

Preserve the Application YAML and events before another enable attempt. Reapplying parameters can generate a new revision and hide the initial cause.

## 4. Inspect Kubernetes events and controllers

Use the resource tree to identify the exact namespace and object, then:

```bash
kubectl get events --namespace <namespace> --sort-by=.metadata.creationTimestamp
kubectl get pods --namespace <namespace> -o wide
kubectl describe pod --namespace <namespace> <pod-name>
kubectl logs --namespace <namespace> <pod-name> --all-containers
```

Classify the first causal error:

- `ImagePullBackOff`: registry path, tag/digest, credentials, or egress;
- unschedulable: requests, taints, node-selector/architecture mismatch, or storage;
- API/admission rejection: quota, Pod Security, policy engine, webhook, or invalid API;
- failed Job/hook: inspect its logs and ServiceAccount permissions;
- webhook unavailable: controller/service/certificate bootstrap ordering;
- missing CRD: dependency or install ordering; or
- readiness failure: controller configuration, downstream endpoint, or probe.

Do not disable admission or probes globally. Fix the addon's declared resources or approved cluster policy exception.

## 5. Resolve definition conflicts intentionally

Addons often install ComponentDefinitions and TraitDefinitions. If a same-named definition exists, KubeVela may stop to avoid overwriting the platform API. Inspect the addon's source or dry-run output, then inspect the installed definition and its schema:

```bash
vela def get <definition-name>
vela show <definition-name> --namespace vela-system
```

The `vela addon enable` command offers `--override-definitions`, but use it only after confirming the addon is the intended owner and existing Applications remain compatible. Overwriting a shared `helm`, `gateway`, or autoscaling definition can change rendering for many teams.

Prefer a planned migration or a namespaced/versioned custom definition when ownership differs.

## 6. Check addon parameters and target clusters

Use verbose status and dry-run to confirm parameter spelling and types. A quoted boolean is not always equivalent to a boolean; list syntax and memory quantities also matter. Never pass passwords as command-line addon parameters if the addon supports Secret references, because history and process listings can expose them.

YAML-template addons with `deployTo.runtimeCluster: true` can deploy to runtime/managed clusters according to addon metadata and `--clusters`; CUE-template addons must render the `clusters` value into their own topology policy. Verify every selected cluster is registered, reachable, compatible, and has required namespaces and capacity:

```bash
vela cluster list
vela cluster probe <cluster-name>
```

One unreachable spoke can keep an otherwise healthy hub installation incomplete.

## Recover without destructive loops

Fix registry, version, parameters, dependency, RBAC, or runtime failure at its owning layer. Then use the documented addon upgrade/enable flow with a pinned version and watch the existing addon Application. Review release notes before changing versions.

As a first response, do not delete CRDs, ResourceTrackers, addon Applications, or controller namespaces, and do not manually remove finalizers. `vela addon disable` checks for Applications using the addon's definitions unless `--force` is used, but disabling still deletes the addon Application and can garbage-collect its resources and definitions. If removal is truly required, inventory dependents, back up state, and test the version-specific disable lifecycle.

For air-gapped clusters, follow KubeVela's official offline-addon procedure: mirror every image and referenced Helm chart, modify addon references to approved image and chart registries, and enable the modified addon from a local directory or sync it to a private addon registry. Partial mirroring commonly produces an addon that renders successfully but stays unhealthy on image pulls.

## Official Documentation

- [KubeVela addon enable command](https://kubevela.io/docs/cli/vela_addon_enable/)
- [KubeVela addon status command](https://kubevela.io/docs/cli/vela_addon_status/)
- [KubeVela addon list command](https://kubevela.io/docs/cli/vela_addon_list/)
- [KubeVela addon registry commands](https://kubevela.io/docs/cli/vela_addon_registry/)
- [KubeVela addon structure and metadata](https://kubevela.io/docs/platform-engineers/addon/intro/)
- [KubeVela air-gapped addon installation](https://kubevela.io/docs/platform-engineers/system-operation/enable-addon-offline/)

## Conclusion

Trace addon enablement in order: registry and version discovery, compatibility and dependencies, dry-run rendering, addon Application workflow, Kubernetes admission, and controller health. Pin the source and parameters, compare definition conflicts instead of overwriting blindly, and inspect every target cluster. Avoid disable/re-enable loops until you understand the addon's garbage-collection and dependency impact.
