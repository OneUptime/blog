# Validation Summary: How to Debug Storage Connectivity Issues with Istio

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio sidecar mode
- Envoy proxy configuration
- Kubernetes Services, Pods, NetworkPolicies, and DNS
- Istio mTLS and PeerAuthentication
- istioctl and kubectl troubleshooting commands

## Sources Consulted
- Istio Protocol Selection: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio Application Requirements: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio resource annotations and labels reference: https://istio.io/latest/docs/reference/config/annotations/ and https://istio.io/latest/docs/reference/config/labels/
- Istio mesh ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The `kubectl run` example used `--annotations`, which is not a current `kubectl run` flag. Changed it to use the documented pod label `sidecar.istio.io/inject=false` and added `--restart=Never` for the one-off interactive debug pod.
- The sidecar injection test was described as disabling injection on the storage pod, but the command creates a separate test client pod. Reworded the explanation to match the command.
- The protocol selection section overstated that an unprefixed port name would make Istio parse the database protocol as HTTP. Updated it to match Istio's documented behavior: automatic detection treats traffic that is not detected as HTTP or HTTP/2 as plain TCP, while explicit `tcp` configuration avoids sniffing surprises.
- The Service example only used a `tcp-` port name. Added `appProtocol: tcp`, which Istio documents as supported on Kubernetes 1.18+ and as taking precedence over the port name.
- The mTLS check used `istioctl authn tls-check`, which is not present in the current istioctl reference. Replaced it with `istioctl x describe pod`, which the Istio docs use to detect mTLS enforcement and TLS conflicts.
- The PeerAuthentication example used `security.istio.io/v1beta1`. Updated it to the current documented API version, `security.istio.io/v1`.
- The iptables section stated that Istio always uses an init container. Updated it to account for Istio CNI, with the init container applying when CNI is not enabled.
- The DNS section said the sidecar needs to resolve the storage hostname. Reworded it to the application needing DNS resolution, which is the accurate troubleshooting target for Kubernetes Service names.

## Review Notes
Local `kubectl` and `istioctl` binaries were not available in the environment, so CLI verification was performed against the official generated command references and Istio documentation. Some examples, such as using `curl` or `iptables` inside `istio-proxy`, may still depend on the selected proxy image and pod permissions, especially with distroless images or restricted security contexts.
