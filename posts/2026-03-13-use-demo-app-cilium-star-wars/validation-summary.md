# Validation Summary: How to Use the Demo Application in the Cilium Star Wars Demo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cilium
- Kubernetes
- CiliumNetworkPolicy
- eBPF networking
- L3/L4 network policy
- L7 HTTP policy
- kubectl

## Sources Consulted
- Cilium official documentation: Getting Started with the Star Wars Demo, https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium official command reference: cilium-dbg monitor, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium official troubleshooting documentation for monitor usage, https://docs.cilium.io/en/stable/operations/troubleshooting/
- Kubernetes official kubectl wait reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Cilium official example manifests in GitHub, https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/http-sw-app.yaml
- Cilium official L3/L4 policy manifest, https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/sw_l3_l4_policy.yaml
- Cilium official L3/L4/L7 policy manifest, https://raw.githubusercontent.com/cilium/cilium/HEAD/examples/minikube/sw_l3_l4_l7_policy.yaml

## Issues Found
- The Step 1 comment said to create the demo namespace, but the command applies Cilium's Star Wars demo manifests in the default namespace and does not create a namespace. Changed the comment to say it deploys the demo application in the default namespace.
- The monitoring step used `cilium monitor --type drop` while triggering an L7 HTTP denial. Current Cilium documentation uses `cilium-dbg monitor`; the Star Wars L7 denial is observed with L7 events rather than drop-only events. Updated the command to select a Cilium pod and run `cilium-dbg monitor -v --type l7`.

## Review Notes
- The tutorial uses `HEAD` URLs for Cilium example manifests. These URLs are valid and point to the current upstream examples, but they are moving targets; pinning to a Cilium release tag would make the post more reproducible over time.
