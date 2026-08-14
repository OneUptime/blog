# Choose Infrastructure Tests for Pull Requests and Nightly Runs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Infrastructure Testing, CI/CD, Terraform, Test Strategy, Pull Requests, Scheduled Testing

Description: Place fast deterministic risk checks on pull requests and use scheduled suites for broad cloud, version, region, failure, and cleanup coverage.

---

The right split is not cheap tests on pull requests and good tests at night. Pull-request checks must block the common, high-impact regressions introduced by the change. Scheduled suites expand breadth across slow services, regions, versions, failure modes, and cleanup conditions that would make every review unreasonably long.

Classify each test by detection value, runtime, external cost, flake risk, and how long the organization can tolerate the defect remaining undetected. Then make both lanes owned and actionable.

## Start With the Feedback Objective

A pull-request author needs a trustworthy answer before merge. The blocking lane should generally finish within the team's review loop and return stable status names. It should catch:

- invalid Terraform and provider schemas;
- module logic and input regressions;
- unsafe plan actions;
- organization policy violations;
- the primary real-cloud behavior affected by the change;
- cleanup failure in any live smoke environment.

A nightly lane answers broader questions:

- do all supported Terraform and provider combinations still work;
- do secondary regions or zones behave as expected;
- do slow managed services create, update, replace, and destroy;
- do recovery, negative-access, and failure scenarios meet objectives;
- have cloud API or default changes broken an unchanged module;
- are expired resources and state accumulating.

If a defect cannot safely wait until the next schedule, its test does not belong only in nightly.

## Build a Layered Pull-Request Gate

Run the cheapest credible evidence first:

1. formatting and repository generation checks;
2. `terraform init` with committed dependency decisions;
3. `terraform validate`;
4. native plan tests and provider-mock tests;
5. static and plan policy checks;
6. targeted real-cloud smoke tests for changed behavior;
7. cleanup verification.

Terraform's test language supports plan-only runs and apply runs, while provider mocking is available in Terraform 1.7 and later. Use plan and mocks for expression logic and computed-value flow. They do not prove remote API acceptance, IAM, networking, or service behavior.

A real-cloud smoke test should be small but end to end. For a changed private endpoint module, apply one endpoint in a test account, probe it from the intended network and identity, verify the prohibited path, then destroy it. Do not wait for the nightly suite to discover that every consumer has lost connectivity.

## Use Change Impact Without Ignoring Dependencies

Path filters can avoid running a database suite for a documentation-only change, but Terraform modules have transitive consumers. A change to shared provider constraints, test helpers, policy, backend setup, or a nested module can affect many directories.

Maintain an explicit dependency graph and apply conservative rules:

- changes within a module run that module's checks;
- changes to a shared child run all known consumers;
- provider or Terraform constraints run compatibility checks;
- policy changes run every policy fixture and representative real plans;
- fixture or CI identity changes run affected live smoke tests;
- uncertain impact runs the broader pull-request lane.

Periodically compare change-impact decisions with nightly results. If nightly repeatedly finds defects in suites the pull-request selector skipped, repair the dependency model.

Do not let contributors modify the selector in the same untrusted change and thereby skip required privileged tests without protected review.

## Put Breadth and Slow Transitions on the Schedule

A scheduled suite is a good home for dimensions with lower per-change probability but meaningful cumulative risk:

- supported Terraform Core minimum and current versions;
- provider minimum, pinned consumer, and newest-compatible selections;
- secondary regions, availability-zone counts, and architectures;
- upgrade from the last module release to the candidate or main branch;
- resource replacement and create-before-destroy rehearsal;
- backup, restore, failover, and disaster-recovery drills;
- quota pressure and bounded throttling behavior;
- negative identity and network tests;
- full inventory and orphan cleanup audit.

Do not create a full Cartesian product. Choose combinations that represent a support promise, consumer baseline, or known interaction. Rotate lower-risk dimensions if the complete set is too expensive, while keeping declared minimums and critical recovery paths regular.

Nightly is a label, not a universal cadence. An expensive regional disaster drill may run weekly; a provider-upgrade probe may run daily; an orphan inventory may run hourly. Choose the maximum detection delay from risk.

## Use a Risk and Cost Matrix

Score each scenario with evidence rather than intuition:

| Property | Pull request | Scheduled |
| --- | --- | --- |
| Deterministic and under a few minutes | Usually all relevant changes | Repeat as integration sentinel |
| High-impact common regression | Blocking | Also run to detect external drift |
| Expensive multi-region matrix | One representative cell | Full selected matrix |
| Destructive replacement or recovery | Plan gate; live if change requires it | Regular controlled rehearsal |
| Flaky due to test defect | Fix or quarantine with owner | Not silently retried into green |
| Cloud-default drift with no code change | Optional main-branch sentinel | Strong fit |
| Cleanup and orphan inventory | Verify current run | Reconcile all expired runs |

