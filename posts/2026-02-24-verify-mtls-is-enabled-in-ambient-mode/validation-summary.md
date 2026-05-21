# Validation Summary: How to Verify mTLS is Enabled in Ambient Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ambient mode
- ztunnel
- HBONE
- Mutual TLS (mTLS)
- Kubernetes
- PeerAuthentication
- Prometheus metrics
- Kiali
- tcpdump

## Sources Consulted
- Istio ambient guide, "Verify mutual TLS is enabled": https://istio.io/latest/docs/ambient/usage/verify-mtls-enabled/
- Istio `istioctl` command reference for `ztunnel-config`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio ambient guide, "Add workloads to the mesh": https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio ztunnel troubleshooting guide: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio CNI node agent documentation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio ambient Helm install documentation for ztunnel DaemonSet behavior: https://istio.io/latest/docs/ambient/install/helm/

## Issues Found
- The ztunnel log example used `connection_security_policy="mutual_tls"` as a log field. Istio's ambient documentation shows this label in Prometheus metrics, while ztunnel access logs validate mTLS through HBONE addressing and source/destination SPIFFE identities. Updated the log example and explanation accordingly.
- The certificate example used `STATUS` value `Active`. Current Istio ztunnel certificate examples use `Available`. Updated the sample output and explanatory text.
- The packet-capture example implied that any plaintext HTTP between pod IPs means mTLS is not working. In ambient mode, local application-port traffic can appear before ztunnel captures and tunnels it, while the ztunnel-to-ztunnel path should be encrypted HBONE on port `15008`. Updated the tcpdump command and explanation to focus on application and HBONE ports.
- The quick-check section implied that `HBONE` alone proves plaintext rejection. Added a note that `HBONE` confirms HBONE configuration, while `PeerAuthentication` in `STRICT` mode is needed to verify rejection of plaintext bypass traffic.

## Review Notes
The remaining commands and configuration snippets are consistent with current Istio ambient documentation. The Prometheus command assumes a Prometheus deployment containing `promtool`; the official Istio docs more commonly show `istioctl dashboard prometheus`, but the PromQL metric and `connection_security_policy="mutual_tls"` label are valid for the described check.
