# Validation Summary: Test Static Pod IPs in Calico Before Production

## Status
validated

## Post Type
Tutorial / Testing guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes `kubectl`
- Calico IPAM
- Calico IPPool resources
- `calicoctl`

## Sources Consulted
- Calico documentation: Use a specific IP address with a pod - https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico documentation: Configure the Calico CNI plugins - https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico documentation: IPPool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: `calicoctl apply` - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: `calicoctl ipam show` - https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Kubernetes documentation: `kubectl run` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The prerequisites only said Calico must be installed. Calico's static IP annotation requires Calico IPAM, so the prerequisite now explicitly requires Calico IPAM to be enabled.
- The IPPool example used a static-looking pool without reserving it from automatic allocation. Calico documentation notes that addresses in a normal IPPool may be used automatically for workloads or tunnel addresses. Added `nodeSelector: "!all()"` and `allowedUses: [Workload]` so the pool is reserved for manual/static workload assignment.
- The IPPool example did not state that the CIDR must be within the cluster pod CIDR. Added that requirement to the inline comment because Kubernetes components expect pod IPs to belong to the configured pod CIDR.
- The drain-based scenario was described as a node failure test, but `kubectl cordon` and `kubectl drain` perform a controlled node evacuation. Updated the wording to "node evacuation" and "evacuation recovery" so the scenario matches the commands.

## Review Notes
- The `cni.projectcalico.org/ipAddrs` annotation, `calicoctl apply -f`, `calicoctl ipam show --ip`, and `kubectl run --overrides` usage are consistent with current official documentation.
- The example uses `allowedUses`, which is supported in modern Calico releases. Older Calico releases before this IPPool field was introduced may need a version-specific alternative.
