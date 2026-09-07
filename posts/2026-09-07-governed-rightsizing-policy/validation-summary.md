# Validation Summary: Building a Governed Rightsizing Policy

## Status
validated

## Post Type
Technical guide with illustrative YAML contracts, approval configuration, a scoring model, and recommendation lifecycle implementation guidance.

## Technologies Covered
- FinOps and governed infrastructure rightsizing
- AWS Compute Optimizer
- Google Cloud Recommender and optimistic concurrency using etags
- Kubernetes resource scheduling, resource limits, and Validating Admission Policy
- YAML

## Sources Consulted
- [AWS Compute Optimizer overview](https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html)
- [AWS Compute Optimizer resource requirements](https://docs.aws.amazon.com/compute-optimizer/latest/ug/requirements.html)
- [AWS Compute Optimizer EC2 recommendations and performance risk](https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-ec2-recommendations.html)
- [Google Cloud Recommender concepts](https://cloud.google.com/recommender/docs/key-concepts)
- [Google Cloud Recommender API usage and state changes](https://cloud.google.com/recommender/docs/use-api)
- [Google Cloud Recommender REST v1 markDismissed](https://cloud.google.com/recommender/docs/reference/rest/v1/projects.locations.recommenders.recommendations/markDismissed)
- [Kubernetes Validating Admission Policy](https://kubernetes.io/docs/reference/access-authn-authz/validating-admission-policy/)
- [Kubernetes resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [YAML 1.2.2 specification](https://yaml.org/spec/1.2.2/)
- [Author GitHub profile](https://github.com/nawazdhandala)

## Issues Found
No technical issues found.

## Review Notes
- Both YAML examples parsed successfully with PyYAML. They describe an internal policy schema, not an AWS, Google Cloud, or Kubernetes API configuration. Shape names and approval roles are illustrative; there is no claim that a provider accepts these fields directly.
- The observation window covers 32 calendar days. Its 46,080 expected samples are consistent with one sample per minute; 45,610 valid samples represent approximately 98.98% coverage. The text separately requires preserving metric resolution. The six scoring maxima sum to 100.
- Evidence periods, scoring weights, approval roles, hard vetoes, rollout gates, expiry, and audit-mode automation are proposed organizational policy choices rather than provider requirements or calibrated probabilities. The example candidate is not presented as already meeting every approval gate.
- AWS documentation supports the statements about resource-specific evidence requirements, analysis windows, and performance risk. Application-specific validation remains necessary. Savings are illustrative, and the post appropriately requires checking realized cost and commitment effects.
- Google Cloud documentation supports etag-based concurrency checks and claimed, dismissed, succeeded, and failed states. The concepts page contains a conflicting note saying dismissal is unavailable through the API; the API usage guide and REST v1 markDismissed reference explicitly document it, supporting the post as written.
- TESTING and EXPIRED are proposed internal lifecycle states, not Google Cloud Recommender API states. Freezing inputs, versioning recommendations, and verifying business outcomes are internal workflow recommendations.
- Kubernetes admission policies can validate request fields and policy parameters using CEL. Such checks support static resource and metadata guardrails but do not establish runtime workload safety. Resource scheduling and CPU/memory enforcement documentation supports the proposed scheduling, throttling, and OOM checks.
- All linked documentation and the author profile resolved to the intended resources; Google Cloud and GitHub links redirect appropriately.
- No executable commands, provider API requests, or version-pinned configurations appear in the post. No cloud changes or live workload experiments were needed or performed. README.md was left unchanged.
