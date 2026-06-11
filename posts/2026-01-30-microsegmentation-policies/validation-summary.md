# Validation Summary: How to Create Microsegmentation Policies

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes labels and namespace selectors
- Istio AuthorizationPolicy
- Istio PeerAuthentication and mTLS
- iptables
- nftables
- systemd unit files
- Bash connectivity testing with `nc`, `curl`, and `nslookup`
- `kubectl` inspection commands

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- nftables `nft` manual: https://www.netfilter.org/projects/nftables/manpage.html
- iptables manual: https://man7.org/linux/man-pages/man8/iptables.8.html

## Issues Found
- The three-tier frontend policy used a non-standard namespace label, `name: ingress-nginx`, to select the ingress controller namespace. Changed it to Kubernetes' built-in namespace label, `kubernetes.io/metadata.name: ingress-nginx`, so the selector works on standard Kubernetes namespaces.
- The cross-namespace policy comment said all other cross-namespace traffic remains blocked, but the policy only defines ingress behavior for selected production pods. Changed the comment to "inbound cross-namespace traffic" to match Kubernetes NetworkPolicy semantics.
- The Istio PeerAuthentication example included `selector: {}` while describing a namespace-wide policy. Removed the empty selector and left the namespace-wide form shown in Istio's official examples.
- Several DNS allow rules only permitted UDP/53. Added TCP/53 alongside UDP/53 so DNS continues to work for responses and resolvers that require TCP fallback.
- The service-based NetworkPolicy example claimed it used Kubernetes service accounts, but Kubernetes NetworkPolicy does not select service accounts directly. Changed the comment to say it uses Kubernetes labels, matching the actual `podSelector` rules.

## Review Notes
All YAML snippets parse successfully with PyYAML after the edits. `kubectl` was not installed in the local environment, so server-side Kubernetes schema validation was not run. `nft --check` was available but could not complete in this environment because netfilter operations require privileges; the nftables syntax was checked against the official `nft` manual instead.
