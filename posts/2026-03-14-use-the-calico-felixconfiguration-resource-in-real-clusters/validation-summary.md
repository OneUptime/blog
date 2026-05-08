# Validation Summary: Using the Calico FelixConfiguration Resource in Production Clusters

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- FelixConfiguration resources
- calicoctl
- kubectl
- Typha
- Kubernetes RBAC

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Typha overview: https://docs.tigera.io/calico/latest/reference/typha/overview
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl ipam show reference: https://docs.tigera.io/calico-enterprise/latest/reference/clis/calicoctl/ipam/show/
- Calico component metrics monitoring guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Project Calico v3.26.4 and v3.32.0 FelixConfiguration CRD schemas: https://github.com/projectcalico/calico

## Issues Found
- The prerequisites said Calico v3.26+ even though the post recommends selector-scoped FelixConfiguration resources. The v3.26.4 CRD does not include `spec.nodeSelector`, while the v3.32.0 CRD and current docs do. Updated the prerequisite to Calico v3.32+ for selector-scoped FelixConfiguration resources.
- The small-cluster section claimed `kubectl get node ... | grep projectcalico` checks the effective Felix configuration. Node YAML does not show the effective Felix configuration. Replaced it with commands that inspect the global and node-specific FelixConfiguration resources.
- The multi-environment section described node selectors without noting the actual `nodeSelector` field syntax or its tech preview status. Added a Calico selector example and a short production caveat about overlapping selectors.
- The scale guidance said to increase reconciliation intervals to reduce API server load. Typha is the Calico-supported mechanism for reducing datastore/API server fan-out at scale, and interval changes should be measurement-driven. Reworded the guidance to avoid overly aggressive refresh and reconciliation settings.
- The resource-combination example listed `calicoctl get felixconfiguration -o yaml` twice. Replaced the duplicate command with `calicoctl get bgpconfiguration -o yaml`.
- The health endpoint section tied Felix `/liveness` and `/readiness` checks to Prometheus metrics. Felix health endpoints are controlled by the health port settings, while Prometheus metrics use separate settings and default to port 9091. Updated the text and localhost commands for the default health host and port.
- The RBAC example combined a specific `kubectl auth can-i` check with `--list`, which is a separate listing mode. Replaced it with a valid specific permission check for the current credentials.
- The audit example used Kubernetes events while describing audit log review. Updated the comment to describe reviewing recent Calico component events.

## Review Notes
The post is now technically valid for current Calico documentation. Future improvements could add explicit FelixConfiguration YAML examples for selector-scoped resources and note that namespace and labels can differ between operator and manifest-based Calico installations.