Runtime alone is insufficient. A 15-minute test that prevents a frequent production outage may deserve a pull-request gate, perhaps on impacted changes. A two-minute test with no distinct evidence may not deserve either lane.

## Keep Scheduled Results Actionable

A red nightly dashboard that nobody owns is delayed noise. Every scheduled scenario needs:

- an owner and response objective;
- the last known passing commit and dependency selections;
- safe artifacts that identify setup, assertion, and cleanup stages;
- classification for product regression, external service change, fixture failure, quota, or test defect;
- an issue or incident path when failure persists;
- a policy for blocking releases or merges if the main branch is known bad.

When nightly finds a code regression, add or promote the smallest reliable reproducer to the pull-request lane. This shortens detection for the next occurrence.

In GitHub Actions, a scheduled workflow runs on the latest commit on the default branch. Record that ref and commit, plus any different ref the job explicitly checks out. A failure on yesterday's default-branch commit should not be attributed automatically to the newest pull request.

## Treat Flakes as Failed Test Engineering

Do not put an unreliable test in nightly merely to hide it from reviewers. Flakes consume cloud resources, obscure real failures, and train operators to ignore red results.

Classify the source:

- eventual convergence needs condition polling with an overall deadline;
- shared names or state need per-run isolation;
- account throttling needs bounded concurrency;
- fixture outages need health checks and separate attribution;
- nondeterministic assertions need stable contracts;
- provider or cloud defects need a documented, time-bounded quarantine.

Automatic reruns should preserve the first failure and distinguish attempt results. A test that passes on retry is evidence of instability, not an unconditional green.

Do not retry invalid plans, policy failures, or deterministic name collisions as though they were transient. Treat authorization denials as failures unless a documented IAM propagation window applies; when it does, use bounded polling.

## Coordinate Concurrency and Quotas Across Lanes

Pull-request and scheduled jobs often share a test account. A midnight matrix can exhaust quotas and make a late pull request fail. Allocate separate accounts or quota pools where practical, or enforce one scheduler across both lanes.

Reserve capacity for cleanup and critical smoke tests. Set per-service concurrency from public IPs, network interfaces, clusters, databases, API rates, and cost limits rather than runner count. Terraform's `-parallelism` controls operations inside one command, not the number of CI jobs using an account.

Give every run unique state and resource ownership. Scheduled suites need the same expiry and janitor controls as pull-request tests; their larger matrices make cleanup failures more costly.

## Keep Versions Reproducible

The pull-request lane should use the organization's pinned Terraform and provider baseline plus any version directly affected by the change. Commit the root harness dependency lock file and verify `terraform version` and `terraform providers`.

The scheduled upgrade lane intentionally runs `terraform init -upgrade` in an isolated working directory to select the newest versions allowed by constraints. Save the lock-file diff and sanitized plan summary for review. Do not let that job rewrite the baseline lock file without an explicit dependency update pull request.

Remember that Terraform's lock file records provider selections, not remote module selections. Pin module versions or Git commits in compatibility harnesses.

## Define Promotion Rules

Review the suite regularly:

- promote a nightly test when its failure cannot wait or it catches a repeated change-related regression;
- demote a pull-request dimension when evidence shows low change sensitivity and excessive cost, while retaining a representative blocking case;
- delete duplicate assertions that add no evidence;
- split an oversized test so the high-value contract can run earlier;
- retire unsupported version cells when the published support policy changes;
- raise the schedule frequency when external drift is detected too late.

Publish duration, queue time, cloud cost, flake rate, defects caught before merge, defects caught on schedule, cleanup failures, and mean time to ownership. Optimize for prevented risk and useful feedback, not the raw number of tests.

## Official Documentation

- [Terraform test language](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform provider mocking](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform test command and cleanup](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform dependency lock file](https://developer.hashicorp.com/terraform/language/files/dependency-lock)
- [Terraform plan command](https://developer.hashicorp.com/terraform/cli/commands/plan)
- [GitHub Actions events including schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [GitHub Actions concurrency](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency)
- [Open Policy Agent policy testing](https://www.openpolicyagent.org/docs/policy-testing)

## Conclusion

Pull requests need deterministic checks for module logic, plan safety, policy, and the primary real behavior affected by a change. Scheduled suites should expand versions, regions, upgrades, failures, recovery, and cleanup without becoming an ignored second-class lane. Use risk and detection delay to place each scenario, then promote nightly discoveries into faster regression tests.
