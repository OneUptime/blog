# Turn Postmortem Findings into Useful On-Call Runbook Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Postmortem, Incident Response, SRE, Kubernetes

Description: Convert incident findings into scoped runbook changes with clear prerequisites, safe inspection steps, decision points, recovery checks, and rehearsal evidence.

“Update the runbook” is a common postmortem action that can close without making the next incident easier. Adding a paragraph about what happened is useful history, but the next on-call engineer needs to know what to check, what the result means, and when to stop or escalate.

Start with the decision that was difficult during the incident. Then change the operational guide so another person can make that decision with the available evidence and appropriate access.

AWS defines a runbook as a documented procedure with a desired outcome and recommends including tools, permissions, error handling, and escalation. Those are practical acceptance criteria for a postmortem-driven update. [Runbook guidance](https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_ready_to_support_use_runbooks.html)

## Convert a finding into a specific behavior change

Read the incident timeline and identify where responders lacked information, followed an obsolete instruction, or could not tell whether an action had worked.

Translate each selected finding into a change in the guide:

| Postmortem finding | Useful runbook change |
|---|---|
| Responders inspected the wrong cluster first | Require explicit environment selection before inspection |
| A successful command was mistaken for recovery | Add a customer-facing verification step |
| The guide assumed permission the on-call lacked | Document required read access and the escalation route |
| Restarting healthy workers delayed diagnosis | Add criteria that distinguish a workload problem from a dependency problem |
| A workaround had no removal condition | State when and how to restore normal operation |

Avoid copying the entire postmortem into the runbook. Link the incident as rationale, and place the new instructions where the relevant alert or symptom already sends responders.

## Separate investigation from a known procedure

An investigation guide helps identify what is happening. A recovery procedure applies when a known condition and its prerequisites have been established. Combining them without a clear boundary can turn a tentative diagnosis into an automatic restart.

AWS calls the investigation guide a playbook and recommends linking it to a runbook when a known cause is identified. Whatever terminology your team uses, make that transition explicit. [Investigation playbooks](https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_ready_to_support_use_playbooks.html)

For example, “Orders API errors are elevated” is a symptom. It does not establish that the Orders deployment needs a restart. The guide should first distinguish deployment readiness, dependency errors, resource pressure, and an unknown condition using the signals available in that environment.

## Define the entry condition and scope

Write a short header that tells the reader when the guide applies. Include the alert or symptom, affected service and environment, guide owner, required access, last validation date, and a link to the escalation path.

State the intended outcome for the current section. An inspection section might aim to identify whether the expected deployment exists and whether its Pods are ready. Its outcome is useful evidence, not service recovery.

List exclusions that would change the procedure. A guide for one Deployment is not automatically suitable for a stateful database, a different cluster, or a service undergoing a planned migration.

Keep secret values out of the document. Refer to the approved access process rather than embedding credentials or telling responders to obtain broad administrator access when a command fails.

## Make the first inspection steps explicit

Consider a fictional incident where an engineer's shell pointed to an unrelated Kubernetes context. A context is a named connection configuration selecting a cluster and user. The revised guide can require an explicit context on each command rather than relying on the shell's current selection.

The following read-only example was checked against `kubectl` 1.34.0 help and the Kubernetes 1.34 reference. Use an approved client compatible with your cluster. Prerequisites are an authorized context, permission to get Deployments and list Pods in the namespace, a Deployment named `orders`, and the stated label on its Pods.

Replace both `REPLACE_...` values and adapt the workload name and selector to the actual service before running:

```bash
incident_context='REPLACE_WITH_APPROVED_CONTEXT'
incident_namespace='REPLACE_WITH_SERVICE_NAMESPACE'

kubectl --context "$incident_context" --namespace "$incident_namespace" \
  --request-timeout=10s get deployment orders -o wide

kubectl --context "$incident_context" --namespace "$incident_namespace" \
  --request-timeout=10s get pods \
  --selector 'app.kubernetes.io/name=orders' -o wide
```

The first command shows the named Deployment, including its readiness-related columns. The second lists Pods matching the label, with additional details such as their nodes. The request timeout limits an individual server request; it is not a guarantee that all client work finishes within ten seconds. [kubectl get options](https://v1-34.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

These commands do not change resources or change the saved current context. The examples were syntax-checked and their options reviewed locally; they were not executed against a live cluster for this article.

## Explain the result and the next decision

A command without interpretation leaves the hardest part to the reader. Add a small decision table next to it:

| Observation | Meaning and next step |
|---|---|
| Expected Deployment and Pods found | Compare readiness with the documented expected replica count and current rollout state |
| No Deployment found | Check environment, namespace, and workload naming before continuing |
| No Pods match the selector | Verify the actual labels; this alone does not prove that the service has no Pods |
| Forbidden response | Use the documented access/escalation process; the query did not establish workload health |
| Request timeout | Investigate API connectivity or availability through the platform path |
| Pods appear ready but customers still fail | Continue with dependency and request-path evidence; readiness is not end-to-end success |

Use your real expected values in the operational guide. “Looks healthy” is too vague. At the same time, a temporary readiness difference during an intended rollout should not automatically trigger recovery work.

The guide should say what evidence to capture, including the context, namespace, timestamp, and relevant output. Keep internal addresses and other operational details in the appropriate incident record rather than public updates.

## Add guardrails around state-changing recovery

When the investigation reaches a documented recovery condition, link to the approved procedure. That procedure needs the exact target, prerequisites, expected effect, relevant approval, abort condition, and a way to verify the result.

If a workaround changes traffic or capacity, record its scope and removal condition. If recovery changes persistent data, use the separately reviewed data-recovery procedure with its backup and consistency requirements.

Do not turn an action that happened to precede recovery into an unconditional instruction. The postmortem should establish the reason the action is appropriate, or the runbook should retain the uncertainty and escalation step.

## Define success in terms the next responder can observe

A successful command exit means the command completed as defined by the tool. It does not necessarily mean customers can complete the affected operation.

Pair infrastructure checks with the service's documented customer signal: a synthetic transaction, request error rate, queue completion, or another suitable measure. Specify the observation window and relevant cohort in the actual runbook. Avoid inventing a universal “wait five minutes” rule.

Document what to do if infrastructure recovers while old work remains delayed. The incident may need a separate backlog or integrity check before normal operation is declared restored.

## Rehearse with someone who did not write the update

Use staging or another approved test setting. Give the revised guide to a teammate who knows the required basics but did not write it. Observe where they need unstated knowledge, cannot find an input, or cannot interpret an outcome.

Include an unsuccessful branch, such as a missing workload or unavailable permission, in the exercise plan. The guide should help the reader recognize that condition without improvising a risky fix. AWS specifically recommends validating a runbook by having another team member use it. [Runbook validation](https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_ready_to_support_use_runbooks.html)

Record the tested version, environment, steps exercised, expected and actual results, and remaining gaps. A syntax check is useful but should not be reported as a successful operational rehearsal.

## Close the action on evidence, then maintain the guide

A useful completion record links the merged change, the alert entry point, the rehearsal result, and the guide owner. Keep untested branches visible with an assigned follow-up rather than claiming that the entire recovery process was verified.

Review the guide when service names, permissions, deployment tooling, or architecture change. The postmortem action has done its job when the next responder can find the guide, understand its scope, make the intended decision, and recognize whether the expected outcome occurred.
