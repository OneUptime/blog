# Validation Summary: How to Choose Rollback, Failover, or a Forward Fix During an Incident

## Status
validated

## Post Type
Technical incident-response guide with Kubernetes command examples.

## Technologies Covered
- Kubernetes Deployments, Pod templates, ReplicaSets, and rollout revisions
- kubectl rollout history, undo, and status
- Bash variable assignment, quoting, and required-variable expansion
- AWS Well-Architected operational excellence and disaster recovery guidance
- Stateful failover, replication, write fencing, capacity, and recovery objectives
- SRE incident command, coordinated mitigation, and recovery verification

## Sources Consulted
- Kubernetes Deployments: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ — rollback scope, revision updates, and retained history; relevant documentation was retrieved through official-site search after direct fetches failed.
- kubectl rollout history: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/ — resource syntax and revision inspection.
- kubectl rollout undo: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/ — target revision and inherited context/namespace options.
- kubectl rollout status: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/ — watch behavior, revision pinning, and timeout semantics.
- AWS OPS06-BP01, Plan for unsuccessful changes: https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_mit_deploy_risks_plan_for_unsucessful_changes.html — preparation and testing of rollback and forward-fix plans.
- AWS REL13-BP02, Use defined recovery strategies to meet the recovery objectives: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/rel_planning_for_recovery_disaster_recovery.html — recovery strategies, standby capacity, recovery objectives, and replication limitations.
- PostgreSQL Failover: https://www.postgresql.org/docs/current/warm-standby-failover.html — authoritative example supporting fencing, promotion, routing, and rebuilding redundancy after failover; the post does not assume PostgreSQL-specific behavior.
- Google SRE, Managing Incidents: https://sre.google/sre-book/managing-incidents/ — incident command, operational ownership, coordinated changes, and a live incident record.
- Author profile: https://github.com/nawazdhandala — the post's www.github.com author link redirects to the intended profile.

## Issues Found
No technical issues found.

## Review Notes
- Both Bash examples passed `bash -n` syntax checks. The kubectl subcommands, resource syntax, and flags agree with the official references; no deprecated command usage was identified.
- Rollback restores a retained Deployment Pod template, not database contents or external resources. A rollback that changes the template advances the revision, so a pinned status watch must use the resulting revision rather than the historical target.
- The 180-second timeout limits the status watch, not the controller's rollout. The warning that an unpinned watch follows a subsequent rollout is accurate.
- Example context, namespace, Deployment name, and revision are environment-dependent. Revision 41 must still exist, and the context must be verified by the operator. The shell guard checks for an unset or empty variable; it does not independently validate the selected cluster.
- The compatibility, destination-capacity, replication, fencing, and customer-level verification checks are technically sound. Replication alone does not provide protection against replicated corruption.
- The decision window and recovery estimates are explicitly illustrative. They are proposed operational practices, not vendor guarantees or universal incident policy. Release 42 and revision 41 are example identifiers, not Kubernetes software versions.
- No application configuration or version-specific API snippets require correction. All links in the post point to the intended resources; the Kubernetes Deployment page was verified through official-site search despite direct-fetch errors.
- Validation was based on documentation review and local shell syntax checks. No Kubernetes cluster was contacted and no rollback or failover was executed. Production recovery times and workload compatibility require service-specific rehearsal and evidence.
- README.md was left unchanged.
