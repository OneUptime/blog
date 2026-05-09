# Validation Summary: How to Test Calico Policy Log Rules with Real Traffic in Calico

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico network policy
- Calico Policy Log rules
- Kubernetes
- kubectl
- calicoctl
- BusyBox wget

## Sources Consulted
- Calico Open Source documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Open Source documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico Open Source documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes documentation: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- BusyBox command reference: wget applet options - https://busybox.net/BusyBox.html

## Issues Found
- The test namespace was used but never created, so the setup commands would fail on a cluster without an existing `test` namespace. Added `kubectl create namespace test`.
- The BusyBox source pod command used `kubectl run ... -- sleep 3600` without `--command`, which passes arguments to the image's default command rather than reliably setting the container command. Added `--command -- sleep 3600`.
- The post tested pods immediately after creation, which could race pod startup. Added `kubectl wait --for=condition=Ready` before running traffic tests.
- The deny policy did not include a Calico `Log` action, so it was not actually testing Policy Log rules. Added an explicit `Log` rule before `Deny`.
- Step 3 claimed to apply a policy but only showed YAML. Changed the snippet to write the policy to `deny-with-log.yaml` and apply it with `calicoctl apply -f`.
- Step 4 referenced `allow-rule.yaml` without defining it. Added the complete replacement policy with `Log` followed by `Allow`.
- The BusyBox `wget` examples used `--timeout=5`; the BusyBox wget reference documents `-T SEC` for network read timeout. Updated the traffic tests to use `-T 5`.

## Review Notes
Calico `Log` actions continue policy evaluation, while `Allow` and `Deny` are final actions. The corrected examples preserve that ordering by placing `Log` before the final action. In a production cluster, readers should also know where Calico logs are collected for their configured dataplane and node logging stack.
