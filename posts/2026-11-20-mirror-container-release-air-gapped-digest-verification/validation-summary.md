# Validation review

Reviewed crane 0.20.6 pull/push implementations and OCI 1.1.1 layout/referrers documentation. The tutorial uses separate single-entry OCI directories and distinguishes directory input from archive formats.

## Checks

The pinned CLI passed an owned two-registry round-trip test after source shutdown. Both platform layers remained readable and the original index digest matched. A separate wrapper-index push produced a different digest. Shell examples passed bash syntax checks; seven diagram edges passed structural checks. The generated 1280x720 image was visually reviewed and its title is readable without clipping.

## Limits

The local registries used anonymous loopback HTTP. Production CA trust, authentication, signature handling, offline transfer approval, a real release inventory, and Kubernetes execution were not tested. Mermaid was not rendered. The article identifies these limits and requires a separate uncached staging acceptance test.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
