# Why Does `helm list` Show No KubeVela Release? Checking Namespaces, Repositories, and Existing Names

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Helm, Troubleshooting, Application Delivery

Description: Find a seemingly missing KubeVela Helm release by checking the active cluster, namespace scope, release status, repository aliases, and installation method.

---

An empty `helm list` does not mean KubeVela is absent. In Helm 3 and later, release records are namespace-scoped, and `helm list` without `--namespace` uses the namespace in the current Kubernetes context. The command also exits successfully when it finds nothing. KubeVela is normally installed as release `kubevela` in `vela-system`, so listing `default` can legitimately show only headers.

There are four identities to keep separate:

- kubeconfig **context** selects a cluster and default namespace;
- Helm **release name** identifies one installed release within a namespace;
- `vela-system` is the usual KubeVela control-plane namespace;
- `kubevela/vela-core` is a chart reference where `kubevela` is a local repository alias.

Confusing any two produces misleading results.

## Check the cluster before the namespace

```bash
kubectl config current-context
kubectl config view --minify --output 'jsonpath={..namespace}{"\n"}'
kubectl cluster-info
```

An empty namespace value normally means `default`. If installation happened from a different shell, CI runner, administrator account, or kubeconfig, compare API server endpoints rather than relying only on friendly context names.

Now search every namespace and include every release state:

```bash
helm list --all-namespaces --all
helm list --all-namespaces --all --filter '^kubevela$'
helm list --namespace vela-system --all
```

`--all-namespaces` changes namespace scope; `--all` includes statuses such as failed, pending, uninstalled, and superseded. Neither changes the selected cluster.

If you find the release, use the namespace from that row in every subsequent command:

```bash
helm status kubevela --namespace vela-system
helm history kubevela --namespace vela-system
helm get values kubevela --namespace vela-system --all
```

The chart column may be `vela-core-<version>` while the release name is `kubevela`. Searching only for a release literally called `vela-core` can therefore miss a normal installation.

## Search for a nonstandard release name

The official guide chooses `kubevela`, but Helm permits another release name:

```bash
helm list --all-namespaces --all --filter 'kubevela|vela-core|vela'
```

Treat the result as a lead, not proof. Inspect its chart metadata and manifests:

```bash
helm get metadata <release-name> --namespace <release-namespace>
helm get manifest <release-name> --namespace <release-namespace> | sed -n '1,40p'
```

Do not immediately install a second release called `kubevela`. Two KubeVela controllers and two charts trying to own cluster-scoped CRDs, webhooks, or shared resources can create a much harder recovery problem.

## Determine whether KubeVela was installed outside Helm

The `vela install` command installs or upgrades the KubeVela control plane, and standard installations use Helm machinery, but environments may have been bootstrapped by GitOps, rendered manifests, or a distribution-specific operator. Check the actual cluster state:

```bash
kubectl get namespace vela-system
kubectl get deployments,statefulsets,pods --namespace vela-system
kubectl get crd applications.core.oam.dev componentdefinitions.core.oam.dev
kubectl get deployment --all-namespaces \
  -l app.kubernetes.io/part-of=kubevela
```

Labels vary by chart and version, so also list resources directly when the label query is empty. If controllers and CRDs exist without a Helm record, identify their owner before adopting, upgrading, or deleting anything. A Helm install will not safely assume ownership of every pre-existing object.

For a Helm-managed release, release records normally appear as Secrets in the release namespace:

```bash
kubectl get secrets --all-namespaces \
  -l owner=helm,name=kubevela
```

This is a diagnostic check, not an invitation to edit or delete the Secrets. They contain Helm's release history. Manual changes can make rollback and upgrade impossible.

## Understand why repository commands do not show installations

These commands inspect the local Helm client, not releases in Kubernetes:

```bash
helm repo list
helm search repo kubevela/vela-core --versions
```

Adding `https://kubevela.github.io/charts` only teaches this user account where to download charts. It neither installs KubeVela nor proves a release exists. Conversely, a cluster can retain a healthy release even if a new workstation has no `kubevela` repository entry.

If the repository alias is absent, restore it for future upgrades:

```bash
helm repo add kubevela https://kubevela.github.io/charts
helm repo update kubevela
```

Do not infer the installed version from the newest search result. Read the release metadata, then follow the matching KubeVela upgrade documentation.

## Handle failed and uninstalled states safely

If `helm list -A --all` finds a failed or pending release, collect evidence:

```bash
helm status <release-name> --namespace <namespace> --show-resources
helm history <release-name> --namespace <namespace>
kubectl get events --namespace <namespace> --sort-by=.lastTimestamp
kubectl get pods --namespace <namespace> -o wide
```

A pending state may indicate an interrupted Helm operation; a failed state may reflect an admission denial, hook failure, image pull, unschedulable pod, or timeout. Reusing `helm install` will produce a name-in-use error and does not repair the underlying resource.

If the release was uninstalled with history retained, the name may remain in Helm history. Decide whether the intended action is rollback, upgrade/install, or a clean reinstall only after checking whether KubeVela Applications and cluster-scoped definitions remain. Never remove CRDs as a shortcut: deleting a CRD can delete all custom resources of that kind.

## Confirm KubeVela itself

After locating the release, verify more than its row in Helm:

```bash
vela version
vela system info
kubectl wait --namespace vela-system \
  --for=condition=Available deployment/kubevela-vela-core \
  --timeout=5m
```

Deployment names can differ with release name or chart version, so obtain the exact name with `kubectl get deployment -n vela-system` before using `kubectl wait`. Compare the CLI and core versions and consult version-specific docs when their capabilities differ.

## Official Documentation

- [Helm `list` command](https://helm.sh/docs/helm/helm_list/)
- [Helm 3 namespace-scoped release names](https://helm.sh/docs/faq/changes_since_helm2/#release-names-are-now-scoped-to-the-namespace)
- [Helm `status` command](https://helm.sh/docs/helm/helm_status/)
- [KubeVela installation on Kubernetes](https://kubevela.io/docs/installation/kubernetes/)
- [KubeVela `vela install` command](https://kubevela.io/docs/cli/vela_install/)
- [KubeVela system commands](https://kubevela.io/docs/cli/vela_system/)

## Conclusion

When `helm list` is empty, expand the investigation in the right order: verify the cluster, list all namespaces and statuses, search nonstandard release names, and then inspect actual controllers and CRDs. Repository state belongs to the local Helm client, while release state belongs to one Kubernetes namespace. Keeping those scopes distinct prevents accidental duplicate control planes and destructive “cleanup.”
