# Validation Summary: Migrate Static Pod IPs with Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Calico IPAM
- Calico IPReservation resources
- calicoctl
- kubectl
- jq

## Sources Consulted
- Calico documentation: Use a specific IP address with a pod - https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- Calico documentation: IPReservation resource - https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico documentation: Configure the Calico CNI plugins - https://docs.tigera.io/calico/latest/reference/configure-cni-plugins
- Calico documentation: calicoctl ipam show - https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Kubernetes documentation: JSONPath Support - https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes documentation: kubectl run - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: kubectl rollout - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/

## Issues Found
- The prerequisites did not explicitly require Calico IPAM, but Calico's specific-IP pod annotation works with Calico IPAM. Added "Calico IPAM enabled for pod address allocation."
- The inventory command used a complex Kubernetes JSONPath expression for the Calico annotation. Replaced it with a `jq` expression because the post already uses `jq`, and it reliably handles the annotation key containing dots and a slash.
- The node inventory comment said `nodeSelector`, but the command checked `.spec.nodeName`. Updated the comment to describe pods pinned to specific nodes.
- The hardcoded-IP search comment mentioned ConfigMaps and Secrets, but the command only searched ConfigMaps. Updated the comment to match the command and avoid implying decoded Secret inspection.
- The reservation step did not state that requested static IPs must be within a configured Calico IP pool and not currently in use. Added that requirement based on Calico documentation.

## Review Notes
The Calico `IPReservation` resource prevents automatic IPAM assignment but does not block manual assignment with `cni.projectcalico.org/ipAddrs`; the post's reserve-then-annotate workflow is consistent with Calico's documented approach. The local environment did not have `kubectl` or `calicoctl` installed, so CLI verification was performed against official Kubernetes and Calico documentation rather than local `--help` output.
