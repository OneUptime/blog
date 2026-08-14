# Policy Tests vs Behavior Tests for Infrastructure Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Testing, Policy as Code, Open Policy Agent, Checkov, Terratest, Terraform

Description: Decide whether an infrastructure rule belongs in plan policy, static analysis, or a real behavior test by identifying the evidence needed to prove it.

---

The question is not whether OPA, Checkov, or Terratest is the best testing tool. Each observes a different system. A policy engine can decide whether declared or planned infrastructure conforms to a rule. A live test can decide whether the deployed service behaves as required from a particular client and network position.

Choose the test from the evidence the rule needs. If a rule says every object-storage bucket must have a required encryption configuration, plan policy can usually evaluate it before apply. If the rule says an unauthenticated client must be unable to read an object, only a request against the deployed access path proves that behavior.

## Name the Rule Before Choosing the Tool

Rewrite an informal requirement as a predicate with an input and a decision:

```text
Input: every managed network ingress rule in a Terraform plan
Decision: deny when a rule allows TCP/22 from 0.0.0.0/0
```

That is a plan policy. It needs no VM and no packet because the forbidden configuration is itself the rule.

Now compare a behavioral requirement:

```text
Input: a TCP connection attempted from the public test runner
Decision: fail when the private service accepts the connection
```

The result depends on routing, firewalls, load balancers, DNS, service listeners, and the origin of the probe. A static scanner cannot prove the end-to-end path. It may still block an obviously dangerous declaration earlier, but that is a related control, not the same evidence.

## What Static and Plan Policy Can Prove

Checkov-style static checks inspect configuration and graph relationships. They are fast, can run before credentials are available, and can provide feedback on the exact block that violates a convention. They fit rules such as:

- approved provider sources and module sources;
- required explicit logging or encryption arguments;
- forbidden resource types or regions encoded in configuration;
- tags or labels that must be declared;
- obvious public ingress or wildcard identity policies;
- organization conventions that should apply to every repository.

OPA and Sentinel can evaluate Terraform plan data after Terraform has evaluated the configuration as far as possible and asked providers to propose planned values. Plan policy can see proposed actions and many resulting values, so it fits rules such as:

- replacement or deletion of protected resource categories;
- a planned resource value after module composition;
- blast-radius thresholds;
- relationships visible only after `for_each`, conditionals, and modules are evaluated;
- mandatory organization gates between plan and apply.

OPA's official Terraform guidance notes important plan limitations: computed values may be unknown until apply, and not all dynamic information is available. A policy must distinguish unknown from absent or allowed. If the decision requires an apply-time identifier or service-chosen default, either reject unknowns conservatively, provide a documented exception, or move that evidence to an apply-based check.

## What Behavior Tests Can Prove

Terratest is a Go library commonly used to deploy infrastructure, call cloud or service APIs, and make ordinary Go assertions. Its value is not the language; it is the ability to observe the real control plane and data plane. Behavioral tests fit requirements such as:

- a private endpoint resolves and connects from an allowed subnet but not from a public runner;
- a workload identity can perform one allowed operation and receives a denial for a prohibited operation;
- a load balancer becomes healthy and serves the expected certificate and response;
- encrypted data can be recovered after failover with the intended key permissions;
- an update preserves the service objective or creates the documented interruption;
- deletion protection, retention, or recovery behavior works through the actual API.

Behavior tests cost more, take longer, and can fail because the test environment is unhealthy. They also require safe cleanup and bounded convergence polling. Use them for properties that cannot be inferred reliably from the plan.

## Do Not Confuse Declared Intent With Effective State

A plan might declare no public ingress, yet the service can still be reachable through a different security group, inherited firewall, shared proxy, stale endpoint, or provider-managed path. Conversely, a scanner may flag `0.0.0.0/0` on a rule whose target has no public route. The configuration is still broader than the rule allows, but the immediate reachability risk differs.

This distinction produces two legitimate controls:

1. **Prevent forbidden intent:** no plan may declare broad SSH ingress.
2. **Verify effective behavior:** the private endpoint must reject a probe from outside the test network.

Run both when both are requirements. Do not describe the behavior test as a replacement for the guardrail. If a topology accident makes the public probe impossible today, the broad rule remains dangerous for a future routing change.

## Avoid Duplicating the Same Assertion Everywhere

Repeating one tag rule in module tests, Checkov, OPA, Terratest, and a shell script creates five sources of truth. Assign ownership by scope:

| Rule scope | Primary home |
| --- | --- |
| Input relationships inside one module | Terraform native test |
| Organization-wide configuration convention | Static policy such as Checkov |
| Organization-wide planned outcome or action | OPA or Sentinel plan policy |
| Effective cloud or service behavior | Terratest or another integration harness |
| Production drift over time | Continuous configuration and behavior monitoring |

