# Validation Summary: Avoiding Common Mistakes with Calicoctl Kubernetes API Datastore Configuration

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes API datastore
- Kubernetes RBAC
- Kubernetes kubeconfig contexts
- Calico NetworkPolicy and GlobalNetworkPolicy resources

## Sources Consulted
- Calico documentation: Configure calicoctl to connect to the Kubernetes API datastore, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/kdd
- Calico documentation: Configure calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico documentation: Install calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: calicoctl user reference, https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl apply, https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl validate, https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico documentation: calicoctl version, https://docs.tigera.io/calico/latest/reference/calicoctl/version
- Calico documentation: Resource definitions, https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico documentation: Global network policy, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy

## Issues Found
- The post stated that missing `DATASTORE_TYPE` may default to `etcdv3`. Current Calico documentation says calicoctl defaults to the Kubernetes API datastore, so the text and diagram were changed to describe unexpected datastore configuration from an existing config file or environment variable instead.
- The RBAC check used `globalnetworkpolicies.projectcalico.org`, which can be wrong for the Kubernetes datastore CRDs. The examples now use `globalnetworkpolicies.crd.projectcalico.org`.
- The ClusterRoleBinding example used `kubectl config current-context` as the `--user` value, but that command returns the context name, not the user. It was replaced with a jsonpath expression that reads the current context's configured user.
- The post described kubectl usage for Calico resources as always wrong. Current Calico documentation notes that newer Calico API server installations can use kubectl for most operations, so the wording was narrowed to warn about using kubectl directly against low-level CRDs without Calico API server validation/defaulting.

## Review Notes
The remaining command examples and Calico resource snippets are consistent with the current calicoctl and Calico resource documentation. The `calico-system` namespace and `calico/node` image lookup are installation-dependent; they are plausible for Tigera operator installs, but clusters installed with other manifests may use a different namespace such as `kube-system`.
