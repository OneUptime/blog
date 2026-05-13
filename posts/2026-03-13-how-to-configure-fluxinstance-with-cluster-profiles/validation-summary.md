# Validation Summary: How to Configure FluxInstance with Cluster Profiles

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flux Operator
- FluxInstance custom resource
- Kubernetes
- OpenShift
- Kubernetes NetworkPolicy
- GitOps
- Kustomize patches

## Sources Consulted
- Flux Operator FluxInstance API documentation: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator instance customization documentation: https://fluxoperator.dev/docs/instance/customization/
- Flux Operator sharding documentation: https://fluxoperator.dev/docs/instance/sharding/
- Flux Operator flux-instance Helm chart values: https://fluxoperator.dev/docs/charts/flux-instance/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux OpenShift installation documentation: https://fluxcd.io/flux/installation/configuration/openshift/
- Flux vertical scaling documentation: https://fluxcd.io/flux/installation/configuration/vertical-scaling/

## Issues Found
- The post described FluxInstance cluster profiles as predefined templates. FluxInstance supports cluster configuration fields such as `type`, `size`, `multitenant`, `networkPolicy`, and `domain`, but the documentation does not define separate built-in profiles for development, production, or edge clusters. I revised the language to describe reusable configuration patterns.
- The supported `cluster.type` values were incomplete. I updated the example comment to include `kubernetes`, `openshift`, `azure`, `aws`, and `gcp`, and added the supported `cluster.size` field.
- The OpenShift section claimed Flux Operator handles OpenShift Routes. The official Flux OpenShift guidance focuses on SCC/security context handling, so I removed the Route claim.
- The multi-tenant example used a strategic merge patch that would replace controller arguments and duplicated behavior covered by `spec.cluster.multitenant`. I removed the patch and used `tenantDefaultServiceAccount` with `multitenant: true`.
- The production example increased the `source-controller` deployment replicas directly and presented this as high availability. Flux documentation recommends vertical scaling through controller settings and horizontal scaling through sharding, so I changed the section to production scaling and added a sharding note.
- The edge example used very tight custom resource limits without official support. I changed it to use the supported small scaling profile with a minimal component set.

## Review Notes
The corrected examples align with the current Flux Operator API documentation. Future improvements could add a dedicated sharding example for large multi-tenant fleets, but that would be new content beyond the scope of this technical correction.