A lower layer can add a faster regression test for its own implementation, but the authoritative rule and message should live in one place. Link other tests to the same rule identifier so exceptions, owners, and severity stay consistent.

## Test Policy Code Like Application Code

A policy that blocks infrastructure is production code. Give it small positive and negative fixtures:

```rego
package terraform.network

import rego.v1

deny contains message if {
  some change in input.resource_changes
  change.mode == "managed"
  change.type == "example_ingress_rule"
  change.change.after.cidr == "0.0.0.0/0"
  change.change.after.protocol == "tcp"
  change.change.after.port == 22
  message := sprintf("%s allows public TCP/22", [change.address])
}
```

`input.resource_changes` assumes that raw `terraform show -json` output is passed directly to OPA. HCP Terraform wraps the plan under `input.plan`, so use `input.plan.resource_changes` for the equivalent policy there.

This compact rule handles only known `cidr`, `protocol`, and `port` values. A production policy must also inspect the corresponding paths in `change.change.after_unknown` and apply its documented deny, defer, or exception decision.

Use a provider-specific resource type and schema in a real policy. The example is neutral so it does not imply a schema that every provider implements. Unit tests should cover create and update actions, nested modules, absent fields, unknown values, multiple violations, and resources outside the rule's scope.

OPA provides `opa test` for policy tests. Checkov supports custom policies in Python or YAML according to its documented frameworks. HCP Terraform can enforce OPA or Sentinel policy sets on plans, with advisory or mandatory behavior depending on configuration. Test the local policy and separately exercise the exact CI or HCP integration so a wrong query path cannot silently skip enforcement.

## Design Behavior Tests Around an Observation Point

Every behavioral claim needs a named observer. A connectivity result from a public GitHub-hosted runner does not prove connectivity from a private application subnet. An administrative cloud API saying a resource is available does not prove its data endpoint accepts traffic.

For each test, document:

- where the probe executes;
- which identity and DNS resolver it uses;
- which endpoint, protocol, and certificate name it targets;
- the allowed result and the prohibited result;
- the bounded time allowed for convergence;
- what diagnostic data is safe to collect;
- who owns resource teardown.

Use eventual assertions only for states the official service documentation describes as asynchronous. Poll a specific condition with an overall deadline and a useful last error. A blanket sleep makes a test slow when the service is ready and flaky when it is not.

## Use a Decision Sequence

Route a new rule through this sequence:

1. Is the rule about source syntax or an explicit argument? Use static configuration policy.
2. Is it about the evaluated plan, including actions and composed values? Use plan policy.
3. Is a required value unknown until apply? Decide whether unknown should deny, defer, or require a live test.
4. Is it about effective permissions, packets, service health, durability, or recovery? Use a behavior test.
5. Is it required continuously rather than only during delivery? Add production monitoring or drift evaluation.

Some requirements intentionally produce more than one answer. Defense in depth is useful when each layer catches a distinct failure mode and has a clear owner.

## Roll Out Enforcement Safely

Before making a policy mandatory, run it in advisory mode against representative plans, measure false positives, define narrow time-bounded exceptions, and test policy failure handling. A policy service outage must have an explicit fail-open or fail-closed decision based on risk.

Before putting a behavior test on every pull request, measure duration, quota use, and flake rate. Keep one representative smoke path blocking and move broad region, version, or failure matrices to scheduled runs if needed. A failed cleanup must be reported independently from the assertion result; otherwise a green behavior test can still leave costly infrastructure behind.

## Official Documentation

- [Open Policy Agent with Terraform](https://www.openpolicyagent.org/docs/terraform)
- [Open Policy Agent policy testing](https://www.openpolicyagent.org/docs/policy-testing)
- [Checkov custom policies overview](https://www.checkov.io/3.Custom%20Policies/Custom%20Policies%20Overview.html)
- [HCP Terraform policy enforcement](https://developer.hashicorp.com/terraform/enterprise/workspaces/policy-enforcement)
- [HCP Terraform OPA and Sentinel policy tutorial](https://developer.hashicorp.com/terraform/tutorials/cloud/drift-and-policy)
- [Terraform test language](https://developer.hashicorp.com/terraform/language/tests)
- [Terratest documentation](https://terratest.gruntwork.io/docs/)

## Conclusion

Put a rule in policy when the declared configuration or evaluated plan contains enough evidence to decide it. Use a live behavior test when the requirement depends on effective permissions, network paths, service convergence, or runtime responses. Keeping those evidence boundaries explicit gives fast preventive feedback without mistaking a valid plan for a working and secure service.
