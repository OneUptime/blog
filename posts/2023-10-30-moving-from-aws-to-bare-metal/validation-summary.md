# Validation Summary: How moving from AWS to Bare-Metal saved us $230,000 /yr.

## Status
not-code-blog

## Post Type
Company update / opinion piece (infrastructure migration story). It narrates OneUptime's move from AWS EKS to a bare-metal MicroK8s cluster in a colocation facility, with high-level technology descriptions but no code, commands, or configuration snippets.

## Technologies Covered
- AWS (EKS, m7a EC2 instances)
- Kubernetes
- MicroK8s
- Helm
- Ceph / MicroCeph (rook-ceph addon)
- MetalLB
- Docker, Redis, Postgres, ClickHouse, NodeJS, BullMQ (mentioned as the OneUptime stack)

## Sources Consulted
- MicroK8s rook-ceph addon docs: https://canonical.com/microk8s/docs/addon-rook-ceph (original link https://microk8s.io/docs/addon-rook-ceph 301-redirects here)
- MicroK8s MetalLB addon docs: https://canonical.com/microk8s/docs/addon-metallb (original link https://microk8s.io/docs/addon-metallb 301-redirects here)
- MetalLB project documentation (load-balancer for bare-metal Kubernetes using ARP/NDP and BGP routing)
- AWS EC2 instance type families (m7a = AMD EPYC general-purpose, a real and current family)

## Issues Found
No technical issues found. The post contains no code, commands, or configuration to verify. The high-level technical claims that could be checked are accurate:
- The two MicroK8s documentation URLs are valid (they redirect from microk8s.io to canonical.com but resolve to the correct addon pages).
- MicroCeph storage and the rook-ceph addon are correctly described; the MicroK8s docs reference MicroCeph integration.
- MetalLB is correctly described as a bare-metal load-balancer using standard routing protocols.
- `m7a` is a real AWS EC2 instance family.
- Kubernetes and Helm descriptions are accurate.

## Review Notes
- The financial figures ($38k/mo AWS, $150k cap-ex, $5,500/mo op-ex, $230k/yr savings, 28-node cluster) are company-specific and not externally verifiable; they are internally consistent and plausible, so no changes were made.
- The original microk8s.io documentation links still work via 301 redirect to canonical.com. They are not broken, but a future update could point directly to the canonical.com URLs to avoid the redirect hop.
- No fixes were applied since the post is a narrative company update without code or config to correct.
