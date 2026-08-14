# Retry Terratest Assertions Without Hiding Real Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terratest, Eventual Consistency, Retry, Go Testing, Cloud API

Description: Replace fixed sleeps with bounded observation retries that distinguish temporary cloud convergence from permanent configuration and permission failures.

---

A successful Terraform apply means the provider accepted the requested changes and recorded the resulting state. It does not guarantee that every cloud control plane, data plane, DNS resolver, IAM authorizer, or load balancer health check has converged by the next line of a Go test.

Terratest suites flake when they treat a temporarily stale read as a final assertion. They also become dangerously slow when they retry every error, including invalid credentials and broken configuration. The solution is a bounded retry around a read-only observation, with permanent failures rejected immediately.

## Identify the Consistency Boundary

Common eventually consistent transitions include:

- a newly created IAM policy becoming usable by another service;
- DNS records reaching the resolver used by the test;
- a load balancer registering healthy targets;
- an instance or cluster API moving from created to ready;
- a deleted object disappearing from list and get operations;
- a resource tag appearing in a secondary inventory API.

Write the expected transition explicitly:

~~~text
accepted -> provisioning -> ready
~~~

Then define which intermediate states are retryable, which state is success, and which terminal states fail immediately. “Keep trying until no error” is not a test contract.

## Retry the Observation, Not the Provisioning Action

Apply once, then poll a safe read:

~~~go
package test

import (
	"fmt"
	"testing"
	"time"

	"github.com/gruntwork-io/terratest/modules/retry"
	"github.com/stretchr/testify/require"
)

func waitForServiceReady(t *testing.T, serviceID string) {
	t.Helper()

	const maxRetries = 30
	const delay = 10 * time.Second

	_, err := retry.DoWithRetryE(
		t,
		"wait for the service data plane",
		maxRetries,
		delay,
		func() (string, error) {
			status, err := readServiceStatus(serviceID)
			if err != nil {
				if isRetryableStatusError(err) {
					return "", err
				}
				return "", retry.FatalError{Underlying: err}
			}

			switch status {
			case "READY":
				return status, nil
			case "CREATING", "UPDATING":
				return "", fmt.Errorf("service is still %s", status)
			default:
				return "", retry.FatalError{Underlying: fmt.Errorf(
					"service entered terminal state %s", status,
				)}
			}
		},
	)

	require.NoError(t, err)
}
~~~

The `retry.FatalError` marker makes a terminal failure exit immediately, while transitional states return ordinary retryable errors. Implement `isRetryableStatusError` with stable SDK error types or codes for the service; do not classify every read error as temporary. Pin the Terratest version so helper behavior changes are reviewed explicitly.

Do not put `terraform.InitAndApply` inside the retry closure. Reapplying after an ambiguous failure can repeat non-idempotent provider behavior, increase quota usage, and obscure the original diagnostic. Terratest's `terraform.WithDefaultRetryableErrors` handles known transient Terraform command errors; it is not a substitute for service-readiness polling.

## Prefer Typed Errors and Provider Waiters

If a cloud SDK offers an official waiter for the exact state transition, prefer it. Provider waiters usually understand service-specific terminal states and retryable API responses better than a test-wide regular expression.

When writing a custom poller, classify errors by stable code or type:

~~~go
status, err := client.GetStatus(ctx, serviceID)
if err != nil {
	if isNotFoundDuringPropagation(err) || isThrottled(err) {
		return "", err
	}
	return "", retry.FatalError{Underlying: err}
}
~~~

Avoid treating these as retryable by default:

- authentication or authorization denied;
- invalid region, project, subscription, or account;
- malformed request or validation error;
- a terminal failed/deleted state when ready was expected;
- an assertion showing the wrong immutable configuration;
- a context cancellation or overall test deadline.

Terratest's `DoWithRetryableErrorsE` accepts a map of regular expressions for command output and errors. It is useful for a narrow command-line integration, but typed SDK classification is more robust when available.

## Bound Retries by Time and Attempts

Set a budget from the service's observed convergence objective, not a copied sleep:

~~~text
30 retries x 10 seconds = roughly 5 minutes plus API latency
~~~

The retry budget must fit inside:

- the Go test timeout;
- the CI job timeout;
- credential lifetime;
- the time reserved for `terraform destroy`;
- the service's API rate limit.

If the CI job is 30 minutes, do not let a readiness loop consume 29 minutes and leave no cleanup window. Pass contexts to SDK calls and use context-aware Terratest helpers available in the pinned release so cancellation can stop in-flight operations.

