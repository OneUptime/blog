# Validation Summary: How to Validate Cilium Status Checks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium CLI
- Cilium agent debug CLI (`cilium-dbg`)
- eBPF policy maps
- Hubble

## Sources Consulted
- Cilium CLI `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium end-to-end connectivity testing documentation: https://docs.cilium.io/en/stable/contributing/testing/e2e/
- Cilium `cilium-dbg status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg bpf policy get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium kube-proxy replacement documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post described `cilium status` as directly aggregating lower-level agent details such as BPF programs and the service load balancer. I clarified that `cilium status` reports cluster-level Cilium resource health, while `cilium-dbg status` is the documented command for agent-local details.
- The expected output used `KubeProxyReplacement: Strict`, which is outdated for current Cilium documentation. I changed it to `KubeProxyReplacement: True` for installations configured for full kube-proxy replacement.
- Several commands executed `cilium endpoint list`, `cilium status`, `cilium policy get`, and `cilium bpf policy get` inside the Cilium agent pod. Current Cilium command references document these agent-local operations under `cilium-dbg`, so I updated the commands accordingly.
- The endpoint count used `grep -c "ready"`, which would also count `not-ready`. I changed the count to use `cilium-dbg endpoint list --no-headers` and count only rows whose final field is exactly `ready`.
- The post said endpoint count should match running pods. I adjusted this to say it should be close to the number of pods managed by Cilium, because host-networked pods may not have Cilium endpoints and Cilium creates health endpoints that are not Kubernetes pods.
- The BPF policy map check counted `OK` strings from `cilium bpf policy get --all`, but the documented command dumps policy maps rather than reporting `OK` per map. I changed the check to verify that `cilium-dbg bpf policy get --all` returns successfully.

## Review Notes
The connectivity test commands are valid, but `--test` accepts regular expressions matching Cilium connectivity tests and scenarios, so the exact subset selected can vary by Cilium CLI version and enabled cluster features.
