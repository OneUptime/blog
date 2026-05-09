# Validation Summary: How to Troubleshoot Calico Cluster-Wide Networking Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Tigera Operator
- Kubernetes
- calicoctl
- TigeraStatus
- Calico IPAM
- Typha
- calico-kube-controllers

## Sources Consulted
- Calico Open Source documentation: Troubleshooting commands - https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Calico Open Source documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico Open Source documentation: calicoctl cluster diags - https://docs.tigera.io/calico/latest/reference/calicoctl/cluster/diags
- Calico Open Source documentation: TigeraStatus installation API reference - https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Open Source documentation: Component architecture - https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico Open Source documentation: Configuring the Calico Kubernetes controllers - https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Calico Open Source documentation: Configuring Felix Typha settings - https://docs.tigera.io/calico/latest/reference/felix/configuration

## Issues Found
- The `calicoctl ipam show --show-blocks | grep "100%"` command could match pools or blocks that are 100% free, not only exhausted pools or blocks. Changed it to match rows with 100% in use and 0% free.
- The command `kubectl get tigerastatus kube-controllers -o yaml` referenced a TigeraStatus resource that is not a standard Calico Open Source TigeraStatus component. Changed it to `kubectl get tigerastatus calico -o yaml`, which is the operator-managed Calico component status that includes the core Calico deployment.
- The conclusion said IPAM exhaustion causes pods to fail to schedule. In Kubernetes, the scheduler can bind the pod first, then CNI/IPAM setup can fail while the pod remains in ContainerCreating. Updated the wording to describe CNI setup failure more accurately.

## Review Notes
The commands assume an operator-managed Calico installation using the `calico-system` namespace. Calico documentation notes that manifest-based installations commonly use `kube-system` instead.
