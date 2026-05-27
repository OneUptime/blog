# Validation Summary: How to Install MetalLB Using the MetalLB Operator from OperatorHub

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Kubernetes
- MetalLB
- MetalLB Operator
- OperatorHub
- Operator Lifecycle Manager (OLM)
- Kubernetes Custom Resources
- Layer 2 and BGP load balancer advertisements

## Sources Consulted
- MetalLB Operator README and usage documentation: https://github.com/metallb/metallb-operator
- MetalLB Operator API definition for the `MetalLB` custom resource: https://github.com/metallb/metallb-operator/blob/main/api/v1beta1/metallb_types.go
- OperatorHub install manifest for `metallb-operator`: https://operatorhub.io/install/metallb-operator.yaml
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB API reference: https://metallb.io/apis/
- MetalLB usage documentation for service annotations: https://metallb.io/usage/
- OLM OperatorGroup documentation: https://olm.operatorframework.io/docs/concepts/crds/operatorgroup/
- OLM operator install documentation: https://olm.operatorframework.io/docs/concepts/operators-on-cluster/
- OLM uninstall documentation: https://olm.operatorframework.io/docs/tasks/uninstall-operator/
- OLM GitHub release install script for v0.42.0: https://github.com/operator-framework/operator-lifecycle-manager/releases/download/v0.42.0/install.sh

## Issues Found
- The OLM install command used `v0.28.0` while describing it as the latest release. Updated the command to `v0.42.0`, the current release identified during validation.
- The OperatorGroup manifest set `targetNamespaces: []`. Official OLM documentation specifies a global OperatorGroup by omitting both `spec.targetNamespaces` and `spec.selector`, so the manifest was changed to omit the selector fields.
- The Subscription used `channel: stable`, but the OperatorHub community install manifest for `metallb-operator` uses `channel: beta`. Updated the Subscription to `beta`.
- The expected CSV output showed `metallb-operator.v0.14.9`, which does not match the OperatorHub community package version. Updated the example to `metallb-operator.v0.14.0`.
- The `BGPPeer` example used `metallb.io/v1beta1`, which current MetalLB docs mark as deprecated. Updated `BGPPeer` to `metallb.io/v1beta2`.
- The BGP peer ASN example contradicted its own private-ASN guidance by using `64500`. Updated the example ASNs to values in the private ASN range.
- The service example used the old `metallb.universe.tf/address-pool` annotation. Updated it to the current `metallb.io/address-pool` annotation.
- The cleanup section said the CSV would be cleaned up automatically after deleting the Subscription. OLM documentation states deleting a Subscription does not delete the associated CSV, so the cleanup note was corrected.
- The cleanup section only deleted the L2 advertisement. Added deletion commands for the BGP advertisement and BGP peer used in the alternative BGP path.

## Review Notes
The post is technically relevant and the corrected examples align with the current MetalLB and OLM documentation checked during review. The OperatorHub community package may lag behind upstream MetalLB releases, so future reviews should re-check the active OperatorHub channel and CSV version.
