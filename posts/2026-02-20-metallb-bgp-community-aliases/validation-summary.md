# Validation Summary: How to Configure BGP Community Aliases in MetalLB

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Kubernetes
- MetalLB
- BGP
- BGP communities
- MetalLB `Community`, `IPAddressPool`, and `BGPAdvertisement` custom resources
- kubectl

## Sources Consulted
- MetalLB Configuration documentation: https://metallb.io/configuration/
- MetalLB Advanced BGP configuration documentation: https://metallb.io/configuration/_advanced_bgp_configuration/
- MetalLB API reference: https://metallb.io/apis/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- RFC 1997, BGP Communities Attribute: https://www.rfc-editor.org/rfc/rfc1997.html
- RFC 8092, BGP Large Communities Attribute: https://www.rfc-editor.org/rfc/rfc8092.html

## Issues Found
- The post stated that MetalLB custom resources must be in the `metallb-system` namespace. MetalLB's official documentation says resources should be created in the same namespace where MetalLB is deployed, which is typically `metallb-system` but can differ for Helm installs. Updated the wording accordingly.
- The active/backup example created two advertisements for the same pool without scoping them to different BGP peers or nodes. That can apply overlapping advertisements to the same peer set instead of expressing a primary/backup policy. Updated the examples to include `peers` fields for primary and backup BGPPeers.
- The backup advertisement YAML was shown but not applied. Added the missing `kubectl apply -f bgp-advertisement-backup.yaml` command.

## Review Notes
The CRD API versions, field names, standard community examples, large community format, and kubectl command forms are current and consistent with the official documentation. The example assumes existing BGPPeer resources named `primary-router` and `backup-router`; the post already notes that a working BGPPeer session is required.
