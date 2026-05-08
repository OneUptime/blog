# Validation Summary: How to Use calicoctl ipam configure with Practical Examples

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Calico IPAM
- Kubernetes
- IPAMConfiguration resources
- Shell scripting

## Sources Consulted
- Calico documentation: calicoctl ipam configure, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/configure
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: IPAMConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/ipamconfig
- Calico documentation: Get started with IP address management, https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico source: calicoctl IPAM configure command, https://github.com/projectcalico/calico/blob/master/calicoctl/calicoctl/commands/ipam/configure.go
- Calico source: calicoctl IPAM show command, https://github.com/projectcalico/calico/blob/master/calicoctl/calicoctl/commands/ipam/show.go
- Calico source: IPAM configuration behavior, https://github.com/projectcalico/calico/blob/master/libcalico-go/lib/ipam/ipam.go

## Issues Found
- The post used `calicoctl ipam configure show`, but current `calicoctl ipam configure` does not have a `show` subcommand. Replaced those examples with the documented `calicoctl ipam show --show-configuration`.
- The post described the setting as reserving IP addresses per node. Updated this to describe `maxBlocksPerHost` accurately as the maximum number of IP blocks that can be affine to a node.
- The `IPAMConfiguration` example set `maxBlocksPerHost` while `strictAffinity` was false. Calico rejects positive `MaxBlocksPerHost` unless strict affinity is enabled, so the example now sets `strictAffinity: true`.
- The post claimed `maxBlocksPerHost: 0` means unlimited. Updated this to state that `0` means no explicit global limit is set and that Calico's allocation logic still applies its default safeguard when needed.
- The planning script parsed the removed `calicoctl ipam configure show` output. Updated it to read `maxBlocksPerHost` from the `IPAMConfiguration` resource YAML.
- The troubleshooting section used incorrect casing for `maxBlocksPerHost` and incorrectly suggested Felix restart as the remedy for IPAM configuration not taking effect. Updated the casing and replaced the restart advice with datastore/configuration verification steps.

## Review Notes
The post is technically relevant and salvageable. Calico's current docs recommend `kubectl` for many Calico API resource operations when the Calico API server is installed, but `calicoctl` remains required for `calicoctl ipam` subcommands, so the post's focus remains appropriate.
