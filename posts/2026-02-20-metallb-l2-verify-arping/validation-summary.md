# Validation Summary: How to Verify MetalLB L2 Advertisement with arping

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- MetalLB Layer 2 mode
- ARP and gratuitous ARP
- Linux `arping`
- `tcpdump`
- `kubectl`

## Sources Consulted
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB troubleshooting guide: https://metallb.io/troubleshooting/index.html
- MetalLB configuration guide: https://metallb.io/configuration/
- `iputils` `arping(8)` manual: https://man.archlinux.org/man/arping.8.en
- Homebrew `arping` formula: https://formulae.brew.sh/formula/arping
- Thomas Habets `arping` manual: https://www.habets.pp.se/synscan/docs/arping.8.html

## Issues Found
- The post installed Homebrew `arping` on macOS but used Linux `iputils` option names throughout. I added a short note that the Homebrew implementation is different and users should check its man page for option names.
- The quick reference used `-S <src-ip>` for the specific source IP example. For Linux `iputils` `arping`, the source IP option is lowercase `-s`, so I changed the example to `-s <src-ip>`.
- The `kubectl get nodes -o wide` comment said it lists node MAC addresses. It lists node details such as names and IPs, not interface MAC addresses, so I changed the comment to say it helps identify the nodes whose host interfaces should be checked.
- The changing-MAC explanation attributed alternating replies only to unstable leader election. MetalLB troubleshooting documents multiple possible causes, including multiple speakers replying, IP conflict, or CNI ARP responses, so I broadened the explanation.
- The gratuitous ARP explanation said the purpose was to update switch MAC tables. MetalLB documents this primarily as updating client neighbor caches, so I corrected that wording.
- The script comment said it returns exit code 1 on failure, but the script uses exit code 1 for partial replies and 2 for no replies. I corrected the comment.

## Review Notes
The overall MetalLB Layer 2 behavior, need for an `L2Advertisement`, `arping` use from the same L2 subnet, and `tcpdump` troubleshooting workflow match the official MetalLB documentation. The examples are Linux `iputils` oriented; macOS users with Homebrew `arping` will need implementation-specific option names.