Fixed intervals are simple and supported by Terratest's core retry functions. For many parallel tests, add bounded jitter in a custom context-aware loop or use the cloud SDK waiter to avoid synchronized polling bursts. Keep the maximum delay low enough to observe success without wasting most of the test budget.

## Assert the Real Behavior After Readiness

Resource state and service behavior are different assertions:

~~~go
waitForServiceReady(t, serviceID)

response, err := callServiceEndpoint(t.Context(), endpoint)
require.NoError(t, err)
require.Equal(t, 200, response.StatusCode)
require.Contains(t, response.Body, "healthy")
~~~

`testing.T.Context()` requires Go 1.24 or later. On older supported Go releases, pass an explicitly created bounded context instead.

A cloud API reporting `ACTIVE` may not prove routing, TLS, DNS, or application health. Conversely, an HTTP endpoint can become ready before a secondary status API catches up. Choose the readiness gate that protects the actual behavior assertion.

Terratest includes service-oriented helpers such as HTTP retry functions. Use them when their success criteria match the test. Do not wrap a broad assertion suite in one retry; retry only the smallest observation known to converge.

## Make Retry Failures Diagnosable

Log a compact record on each attempt:

~~~text
attempt=7 elapsed=61s state=CREATING request_id=abc123
~~~

On final failure, include:

- resource ID, account, and region;
- last observed state and provider error code;
- attempts and elapsed time;
- cloud request IDs where available;
- the applied Terraform output needed to find the resource;
- a redacted API response or status history.

Do not log credentials, sensitive Terraform outputs, or full state. A retry loop that reports only “max retries exceeded” turns a five-minute failure into an incident without evidence.

## Keep Apply Retries and Assertion Retries Separate

Terratest's quick-start examples wrap `terraform.Options` with `terraform.WithDefaultRetryableErrors`. That helps known retryable errors from Terraform commands. It does not prove the resource's data plane is ready.

Use separate policies:

| Layer | Retry owner | Example |
| --- | --- | --- |
| provider/Terraform command | provider or narrowly configured Terraform helper | API throttling during apply |
| resource readiness | SDK waiter or Terratest observation loop | load balancer target becomes healthy |
| service behavior | protocol-specific helper | HTTP returns expected body |
| cleanup convergence | destroy helper plus independent janitor | deletion completes asynchronously |

Nested retries multiply attempts. If an SDK retries internally, record its policy and give the outer poller a budget that accounts for per-call delay.

## Test the Retry Logic Itself

Make the poller accept an observation function and delay policy. Unit test it with a fake sequence:

~~~text
not found -> creating -> ready
permission denied
creating until deadline
failed terminal state
~~~

Use a fake clock or injectable sleeper so unit tests run immediately. Confirm that permanent errors make one call, transient sequences stop on success, and deadline cancellation interrupts waiting.

The real-cloud test should validate the cloud behavior, not whether a hand-written retry loop can count to thirty.

## Cleanup Has Its Own Consistency Window

Register destroy before apply so ordinary test failures still trigger it:

~~~go
terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
	TerraformDir: "../examples/service",
})

defer terraform.Destroy(t, terraformOptions)
terraform.InitAndApply(t, terraformOptions)
~~~

Those function names match the classic `github.com/gruntwork-io/terratest/modules/terraform` package. Context-capable Terraform helpers are available in the separate `modules/terraform/v2` package, which is still a v2 beta as of this writing. If you adopt it, pin the exact beta and give destroy a fresh bounded cleanup context rather than a context that may already be cancelled. Most importantly, a hard process kill bypasses `defer`; ownership tags and an external janitor remain necessary.

## Official Documentation

- [Terratest retry package API](https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/retry)
- [Terratest quick start and default Terraform retry errors](https://terratest.gruntwork.io/docs/getting-started/quick-start/)
- [Terratest classic Terraform helper API](https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform)
- [Terratest v2 beta context-capable Terraform API](https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform/v2)
- [Terratest HTTP helper package](https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/http-helper)
- [Go testing package: cleanup, contexts, and timeouts](https://pkg.go.dev/testing)
- [Terraform test command cleanup guidance](https://developer.hashicorp.com/terraform/cli/commands/test)

## Conclusion

Cloud convergence belongs in a bounded, observable polling step. Apply once, retry a read-only observation, fail permanent states immediately, and leave time for cleanup. Provider waiters and typed errors produce stronger tests than fixed sleeps or broad string matching, while a final behavior probe confirms what users actually depend on.
