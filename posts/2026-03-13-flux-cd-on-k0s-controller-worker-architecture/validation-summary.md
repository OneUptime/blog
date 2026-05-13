# Validation Summary: How to Set Up Flux CD on k0s with Controller-Worker Architecture

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- k0s
- Kubernetes
- Flux CD
- GitOps
- Kustomize
- Calico / CNI networking
- GitHub bootstrap workflow

## Sources Consulted
- k0s Configuration Options: https://docs.k0sproject.io/head/configuration/
- k0s Architecture: https://docs.k0sproject.io/v1.33.1+k0s.1/architecture/
- k0s FAQ on controller nodes and Kubernetes node listings: https://docs.k0sproject.io/v0.11.1/FAQ/
- k0s install controller CLI reference: https://docs.k0sproject.io/stable/cli/k0s_install_controller/
- k0s install worker CLI reference: https://docs.k0sproject.io/head/cli/k0s_install_worker/
- k0s token create CLI reference: https://docs.k0sproject.io/v1.33.3+k0s.0/cli/k0s_token_create/
- k0s kubectl CLI reference: https://docs.k0sproject.io/head/cli/k0s_kubectl/
- k0s Networking (CNI): https://docs.k0sproject.io/stable/networking/
- k0s Autopilot: https://docs.k0sproject.io/head/autopilot/
- Flux bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux bootstrap customization: https://fluxcd.io/flux/installation/configuration/bootstrap-customization/
- Flux GitOps Toolkit components: https://fluxcd.io/flux/components/
- Kubernetes Ports and Protocols: https://kubernetes.io/docs/reference/networking/ports-and-protocols/

## Issues Found
- The introduction overstated k0s as having no external dependencies and said workers run only kubelet and a container runtime. Updated this to "minimal external runtime dependencies" and listed worker components more accurately, including kube-proxy.
- The default configuration command wrote directly to `/etc/k0s/k0s.yaml` without root privileges. Added `sudo mkdir -p /etc/k0s` and `sudo tee`.
- k0s service installation, startup, status, and token commands require elevated privileges. Added `sudo` where appropriate.
- The controller verification step used `kubectl get nodes`, but controller-only k0s nodes do not run kubelet and do not appear in the Kubernetes node list. Replaced it with a Kubernetes API readiness check through `k0s kubectl`.
- The worker join instructions exported `JOIN_TOKEN` but then used `--token-file /etc/k0s/join-token`, so the token path was never created. Replaced this with commands that install the token file at `/etc/k0s/join-token`.
- The expected `kubectl get nodes` output showed a controller node, which is incorrect for the separated controller-worker architecture. Updated the example to show only worker nodes.
- The Flux node affinity example claimed to configure all Flux controllers but only patched `source-controller` and was not shown in Flux's bootstrap customization format. Replaced it with a `flux-system/kustomization.yaml` patch targeting all Flux deployments by label.
- The best practice about tainting controller nodes implied controller-only nodes accept workloads. Updated it to apply only when controllers are intentionally run with `--enable-worker`.
- The CNI guidance implied Cilium was an integrated k0s network provider. Clarified that Calico is integrated and Cilium would be used as a custom CNI.
- The control plane metrics guidance used an inaccurate port range. Replaced it with specific Kubernetes control plane ports for controller-manager and scheduler metrics endpoints.

## Review Notes
The tutorial is technically relevant and valid after the fixes. Future improvements could include adding a complete multi-controller HA example with a load balancer or k0s node-local load balancing, but that is beyond the scope of the current post.
