# Validation Summary: Building a Runbook for ClusterIP Reachability Errors in Calico

## Status
validated

## Post Type
Operational runbook / technical guide

## Technologies Covered
- Kubernetes Services and ClusterIP networking
- Kubernetes kubectl CLI
- Kubernetes RBAC authorization checks
- Calico Open Source
- calicoctl CLI
- Calico IPAM and FelixConfiguration resources

## Sources Consulted
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes virtual IPs and Service proxies reference: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Service ClusterIP allocation docs: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico troubleshooting and diagnostics docs: https://docs.tigera.io/calico/latest/operations/troubleshoot/troubleshooting
- Calico IPVS kube-proxy docs: https://docs.tigera.io/calico/latest/networking/configuring/use-ipvs
- Calico Kubernetes services training docs: https://docs.tigera.io/calico-cloud/tutorials/training/about-kubernetes-services

## Issues Found
- The verification command tested reachability to a pod IP with `ping`, which does not validate Kubernetes ClusterIP service reachability and may not work for service VIPs. Changed it to run `curl` against a known service ClusterIP and port.
- The `kubectl run` verification command passed an executable after `--` without `--command`. Kubernetes treats arguments after `--` as container arguments unless `--command` is set. Added `--command`.
- The CRD version review command printed CRD names and creation timestamps, not installed served versions. Changed it to use `custom-columns` for `.metadata.name` and `.spec.versions[*].name`.
- The RBAC command combined `kubectl auth can-i --list` with a specific verb/resource and described it as checking who has permissions. `can-i` checks the current identity for a specific action, while `--list` lists allowed actions. Changed the command and comment to check whether the current identity can create or update Calico GlobalNetworkPolicy resources.

## Review Notes
The runbook is intentionally generic, so several operational choices still depend on the cluster's Calico installation mode, namespace, kube-proxy mode, and incident process. The Calico and Kubernetes command forms used after the fixes are current according to the official references consulted.
