# Validation Summary: Creating the Calico BlockAffinity Resource in Kubernetes

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Calico Open Source
- Calico BlockAffinity resources
- Calico IPAM
- Kubernetes custom resources
- kubectl
- calicoctl

## Sources Consulted
- Calico Open Source Block affinity resource reference: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico Open Source resource definitions overview: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico Open Source calicoctl configuration overview: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview
- Calico Open Source calicoctl install/API group notes: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico Open Source calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico Open Source calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico Open Source troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/

## Issues Found
- The original post claimed users should create and apply BlockAffinity resources manually. Calico documents BlockAffinity as an IPAM-managed resource, and the supported operation model is inspection rather than manual create/update/delete. I changed the post to describe inspecting and exporting existing BlockAffinity state.
- The manifest section described the example values as sensible defaults. These values are runtime IPAM state, so I changed the text to make clear that they are exported cluster data and should not be edited as normal configuration.
- The `kubectl apply` and `calicoctl apply` examples were incorrect for BlockAffinity resources. I replaced them with `kubectl get` and `calicoctl get` inspection commands.
- The verification commands implied a newly created resource and used an incomplete `kubectl describe` command. I changed the verification language and included a specific resource name in the describe example.
- The troubleshooting section recommended retrying manual apply operations and restarting Calico pods. I changed it to direct readers toward API discovery, generated-resource inspection, and `calicoctl ipam check`.
- The GitOps and naming guidance incorrectly implied BlockAffinity resources should be managed like user-owned Calico configuration. I clarified that IPPool and FelixConfiguration are suitable examples of user-managed configuration, while BlockAffinity is Calico-managed runtime state.
- The connectivity check used plain HTTP against `kubernetes.default.svc/healthz`, which is not a reliable success check for the Kubernetes API service. I changed it to a BusyBox DNS/service lookup.

## Review Notes
The post is now technically accurate as an inspection and troubleshooting guide. The file path and external blog title still reference "create" because that is the existing post slug, but the corrected article content no longer instructs readers to manually create BlockAffinity resources.
