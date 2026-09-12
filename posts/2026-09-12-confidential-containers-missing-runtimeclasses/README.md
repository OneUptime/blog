# Confidential Containers Installed but No RuntimeClasses Appear

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Confidential Containers, Kubernetes, Kata Containers, Troubleshooting, Security

Description: Trace missing CoCo RuntimeClasses through legacy operator resources, node installation daemons, and the current Helm deployment workflow.

---

A running Confidential Containers controller does not prove that the worker runtime was installed. A RuntimeClass is a Kubernetes object that selects a runtime handler; the corresponding handler also has to exist on the nodes where its pods run. When `kubectl get runtimeclass` returns nothing, find the missing installation stage before creating objects manually.

There is a version distinction to establish first. The upstream CoCo operator is deprecated, and the recommended installation now uses Helm. This runbook covers recovery of existing operator deployments as well as identifying a Helm installation. The legacy details reference the archived operator at commit `c8cace7d`. [Operator deprecation notice](https://github.com/confidential-containers/operator/blob/c8cace7d8766dc6ac801053525b6f931569736bc/README.md)

## Identify What Was Installed

Start with a read-only inventory:

```bash
kubectl config current-context
kubectl get runtimeclass
kubectl get crd ccruntimes.confidentialcontainers.org
kubectl get deployments,daemonsets,pods -A | rg 'coco|confidential|cc-operator|kata'
helm list -A
```

A missing CRD is expected for a clean Helm deployment. A CRD that exists does not establish that the operator still owns the runtime; it could be a remnant of a migration. Check controller images, Helm releases, and owner references before choosing a recovery path.

For Helm, inspect the actual release name and namespace returned above:

```bash
helm status coco -n coco-system
helm get values coco -n coco-system --all
helm get manifest coco -n coco-system
kubectl get pods,daemonsets -n coco-system -o wide
```

The current installation guide describes `coco-system` and architecture-dependent RuntimeClasses. A peer-pod deployment and a bare-metal x86 deployment should not necessarily expose the same names. Compare the rendered release with the selected platform instead of treating an old screenshot as the desired inventory. [Current installation](https://confidentialcontainers.org/docs/getting-started/installation/)

## Verify the Legacy Custom Resource

For an operator installation, query both the schema and its instances:

```bash
kubectl get ccruntimes.confidentialcontainers.org -A
kubectl explain ccruntimes.confidentialcontainers.org.spec --recursive
kubectl get ccruntimes.confidentialcontainers.org -A -o yaml
kubectl get pods -n confidential-containers-system
```

The operator installation has two distinct actions: install the controller and create a `CcRuntime`. Creating the custom resource triggers installation of runtime components and RuntimeClasses. Installing only the controller leaves that second step undone. [Legacy installation procedure](https://github.com/confidential-containers/operator/blob/c8cace7d8766dc6ac801053525b6f931569736bc/docs/INSTALL.md)

If the custom resource is missing, recover the versioned manifest from the deployment repository. Use the same release as the controller, rather than mixing a newer sample with an older CRD. Render it before applying:

```bash
# Set this to the exact tag already installed in this cluster.
RELEASE_VERSION='v0.15.0'
kubectl kustomize \
  "github.com/confidential-containers/operator/config/samples/ccruntime/default?ref=${RELEASE_VERSION}" \
  > recovered-ccruntime.yaml
kubectl diff -f recovered-ccruntime.yaml
```

The release value above is an example to replace, not an upgrade recommendation. Review the runtime payload image, node selection, and install type in the resulting file. Apply the recovered resource only after those settings match the existing deployment.

## Follow Installation onto the Intended Node

In the legacy flow, controller health and node-daemon health are separate signals. Discover the actual objects rather than assuming a generated pod suffix:

```bash
kubectl get daemonsets -n confidential-containers-system -o wide
kubectl get pods -n confidential-containers-system -o wide
kubectl get nodes --show-labels
kubectl get events -n confidential-containers-system \
  --sort-by=.metadata.creationTimestamp
```

Compare a daemon's desired count with the intended worker count. A desired count of zero points toward node selection or scheduling. A nonzero desired count with unavailable pods points toward a different problem, such as image access, admission, a host mount, or the installation process itself.

The historical default selects workers using `node.kubernetes.io/worker`. Verify the selector in your actual custom resource and daemon before adding labels. Labeling every node to make the count increase can install a runtime onto machines that cannot support it.

Then describe the failing pod and read its relevant container logs:

```bash
kubectl describe pod INSTALL_POD -n confidential-containers-system
kubectl logs INSTALL_POD -n confidential-containers-system \
  --all-containers --timestamps --tail=200
kubectl logs CONTROLLER_POD -n confidential-containers-system \
  --all-containers --timestamps --tail=200
```

Look for the earliest install error, not only the latest retry. A forbidden Kubernetes API operation requires correcting the versioned RBAC resources. A payload download failure requires checking registry credentials, egress, and the exact image reference. A container runtime configuration failure requires examining the node's active containerd configuration and installation logs.

## Verify Both Ends of Runtime Selection

Once RuntimeClasses appear, inspect their handlers and scheduling constraints:

```bash
kubectl get runtimeclass -o custom-columns=NAME:.metadata.name,HANDLER:.handler
kubectl get runtimeclass kata-qemu-snp -o yaml
```

On an intended worker, inspect the configuration used by the running containerd service. Distribution-specific paths matter: editing `/etc/containerd/config.toml` is ineffective if the service starts with another configuration file. Match the RuntimeClass handler to the runtime definition, shim, and Kata configuration path.

Kubernetes assumes RuntimeClass support across nodes unless scheduling constraints narrow it. A class that exists globally can still fail on an unprepared worker. Test a disposable public-image pod on one prepared worker, then validate attestation before treating the runtime as confidential. [Kubernetes RuntimeClass scheduling](https://kubernetes.io/docs/concepts/containers/runtime-class/)

## Conclusion

Missing RuntimeClasses usually reveal an incomplete deployment stage. Establish whether Helm or the legacy operator owns the installation, verify the custom resource when applicable, follow the node daemon, and confirm the handler on the selected worker. Keep migration to Helm deliberate so that two installers do not compete for the same runtime files.

## Official Documentation

- [CoCo operator archive and deprecation](https://github.com/confidential-containers/operator/blob/c8cace7d8766dc6ac801053525b6f931569736bc/README.md)
- [Legacy operator installation](https://github.com/confidential-containers/operator/blob/c8cace7d8766dc6ac801053525b6f931569736bc/docs/INSTALL.md)
- [Current CoCo installation](https://confidentialcontainers.org/docs/getting-started/installation/)
- [Kubernetes RuntimeClass](https://kubernetes.io/docs/concepts/containers/runtime-class/)
