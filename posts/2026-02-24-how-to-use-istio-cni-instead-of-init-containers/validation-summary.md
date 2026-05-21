# Validation Summary: How to Use Istio CNI Instead of Init Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio CNI node agent
- Istio sidecar injection
- IstioOperator
- Helm
- Kubernetes CNI
- Kubernetes Pod Security
- iptables traffic redirection

## Sources Consulted
- Istio documentation: Install the Istio CNI node agent - https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio documentation: Install with Helm - https://istio.io/latest/docs/setup/install/helm/
- Istio documentation: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio upstream chart values: istio-control/istio-discovery values.yaml - https://raw.githubusercontent.com/istio/istio/master/manifests/charts/istio-control/istio-discovery/values.yaml
- Istio upstream chart values: istio-cni values.yaml - https://raw.githubusercontent.com/istio/istio/master/manifests/charts/istio-cni/values.yaml
- Kubernetes documentation: PodSecurityPolicy removal - https://kubernetes.io/docs/concepts/policy/pod-security-policy/

## Issues Found
- The Helm CNI install command used `--set global.cni.enabled=true`, which is not part of the current official Istio CNI Helm installation. Changed it to the documented `helm install istio-cni istio/cni -n istio-system --wait`.
- The Helm istiod command used `--set istio_cni.enabled=true`, which is not the current Istio chart value. Changed it to `--set pilot.cni.enabled=true --wait`, matching the official CNI installation guide.
- The IstioOperator CNI logging example used `values.cni.logLevel`, but the current chart uses `values.cni.logging.level`. Updated the YAML accordingly.
- The security-policy wording referenced PodSecurityPolicies without noting that they are legacy. Kubernetes removed PodSecurityPolicy in v1.25, so the wording now says "legacy PodSecurityPolicies" and uses the current "Pod Security Standards" name.
- The verification text implied that no init containers would remain. Current Istio CNI sidecar mode may inject an `istio-validation` init container for CNI race mitigation, so the text now clarifies that CNI removes the privileged `istio-init` container specifically.
- The race-condition explanation said affected pods would run without interception. Current Istio mitigates this with the `istio-validation` init container by default, so the text now distinguishes the unmitigated risk from current default behavior.
- The migration command used the stale `values.sidecar_injector.istio_cni.enabled=true` path. Updated it to `values.pilot.cni.enabled=true`.
- The repair example now sets `repairPods: false` when demonstrating `labelPods: true`, because current Istio documents the repair modes as alternatives and defaults `repairPods` to true in recent releases.

## Review Notes
The post is technically relevant and remains useful. The local environment did not have `helm` or `istioctl` installed, so CLI validation was performed against official Istio documentation and upstream chart values rather than local `--help` output.
