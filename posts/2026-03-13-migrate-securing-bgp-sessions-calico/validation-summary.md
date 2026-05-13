# Validation Summary: How to Migrate to Secure BGP Sessions in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- BGP
- BGPPeer resources
- Kubernetes Secrets
- Kubernetes RBAC
- calicoctl

## Sources Consulted
- Calico documentation: Secure BGP sessions - https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- Calico documentation: BGPPeer resource - https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: Configure BGP peering - https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico documentation: Troubleshooting and diagnostics, BGP peer status - https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- RFC 2385: Protection of BGP Sessions via the TCP MD5 Signature Option - https://www.rfc-editor.org/rfc/rfc2385
- RFC 5925: The TCP Authentication Option - https://www.rfc-editor.org/rfc/rfc5925

## Issues Found
- The introduction stated that BGPPeer configures authentication and encryption settings. Calico BGP passwords authenticate BGP sessions but do not encrypt exchanged routing information, so the text was corrected to avoid implying encryption.
- The configuration example referenced a Kubernetes Secret from BGPPeer but did not grant the calico-node ServiceAccount permission to read it. Added the required Role and RoleBinding with get, list, and watch access to the named Secret.
- The Secret example used base64-encoded data while the command example created a Secret separately, creating an inconsistent workflow. Changed the manifest to use stringData and updated the command to apply the complete manifest with kubectl.
- The verification section used a direct bird cli command and assumed a specific protocol name. Replaced it with a Calico resource check that verifies the BGPPeer references the password Secret.
- The conclusion said BGP MD5 authentication prevents route injection attacks as an absolute guarantee. Adjusted the wording to "helps prevent" and used Calico's BGP password terminology.

## Review Notes
The example uses the kube-system namespace, which is valid for manifest-based Calico installs where calico-node runs there. Operator-based installs commonly run calico-node in calico-system; in that case, the Secret and RBAC resources must be created in calico-system instead.
