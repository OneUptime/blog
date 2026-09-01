# How to Install KubeVela with Helm and Fix “Failed to Download kubevela/vela-core”

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Helm, Troubleshooting, Application Delivery, Platform Engineering

Description: Install KubeVela from its official Helm repository and diagnose chart download, repository, network, version, and release-name failures safely.

---

The message `failed to download kubevela/vela-core` is a Helm chart-resolution error, not proof that the KubeVela controller failed after installation. Helm first resolves the repository alias `kubevela`, reads its cached index, selects a `vela-core` chart version, and downloads that archive. A missing alias, stale index, blocked HTTPS request, or nonexistent version can all fail before Kubernetes receives any resources.

Start by confirming the target. Installation commands act on the current kubeconfig context, and a perfectly successful install into the wrong cluster is difficult to distinguish from a missing install later.

```bash
kubectl config current-context
kubectl cluster-info
kubectl version
helm version
```

Use the KubeVela documentation for the version you intend to install to check its Kubernetes compatibility. The current v1.11 installation page documents Kubernetes `>=1.19` and `<=1.31`, plus Helm 3.2 or newer. Treat those bounds as release-specific: do not assume an arbitrarily new kind, managed-cluster, or Helm release is supported by an older KubeVela version.

## Add and verify the official chart repository

The official repository setup is:

```bash
helm repo add kubevela https://kubevela.github.io/charts
helm repo update
helm search repo kubevela/vela-core --versions
```

The first word in `kubevela/vela-core` is a **local repository name**. It is not inferred from the URL. Inspect the actual mapping:

```bash
helm repo list
```

If `kubevela` points somewhere else, replace only that entry with Helm's documented update behavior and refresh the index:

```bash
helm repo add kubevela https://kubevela.github.io/charts --force-update
helm repo update kubevela
helm search repo kubevela/vela-core --versions
```

Do not use `--insecure-skip-tls-verify` as a generic fix. An unknown CA in a controlled enterprise network should be solved with the correct CA bundle and proxy configuration; disabling verification makes chart retrieval vulnerable to interception.

## Install with an explicit release and namespace

The official guide uses the release name `kubevela` in `vela-system`:

```bash
helm install kubevela kubevela/vela-core \
  --namespace vela-system \
  --create-namespace \
  --wait \
  --timeout 15m
```

For reproducible environments, select a version shown by `helm search repo ... --versions` and pin it:

```bash
helm install kubevela kubevela/vela-core \
  --namespace vela-system \
  --create-namespace \
  --version <tested-chart-version> \
  --wait \
  --timeout 15m
```

Pin the `vela` CLI to a compatible release as well. `vela install` is a convenient alternative that installs or upgrades the control plane, but mixing it with ad-hoc Helm commands without recording the namespace, release name, and versions makes later diagnosis harder.

## Classify a download failure

Run these read-only checks before retrying:

```bash
helm repo list
helm search repo kubevela/vela-core --versions
helm show chart kubevela/vela-core --version <tested-chart-version>
curl --fail --show-error --location https://kubevela.github.io/charts/index.yaml -o /dev/null
```

Interpret the first failing layer:

- `no repository definition for kubevela` means the alias is absent from this user's Helm configuration.
- `chart "vela-core" not found` usually means the cached index lacks that chart or requested version. Refresh it and verify the exact version exists.
- HTTP timeout, proxy, DNS, or TLS errors mean the machine running Helm cannot reach the repository correctly. Kubernetes pod networking is not involved yet.
- A successful search but failed archive download can indicate a proxy blocking the chart URL referenced by `index.yaml`, not the index itself.
- A permission error under Helm's repository cache or configuration directory means the current user cannot update its own local Helm state. Do not solve that by running every subsequent deployment as root.

If a corporate mirror is required, configure and audit the mirror as a separate repository. Do not silently substitute an untrusted chart source under the `kubevela` name.

## Distinguish download errors from release conflicts

Helm release names are scoped to namespaces. Check all namespaces and all statuses:

```bash
helm list --all-namespaces --all --filter '^kubevela$'
helm status kubevela --namespace vela-system
```

If a release already exists, `helm install` should not be repeated. Review its values and chart version first:

```bash
helm get values kubevela --namespace vela-system --all
helm get metadata kubevela --namespace vela-system
```

Then use an intentional, version-controlled upgrade after reading the KubeVela upgrade guide. Do not delete Helm release secrets or CRDs just to clear a name; KubeVela CRDs can back existing Applications and definitions.

## Verify the control plane

A `DEPLOYED` Helm status is necessary, but controller readiness is the useful outcome:

```bash
helm status kubevela --namespace vela-system
kubectl get pods --namespace vela-system
kubectl get deployment --namespace vela-system
kubectl get crd applications.core.oam.dev componentdefinitions.core.oam.dev
vela version
```

If Helm times out after resources were created, inspect pod events and logs rather than immediately reinstalling:

```bash
kubectl get events --namespace vela-system --sort-by=.lastTimestamp
kubectl describe pods --namespace vela-system
```

Image-pull failures, admission-policy denials, insufficient resources, and unsupported Kubernetes APIs are post-download failures and need different fixes. Preserve the original event and controller log because a second install can obscure it.

## Official Documentation

- [KubeVela installation on Kubernetes](https://kubevela.io/docs/installation/kubernetes/)
- [KubeVela `vela install` command](https://kubevela.io/docs/cli/vela_install/)
- [KubeVela migration and upgrade guidance](https://kubevela.io/docs/platform-engineers/system-operation/migration-from-old-version/)
- [Helm repository add command](https://helm.sh/docs/helm/helm_repo_add/)
- [Helm install command](https://helm.sh/docs/helm/helm_install/)
- [Helm repository commands](https://helm.sh/docs/helm/helm_repo/)

## Conclusion

Treat `failed to download kubevela/vela-core` as a repository-resolution chain: verify context and compatibility, map the `kubevela` alias to the official URL, refresh and search the index, pin an available version, and only then install into the explicit `vela-system` namespace. Once the chart downloads, switch to Kubernetes events and controller readiness checks instead of continuing to troubleshoot Helm's local cache.
