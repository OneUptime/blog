# Validation Summary: How to Debug mTLS Communication with tcpdump

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- Istio service mesh
- Istio mutual TLS
- tcpdump / libpcap capture filters
- Wireshark / tshark
- OpenSSL
- Linux network namespaces and nsenter
- CRI container runtimes / crictl

## Sources Consulted
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes ephemeral containers concept documentation: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes crictl node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/crictl/
- Kubernetes dockershim migration documentation: https://kubernetes.io/docs/tasks/administer-cluster/migrating-from-dockershim/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio plug in CA certificates task: https://istio.io/latest/docs/tasks/security/cert-management/plugin-ca-cert/
- RFC 8446, TLS 1.3: https://www.rfc-editor.org/rfc/rfc8446
- tcpdump manual page: https://www.tcpdump.org/manpages/tcpdump.1.html
- Wireshark tshark manual page: https://www.wireshark.org/docs/man-pages/tshark.html
- OpenSSL s_client help output from the local OpenSSL installation

## Issues Found
- The introduction said tcpdump can show what certificates are exchanged. This is not generally true for TLS 1.3 because certificate messages are encrypted. Updated the wording to say certificate inspection is available for older TLS handshakes or decrypted captures.
- The post described `tcpdump -i any -n 'tcp port 8080'` as filtering for TLS. That filter only selects TCP traffic on the service port. Updated the description.
- The Kubernetes debug examples did not request network-debugging privileges and did not name the debug container consistently. Added `--profile=netadmin` and `-c debug` where appropriate so tcpdump has the expected capabilities and `kubectl cp -c debug` matches the created container.
- The node-level `nsenter` example used `docker inspect`, which is stale for Kubernetes clusters using CRI runtimes after dockershim removal. Replaced it with `crictl inspect`.
- The TLS handshake analysis section implied tshark can always show server and client certificates. Updated it to clarify certificate messages are visible in TLS 1.2 captures or TLS 1.3 decrypted captures.
- The OpenSSL mTLS test used only `-CAfile`, which verifies the peer but does not provide a client certificate for a direct mTLS test. Updated the example to match Istio's documented sidecar-based certificate inspection and noted that direct application-container testing needs `-cert` and `-key`.
- The performance section said to remove the debug container when done. Kubernetes ephemeral containers cannot be removed after being added. Updated the guidance to stop the capture or delete a copied debug pod.
- The quick reference mapped "connection refused" to "No SYN-ACK". Corrected this to RST in response to SYN, and moved the no-response case to timeouts.

## Review Notes
The guide remains technically relevant. Packet captures inside an Istio-injected pod can include both application-to-sidecar plaintext and sidecar-to-sidecar encrypted traffic depending on interface, direction, and port, so future improvements could add capture-location examples for inbound, outbound, and loopback paths.
