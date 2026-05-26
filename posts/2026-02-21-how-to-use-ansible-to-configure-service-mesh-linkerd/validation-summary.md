# Validation Summary: How to Use Ansible to Configure Service Mesh (Linkerd)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes
- Linkerd
- Linkerd Viz
- Linkerd SMI extension
- Gateway API
- ServiceProfile custom resources
- TrafficSplit custom resources
- Linkerd authorization policy custom resources

## Sources Consulted
- Linkerd Installing Linkerd documentation: https://linkerd.io/2-edge/tasks/install/
- Linkerd install CLI reference: https://linkerd.io/docs/reference/cli/install/
- Linkerd Viz CLI reference: https://linkerd.io/2-edge/reference/cli/viz/
- Linkerd Gateway API support documentation: https://linkerd.io/2-edge/features/gateway-api/
- Linkerd Traffic Split documentation: https://linkerd.io/docs/features/traffic-split/
- Linkerd SMI extension documentation: https://linkerd.io/docs/tasks/linkerd-smi/
- Linkerd Service Profiles reference: https://linkerd.io/2/reference/service-profiles/
- Linkerd Authorization Policy reference: https://linkerd.io/2.18/reference/authorization-policy/
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html

## Issues Found
- The prerequisites omitted `PyYAML` and `jsonpatch`, which are documented requirements for `kubernetes.core.k8s`. Added them to the `pip install` command.
- The Linkerd install defaults referenced a stale fixed version variable that was not used, and the install task downloaded `install-edge` but ran a different installer URL. Replaced this with a single `linkerd_install_url` using the current Linkerd edge installer path.
- Current Linkerd installs require compatible Gateway API CRDs when the cluster does not already provide them. Added an optional Gateway API CRD download and apply step.
- The Ansible `kubernetes.core.k8s` examples passed multi-document YAML output from `linkerd install` and `linkerd viz install` directly as strings. Updated those calls to parse the generated manifests with `from_yaml_all`, matching the Ansible module documentation.
- The control plane install used Helm-style `--set proxy.resources...` values for proxy resources. Replaced those with the documented Linkerd CLI flags `--proxy-cpu-request` and `--proxy-memory-request`.
- The TrafficSplit section described SMI TrafficSplit as the normal Linkerd approach. Updated it to note that SMI TrafficSplit and `linkerd-smi` are deprecated, added optional `linkerd-smi` installation tasks, and gated TrafficSplit application on `linkerd_smi_enabled`.
- The ServiceProfile task referenced an undefined `route` variable. Changed the task to pass `item.routes` directly into the ServiceProfile spec.
- The authorization policy example used `policy.linkerd.io/v1beta2` for `AuthorizationPolicy`, but Linkerd documents `AuthorizationPolicy` and `MeshTLSAuthentication` under `policy.linkerd.io/v1alpha1`. Corrected the API version and added a MeshTLSAuthentication resource task.
- The verification playbook used `linkerd stat deploy -n ... --from 0s`, which does not match the current Linkerd CLI. Updated it to `linkerd viz stat deploy -n ... --time-window 15s`.
- The conclusion called Linkerd resources "standard Kubernetes resources." Corrected this to "Kubernetes custom resources" because TrafficSplit, ServiceProfile, Server, AuthorizationPolicy, and MeshTLSAuthentication require CRDs.

## Review Notes
ServiceProfiles and SMI TrafficSplit remain supported for compatibility paths but are no longer the preferred direction in current Linkerd documentation. Future updates should consider replacing those examples with Gateway API HTTPRoute-based dynamic request routing and per-route metrics.
