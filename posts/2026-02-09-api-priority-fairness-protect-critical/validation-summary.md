# Validation Summary: How to Configure API Priority and Fairness to Protect Critical API Calls

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API Priority and Fairness
- Kubernetes FlowSchema
- Kubernetes PriorityLevelConfiguration
- kubectl
- Kubernetes API server metrics

## Sources Consulted
- Kubernetes API Priority and Fairness documentation: https://kubernetes.io/docs/concepts/cluster-administration/flow-control/
- Kubernetes PriorityLevelConfiguration v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/flowcontrol/priority-level-configuration-v1/
- Kubernetes FlowSchema v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/flowcontrol/flow-schema-v1/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes flowcontrol v1 API source: https://raw.githubusercontent.com/kubernetes/api/master/flowcontrol/v1/types.go

## Issues Found
- The post used `flowcontrol.apiserver.k8s.io/v1beta3` for FlowSchema and PriorityLevelConfiguration examples. Kubernetes v1.32 no longer serves v1beta3, so all examples were updated to the stable `flowcontrol.apiserver.k8s.io/v1` API.
- The post said APF replaced max-inflight limits in Kubernetes 1.20. I changed this to explain that APF became enabled by default in v1.20, reached stable status in v1.29, and divides the total concurrency limit derived from the max-inflight flags.
- The post described APF resources as custom resources. I changed this to API resources because FlowSchema and PriorityLevelConfiguration are built-in Kubernetes flowcontrol API resources, not CRDs.
- The default priority-level list omitted `node-high` and `catch-all`, and described `global-default` as the catch-all. I updated the list to distinguish suggested defaults from the mandatory fallback.
- A comment described `nominalConcurrencyShares` as the number of concurrent requests allowed. I corrected it to say the field is used to calculate the nominal concurrency limit.
- The custom priority-level section implied critical monitoring would never be throttled. I softened this to protected capacity because limited APF priority levels can still queue or reject requests.
- The deployment FlowSchema matched a namespaced resource without specifying `namespaces` or `clusterScope`. I added `namespaces: ["production"]` so the resource rule is valid for deployments in the production namespace.
- The concurrency formula did not mention Kubernetes' ceiling behavior or "seats" terminology. I updated the formula and example result accordingly.
- The PriorityLevelConfiguration status example used `type: Exempt`, which is not the valid condition type for a limited priority level. I changed it to `type: ConcurrencyShared`.

## Review Notes
The `apiserver_flowcontrol_request_concurrency_limit` metric is still documented, but current Kubernetes documentation also describes `apiserver_flowcontrol_nominal_limit_seats` and `apiserver_flowcontrol_current_limit_seats`, which may be more precise when discussing borrowing behavior in future revisions.
