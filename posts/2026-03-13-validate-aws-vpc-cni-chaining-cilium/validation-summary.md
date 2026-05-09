# Validation Summary: Validate AWS VPC CNI Chaining with Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- AWS VPC CNI
- Kubernetes
- Amazon EKS
- AWS CLI
- Hubble
- eBPF

## Sources Consulted
- Cilium AWS VPC CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-aws-cni/
- Cilium CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium command reference for cilium-dbg endpoint and BPF commands: https://docs.cilium.io/en/stable/cmdref/
- Cilium Layer 3 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Kubernetes kubectl debug documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes kubectl run documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- AWS CLI describe-subnets command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-subnets.html
- AWS CLI describe-network-interfaces command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-interfaces.html

## Issues Found
- The introduction described Cilium in AWS VPC CNI chaining as providing full L3/L4/L7 policy enforcement. Cilium's official AWS CNI chaining documentation notes that advanced features such as L7 policy may be limited in chaining mode, so the wording was narrowed to L3/L4 policy enforcement with a caveat for L7 limitations.
- The pod IP extraction command used the eighth column from `kubectl get pods -A -o wide`, which is the node column in the standard output, not the pod IP. It was changed to use `custom-columns=IP:.status.podIP`.
- The subnet lookup only matched cluster subnet tags with value `shared`. It was broadened to `shared,owned` so it also covers subnets owned by the cluster.
- The endpoint validation used `cilium endpoint list` as if it were a local Cilium CLI command. Current Cilium documentation exposes endpoint and BPF inspection through CiliumEndpoint resources and `cilium-dbg` inside Cilium agent pods, so the commands were updated to use `kubectl get ciliumendpoints` and `cilium-dbg bpf endpoint list`.
- The endpoint count comparison claimed an exact match with running pods. Cilium documents that CiliumEndpoint resources are created for Cilium-managed pods and may also include health endpoints, so the text now compares against non-hostNetwork pods and asks readers to investigate large gaps.
- The network policy test curled `policy-test-server.default.svc.cluster.local` but never created a Kubernetes Service. Added `kubectl expose pod policy-test-server --port=80 --name=policy-test-server` and cleanup for that Service.
- The Hubble example watched all flows while the text expected dropped policy flows. The command now uses `--verdict DROPPED` to match the validation goal.

## Review Notes
The post is technically relevant and accurate after the corrections. Future updates could mention that existing pods must be restarted after enabling Cilium chaining, because the Cilium AWS VPC CNI chaining documentation calls this out explicitly.
