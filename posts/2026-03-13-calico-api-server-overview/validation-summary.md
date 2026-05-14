# Validation Summary: How to Understand the Calico API Server

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Calico API server
- Kubernetes API aggregation layer
- Kubernetes CRDs
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Enable kubectl to manage Calico APIs, https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico documentation: Enable native v3 CRDs, https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico documentation: Component architecture, https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico documentation: Install calicoctl, https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: API Aggregation Layer, https://kubernetes.io/docs/concepts/api-extension/apiserver-aggregation/

## Issues Found
- The post described the aggregated Calico API server as the generally recommended production path. Current Calico documentation marks `calico-apiserver` as deprecated and recommends native `projectcalico.org/v3` CRDs for new installations, so the introduction, best practices, and conclusion were updated.
- The post implied `projectcalico.org/v3` is unavailable without the aggregated API server. Current Calico releases can expose native `projectcalico.org/v3` CRDs without the aggregated API server, so the relevant sections and comparison table were corrected.
- The post treated `crd.projectcalico.org/v1` as a normal management API. Calico documentation cautions that this group is an internal representation and should not be modified directly, so the wording was changed to describe it as an internal backing API.
- The post said Calico Open Source can deploy the API server with `calicoctl install apiserver`. Current Calico documentation uses an `operator.tigera.io/v1` `APIServer` resource for operator installs or the `apiserver.yaml` manifest for non-operator installs, so the install description was corrected.
- The pod check used `kubectl get pods -n calico-system -l k8s-app=calico-apiserver`. Current Calico API server manifest documentation uses the `calico-apiserver` namespace, so the command was corrected to `kubectl get pods -n calico-apiserver`.
- The APIService check used a broad `grep calico`; this was tightened to `kubectl get apiservice v3.projectcalico.org`, matching the actual registered APIService name.
- The `calicoctl get networkpolicies --all-namespaces` example used a plural resource name. Official examples use `calicoctl get networkpolicy --all-namespaces`, so the command was corrected.
- The benefits section claimed full admission webhook support from the API server. Calico documentation describes API-server-mode validation and defaulting as server-side API behavior, so the wording was corrected.

## Review Notes
Native `projectcalico.org/v3` CRDs are documented as tech preview in current Calico documentation, and there are behavioral differences from API server mode such as asynchronous IPPool CIDR overlap validation. The post now notes the native CRD direction but does not go deep into migration details.
