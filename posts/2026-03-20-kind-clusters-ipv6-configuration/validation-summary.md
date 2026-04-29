# Validation Summary: How to Configure kind Clusters for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- kind
- Kubernetes
- kubectl
- kubeadm networking
- Docker Engine IPv6 configuration
- IPv6 and dual-stack cluster networking

## Sources Consulted
- kind configuration docs: https://kind.sigs.k8s.io/docs/user/configuration/
- kind known issues: https://kind.sigs.k8s.io/docs/user/known-issues/
- Docker Engine IPv6 docs: https://docs.docker.com/engine/daemon/ipv6/
- Kubernetes dual-stack concepts: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation task: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes dual-stack support with kubeadm: https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/dual-stack-support/
- kubectl cluster-info reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cluster-info/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The Docker `daemon.json` example contained a `//` comment, which made the snippet invalid JSON. I removed the comment and kept the example to valid Docker daemon JSON.
- The Docker IPv6 subnet example used a documentation prefix without noting that it should be replaced. I switched it to a ULA subnet (`fd00:1::/64`), which is appropriate for local use and matches Docker's guidance to use a valid IPv6 network.
- The IPv6-only kind config omitted the documented `apiServerAddress: 127.0.0.1` setting used for host access when Docker IPv6 port forwarding is not available. I added that field.
- The post used `kubectl cluster-info --context ...` as if it changed the active context. I replaced it with `kubectl config use-context ...`, which is the correct command for switching contexts.
- The dual-stack verification section used `kubectl get nodes -o wide` and the `kube-dns` Service as proof of dual-stack behavior. Kubernetes documents validating node `podCIDRs`, node addresses, and Pod `status.podIPs` instead, so I updated the commands accordingly.
- The IPv6 Pod lookup assumed the IPv6 address would always be the second element in `.status.podIPs`, and it relied on `ping6`. I changed the lookup to select the IPv6 address by format and used `ping -6`, which is less brittle.
- The Service test assumed `kubectl expose deployment nginx --port=80` would create a dual-stack Service automatically. Kubernetes documents the default as `SingleStack` unless `ipFamilyPolicy` is set, so I replaced it with a Service manifest that uses `ipFamilyPolicy: PreferDualStack`.
- The nginx Service test did not wait for the Deployment to become ready before checking connectivity. I added `kubectl rollout status deployment/nginx` to avoid a race.
- The cleanup section only deleted one of the two example cluster names. I updated it so both example clusters have matching cleanup commands.

## Review Notes
- kind still documents `kind.x-k8s.io/v1alpha4` as the active cluster config API as of April 29, 2026, so that API version remains correct here.
- kind documents IPv6 port-forwarding limitations with Docker on macOS and Windows. The post's revised validation commands test connectivity from inside the cluster, which avoids depending on host-side IPv6 port forwarding.
