# Validation review

Reviewed official iputils and iproute2 manuals, CNI VLAN v1.8.0 source, Cilium overhead guidance, RFC1191/8201 and Linux offload documentation. Shell syntax and packet-size arithmetic passed local checks. The seven-node, seven-edge diagram was structurally checked. The generated social image was visually reviewed and its title is readable.

No network probes or live cluster tests were performed. Examples require Linux iputils, approved peers, suitable permissions and actual deployment addresses. The overhead example is explicitly scoped; VLAN frame overhead is distinguished from IP MTU.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
