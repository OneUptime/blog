# Validation Summary: How to Execute a Shell in a Running Container in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- `kubectl`
- `kubectl exec`
- `kubectl debug`
- Ephemeral containers
- `kubectl cp`
- `nicolaka/netshoot`

## Sources Consulted
- Rancher: Access a Cluster with Kubectl and kubeconfig - https://ranchermanager.docs.rancher.com/v2.9/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Rancher: VMware vSphere Storage - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/manage-clusters/provisioning-storage-examples/vsphere-storage
- Rancher: Managing Role-Based Access Control (RBAC) - https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac
- Rancher: Enabling the API Audit Log to Record System Events - https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/advanced-user-guides/enable-api-audit-log
- Rancher: Docker Install with TLS Termination at Layer-7 NGINX Load Balancer - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/configure-layer-7-nginx-load-balancer
- Kubernetes: Get a Shell to a Running Container - https://kubernetes.io/docs/tasks/debug/debug-application/get-shell-running-container/
- Kubernetes: `kubectl exec` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes: Debug Running Pods - https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes: `kubectl debug` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes: `kubectl cp` reference - https://v1-32.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- GitHub: `nicolaka/netshoot` README - https://github.com/nicolaka/netshoot

## Issues Found
- Corrected the Rancher UI labels to match Rancher documentation: `Workload > Pods` and the `Kubectl Shell` button.
- Fixed the `curl http://database-service:5432` example, which incorrectly used HTTP against a database port. Replaced it with an HTTP health-check example and left `nc` as the TCP connectivity example.
- Corrected the ephemeral debug container explanation so it no longer implies unconditional process namespace sharing. `--target` only requests access to the target container's process namespace when the container runtime supports it.
- Added the documented `kubectl cp` caveat that the container image must include `tar`.
- Reworded the RBAC guidance to avoid an inaccurate Rancher UI path and corrected the audit note so it no longer implies Rancher logs exec-related activity by default.
- Corrected the CrashLoopBackOff guidance so it no longer states that `kubectl exec` is impossible in all cases.
- Tightened the timeout troubleshooting note to reflect Rancher guidance about proxies or load balancers needing to permit long-lived websocket connections.

## Review Notes
- Ephemeral containers are a stable Kubernetes feature in v1.25 and later. On older clusters, `kubectl debug` depends on cluster support for ephemeral containers.
- Several example commands still depend on tools being present in the target image or debug image, including `curl`, `nslookup`, `ps`, `free`, `psql`, `mysql`, and `redis-cli`.
