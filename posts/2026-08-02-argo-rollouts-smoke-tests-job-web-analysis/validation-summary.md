# Validation Summary: How to Run Smoke Tests with Job and Web Analysis in Argo Rollouts

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Argo Rollouts
- `AnalysisTemplate` and `AnalysisRun`
- Argo Rollouts Job and Web metric providers
- Kubernetes Jobs, Services, ServiceAccounts, Secrets, and NetworkPolicies
- Canary and blue-green progressive delivery
- Header-based traffic routing
- JSONPath and analysis expressions
- `kubectl` and the Argo Rollouts kubectl plugin
- YAML and JSON

## Sources Consulted

- [Argo Rollouts: Job Metrics](https://argo-rollouts.readthedocs.io/en/stable/analysis/job/)
- [Argo Rollouts: Web Metrics](https://argo-rollouts.readthedocs.io/en/stable/analysis/web/)
- [Argo Rollouts: Analysis and Progressive Delivery](https://argo-rollouts.readthedocs.io/en/stable/features/analysis/)
- [Argo Rollouts: Canary Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Blue-Green Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/bluegreen/)
- [Argo Rollouts: Traffic Management](https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/)
- [Argo Rollouts: Rollout Specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts: `kubectl argo rollouts get rollout`](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/)
- [Argo Rollouts v1.9.1 release](https://github.com/argoproj/argo-rollouts/releases/tag/v1.9.1)
- [Argo Rollouts v1.9.1 Job provider implementation](https://github.com/argoproj/argo-rollouts/blob/v1.9.1/metricproviders/job/job.go)
- [Argo Rollouts v1.9.1 Web provider implementation](https://github.com/argoproj/argo-rollouts/blob/v1.9.1/metricproviders/webmetric/webmetric.go)
- [Argo Rollouts v1.9.1 analysis controller implementation](https://github.com/argoproj/argo-rollouts/blob/v1.9.1/analysis/analysis.go)
- [Kubernetes: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes: DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes: Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/)
- [Kubernetes: Service Accounts](https://kubernetes.io/docs/concepts/security/service-accounts/)
- [Kubernetes: Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Kubernetes: Images](https://kubernetes.io/docs/concepts/containers/images/)
- [Kubernetes: `kubectl describe`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [Kubernetes: `kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

## Issues Found

- The Job provider description treated the test process's exit code as the provider's direct result. Argo Rollouts actually marks the measurement from the Kubernetes Job's `Complete` or `Failed` terminal condition; container exit status normally drives that condition but is mediated by Job retry and termination policies. Updated the explanation accordingly.
- The post said an image-pull waiting state could make the Job metric Inconclusive and pause the rollout. The Job provider leaves the measurement Running until the Job receives a terminal condition. With the example's `activeDeadlineSeconds`, Kubernetes eventually marks the Job Failed with `DeadlineExceeded`, the metric fails, and inline analysis aborts the rollout. Corrected the failure behavior.
- The Web example passes a cluster-local Service address to a separately hosted test service without stating the required network path. Added the requirement that the test service must be able to reach the cluster network, or must instead receive a reachable canary endpoint.
- The Web debugging guidance attributed all DNS and TLS checks to the Rollouts controller's network context. The controller must reach the Web provider URL, but the test service must reach the target passed in `jsonBody`. Split the guidance between those two network contexts.
- The Secret guidance referred imprecisely to the resulting resource metadata. Clarified that the Secret must be in the AnalysisRun's namespace, the AnalysisRun retains the Secret reference, and the controller resolves the value when executing the metric.

## Review Notes

- The post was checked against Argo Rollouts v1.9.1, the current release on the validation date. `argoproj.io/v1alpha1`, the shown Job and Web provider fields, and the inline analysis step syntax remain current.
- The AnalysisTemplate YAML, JSON response, JSONPath selection, expression syntax, HTTP methods, timeout field, Secret argument reference, and Job deadline/retry fields match the current APIs.
- Argo Rollouts executes due metrics in an AnalysisRun concurrently, so separate inline analysis steps are the correct way to enforce Job-before-Web ordering.
- The diagnostic commands are current. Completed Job resources and pods can be removed by AnalysisRun history or TTL cleanup, so log collection should account for configured retention.
- `registry.example.com`, `release-tests.example.com`, the digest token, ServiceAccount, Secret, Services, and test endpoints are illustrative and must exist or be replaced. The `.svc.cluster.local` names also assume the default Kubernetes cluster domain.
