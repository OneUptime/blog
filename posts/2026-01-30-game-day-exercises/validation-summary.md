# Validation Summary: How to Create Game Day Exercises

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Site reliability engineering
- Chaos engineering and game day exercises
- Python
- Bash and curl
- Prometheus HTTP API and PromQL
- Kubernetes Pods, labels, environment variables, kubectl, and metrics
- Chaos Mesh
- LitmusChaos
- Mermaid diagrams

## Sources Consulted
- AWS Well-Architected Framework: Game day concept: https://wa.aws.amazon.com/wellarchitected/2020-07-02T19-33-23/wat.concept.gameday.en.html
- AWS Well-Architected Framework: Conduct game days regularly: https://docs.aws.amazon.com/wellarchitected/latest/framework/rel_testing_resiliency_game_days_resiliency.html
- AWS Prescriptive Guidance: Chaos engineering on AWS overview: https://docs.aws.amazon.com/prescriptive-guidance/latest/chaos-engineering-on-aws/overview.html
- Kubernetes documentation: Pods: https://kubernetes.io/docs/concepts/workloads/pods/
- Kubernetes documentation: Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes documentation: Define Environment Variables for a Container: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/
- Kubernetes documentation: kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes documentation: kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Prometheus documentation: HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- curl documentation: URL globbing behavior: https://github.com/curl/curl/blob/master/docs/URL-SYNTAX.md
- Chaos Mesh documentation: Simulate Pod Faults: https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh documentation: Define Scheduling Rules: https://chaos-mesh.org/docs/define-scheduling-rules/
- LitmusChaos documentation: Pod Delete experiment: https://litmuschaos.github.io/litmus/experiments/categories/pods/pod-delete/
- LitmusChaos documentation: Construct chaos experiment YAML without ChaosCenter: https://docs.litmuschaos.io/docs/user-guides/construct-experiment
- Google Cloud blog: Disaster Recovery Testing and Wheel of Misfortune: https://cloud.google.com/blog/products/management-tools/shrinking-the-time-to-mitigate-production-incidents

## Issues Found
- The Python abort monitor defined a revenue impact threshold but never checked it. Added a `get_revenue_impact_per_minute()` check so every threshold in `AbortCriteria` is represented in the abort logic.
- The Python example imported `Callable` but did not use it. Removed the unused import to keep the snippet clean and runnable without lint noise.
- The Prometheus curl examples placed raw PromQL expressions containing braces and brackets directly in the URL. Updated them to use `curl -G --data-urlencode`, matching Prometheus HTTP API guidance and avoiding curl URL globbing problems.
- The Chaos Mesh example described `pod-failure` as terminating pods. Updated the wording because Chaos Mesh `pod-failure` makes a pod unavailable for a duration; `pod-kill` is the action that kills a pod.
- The Chaos Mesh scheduled example placed a `scheduler` block inside a `PodChaos` resource. Replaced it with a `Schedule` resource using `schedule`, `type: "PodChaos"`, and `podChaos`, which matches Chaos Mesh scheduling rules.
- The LitmusChaos example labeled `TOTAL_CHAOS_DURATION` as the number of pods to target and included `TARGET_CONTAINER`, which is not part of the official `pod-delete` example. Removed `TARGET_CONTAINER`, removed the incorrect comment, and added standard `engineState`, `annotationCheck`, and `chaosServiceAccount` fields shown in LitmusChaos examples.

## Review Notes
- The Kubernetes label and environment variable examples are valid illustrative Pod manifests, but the `api-server:latest` image is a placeholder and would need to exist in a real registry.
- `kubectl top` commands depend on the Kubernetes Metrics API being available; this is correct usage but may fail on clusters without Metrics Server or equivalent metrics support.
- The database failover examples are intentionally generic. Actual behavior depends on the database operator or replication system in use.
