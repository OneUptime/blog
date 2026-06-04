# Validation Summary: How to Use ksniff for Capturing Pod Network Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- kubectl plugins
- ksniff
- tcpdump and BPF capture filters
- Wireshark, TShark, and capinfos
- Istio sidecar proxy ports
- Kubernetes Pod Security Admission

## Sources Consulted
- ksniff GitHub README and usage documentation: https://github.com/eldadru/ksniff
- ksniff plugin manifest flags: https://github.com/eldadru/ksniff/blob/master/plugin.yaml
- Kubernetes PodSecurityPolicy documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Istio application requirements and sidecar proxy ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Wireshark TShark manual page and display filter fields: https://www.wireshark.org/docs/man-pages/tshark.html

## Issues Found
- The post said ksniff always temporarily deploys a privileged container on the target node. Updated this to match ksniff's documented default behavior: it uploads and runs a statically compiled tcpdump binary in the target pod, while `-p` enables the privileged helper-pod mode.
- The basic capture explanation described privileged sniffer deployment as part of the default command. Reworded it to describe target container selection and tcpdump capture from the pod network namespace.
- The container-specific capture section implied that `-c` isolates one container's traffic. Corrected this because containers in a normal Kubernetes pod share the same network namespace; `-c` selects where ksniff runs or attaches, not a separate per-container network stream.
- The image override examples used `-i` for container images. Corrected these to use `--tcpdump-image` with `-p`; in ksniff usage, `-i` is the interface selector.
- The privileged mode section said privileged mode was the default and could be disabled with `--privileged=false`. Corrected it to show `-p` as the explicit privileged mode and the command without `-p` as the default path.
- The post recommended production use without noting the upstream warning. Added the ksniff project's production-readiness caveat.
- The troubleshooting section referenced PodSecurityPolicy and `kubectl get psp`, but PodSecurityPolicy was deprecated in Kubernetes v1.21 and removed in v1.25. Updated the commands to check pod creation permissions and Pod Security Admission namespace labels.
- The command labeled "Count packets by protocol" parsed a tcpdump source field rather than protocols. Replaced it with a TShark protocol-column command.
- The command labeled "Find retransmissions" counted SYN packets, not retransmissions. Replaced it with a TShark display filter for `tcp.analysis.retransmission`.

## Review Notes
The Istio sidecar port references for 15001 outbound and 15006 inbound match Istio's current application requirements documentation. The post remains a practical tutorial, but ksniff upstream has not had a recent release and explicitly says it is not production ready, so readers should validate it in their cluster before operational use.
