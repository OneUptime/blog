# Validation Summary: How to Roll Back a Workload Deployment in Rancher

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher Manager UI
- Kubernetes Deployments
- Kubernetes StatefulSets
- Kubernetes DaemonSets
- `kubectl`

## Sources Consulted
- Rancher: Rolling Back Workloads - https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/workloads-and-pods/roll-back-workloads
- Kubernetes: Update a Deployment Without Downtime - https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes: StatefulSets - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes: Perform a Rollback on a DaemonSet - https://kubernetes.io/docs/tasks/manage-daemon/rollback-daemon-set/
- Kubernetes: `kubectl rollout` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes: `kubectl describe` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The rollout history example showed human-readable `CHANGE-CAUSE` values as if Kubernetes populated them automatically. I updated the example to the documented default `"<none>"` output and added a note that `CHANGE-CAUSE` comes from the `kubernetes.io/change-cause` annotation, which Kubernetes does not set automatically.
- The Rancher UI instructions described opening deployment details and looking for revision-history sections. I updated the steps to match the official Rancher workflow: `Cluster Management` -> target cluster -> `Explore` -> `Workload` -> `⋮ > Rollback`.
- The StatefulSet rollback section omitted an important documented caveat. I added that StatefulSets store revisions in `ControllerRevision` objects and that a broken rolling update can require deleting affected Pods after reverting the template.
- The `progressDeadlineSeconds` explanation said the Deployment is "marked as failed." I corrected this to the documented behavior that Kubernetes marks the Deployment as failed to progress.
- The failed-rollback diagnostic command used `kubectl describe pod -l ...`; I updated it to the documented selector form `kubectl describe pods -l ...`.
- The `maxUnavailable: 0` explanation overstated the behavior. I corrected it to the more precise guarantee that the Deployment keeps the full desired number of available Pods during rollout.
- The best-practice note on change causes was too generic. I updated it to reference the specific `kubernetes.io/change-cause` annotation used by rollout history.

## Review Notes
- Rancher documents workload rollback generically rather than only for Deployments; after correction, the post's UI guidance is consistent with the current documented workflow.
- The post's prerequisite of Rancher `v2.7 or later` is acceptable, though the same workflow is also documented in later Rancher versions.
- StatefulSet rollback behavior is more operationally nuanced than Deployment rollback because of the documented broken-rollout caveat for stuck Pods.
