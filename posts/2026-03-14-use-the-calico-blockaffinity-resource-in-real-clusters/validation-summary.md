# Validation Summary: Using the Calico BlockAffinity Resource in Production Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Calico BlockAffinity
- Calico IPPool
- Calico FelixConfiguration
- Calico Typha
- Kubernetes
- kubectl
- calicoctl

## Sources Consulted
- Calico Block affinity resource reference: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico IP pool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico resource definitions overview: https://docs.tigera.io/calico/latest/reference/resources/overview
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico calicoctl IPAM command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/overview
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico v3.32 CRD manifests for BlockAffinity resource names and API groups: https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v1_crd_projectcalico_org.yaml and https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v3_projectcalico_org.yaml
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The post described BlockAffinity as something users create or configure directly. Calico documents BlockAffinity as an IPAM-managed resource representing affinity for an IPAM block, so the introduction and configuration language were changed to inspection and monitoring language.
- The multi-environment pattern said BlockAffinity manifests have node selectors. BlockAffinity has `state`, `node`, `cidr`, and `deleted` fields; IPPool has `spec.nodeSelector`. The text was corrected to use IPPool node selectors and describe BlockAffinity as the resulting IPAM-managed state.
- The scale guidance mentioned increasing reconciliation intervals without a specific supported BlockAffinity setting. This was replaced with guidance to avoid manual BlockAffinity changes and adjust IPPool settings such as `blockSize` and `nodeSelector`.
- The monitoring command used `blockaffinity.projectcalico.org`. The native v3 CRD resource is plural `blockaffinities.projectcalico.org`, so the command was corrected.
- The Felix health endpoint note incorrectly tied `/liveness` and `/readiness` to Prometheus metrics. Felix Prometheus metrics use the metrics server, while the health endpoints are part of Felix health checks, so the wording was corrected.
- The verification and troubleshooting sections referred to configuring or applying BlockAffinity directly. These were changed to refer to checking BlockAffinity state and validating related IPPool, BGP, or Felix changes.
- The RBAC example combined `kubectl auth can-i` action checking with `--list`, which is not the documented usage pattern. It was replaced with a specific `kubectl auth can-i update blockaffinities.crd.projectcalico.org` check.

## Review Notes
The post is now technically accurate as a production operations guide for observing BlockAffinity resources and managing the related Calico resources that influence IPAM behavior. Some commands assume Calico is installed in `calico-system` and that the Calico API server or native v3 CRDs expose `projectcalico.org` resources; clusters using only backing CRDs may need the `crd.projectcalico.org` resource names instead.
