# Validation Summary: How to Calculate Kubernetes Capacity for Concurrent Deployment Rollouts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments and rolling updates
- Kubernetes resource requests and scheduling
- Horizontal Pod Autoscaling considerations
- Pod termination and rollout overlap
- PodDisruptionBudgets
- Python

## Sources Consulted
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes Resource Management for Pods and Containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes Init Containers](https://kubernetes.io/docs/concepts/workloads/pods/init-containers/)
- [Kubernetes Pod Overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/)
- [Kubernetes Disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/)

## Issues Found
- The changed-request guidance said not to charge old terminating Pods the new request when the old Pod was larger, but did not explicitly require accounting for the larger old request. This could be read as permitting an underestimate. Changed the sentence to require using each terminating Pod's actual old request and to explain that using a smaller new request would understate demand.

## Review Notes
- The Python example is syntactically valid and reproduces all stated pod, CPU, and memory totals.
- The whole-old-generation termination allowance is intentionally conservative, as the post states; actual overlap depends on rollout behavior and termination duration.
- Init-container requests use Kubernetes effective Pod request rules rather than being added mechanically to steady-state application-container requests.
