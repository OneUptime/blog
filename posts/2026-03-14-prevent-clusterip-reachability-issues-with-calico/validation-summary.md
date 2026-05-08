# Validation Summary: Preventing ClusterIP Reachability Errors in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- kubectl
- Kubernetes Services and EndpointSlices
- Calico IPAM and IPPool resources

## Sources Consulted
- Calico calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl validate command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/validate
- Calico calicoctl IPAM show command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl IPAM check command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico IPAM concepts: https://docs.tigera.io/calico/latest/networking/ipam/get-started-ip-addresses
- Calico troubleshooting commands: https://docs.tigera.io/calico/latest/operations/troubleshoot/commands
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/

## Issues Found
- The post used `calicoctl apply -f ... --dry-run`, but the documented `calicoctl apply` options do not include `--dry-run`. Replaced those examples with `calicoctl validate -f ...`, which is the documented offline validation command for Calico resource files.
- The recovery validation example used `http://kubernetes.default.svc/healthz`. Kubernetes documents `/healthz` as deprecated and the in-cluster Kubernetes Service is normally reached over HTTPS. Updated the command to use `curl -sk --max-time 5 https://kubernetes.default.svc/readyz`.
- The recovery checklist described `calicoctl node status` as a node-to-node connectivity test. Calico documents this command as reporting Calico process and BGP peer status, so the comment was corrected to say that.
- The application-level check used `kubectl get endpoints`, but Kubernetes has deprecated the Endpoints API in favor of EndpointSlices. Updated the command to `kubectl get endpointslices -A`.

## Review Notes
- The post assumes an operator-style Calico installation that uses the `calico-system` namespace. Manifest-based installations commonly use `kube-system`, so readers may need to adjust namespace flags for their installation method.
- `calicoctl node status` is most useful when Calico is using BGP. VXLAN or other non-BGP deployments need additional connectivity checks beyond that command.
