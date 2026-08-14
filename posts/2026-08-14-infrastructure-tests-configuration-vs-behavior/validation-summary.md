# Validation Summary: Should Infrastructure Tests Check Configuration or Real Behavior?

## Status
validated

## Post Type
Technical guide / infrastructure testing best-practices article

## Technologies Covered
- Terraform CLI and saved-plan JSON
- Terraform native tests and plan-mode assertions
- Terraform provider mocking
- Open Policy Agent policy checks for Terraform plans
- Terratest and Go testing
- Cloud provider control-plane APIs and SDKs
- End-to-end behavior, security, reliability, and cleanup testing

## Sources Consulted
- HashiCorp: Terraform test language — https://developer.hashicorp.com/terraform/language/tests
- HashiCorp: Terraform provider mocking — https://developer.hashicorp.com/terraform/language/tests/mocking
- HashiCorp: `terraform test` command, state management, and cleanup — https://developer.hashicorp.com/terraform/cli/commands/test
- HashiCorp: `terraform plan` command and refresh behavior — https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp: `terraform show` command and JSON sensitivity warning — https://developer.hashicorp.com/terraform/cli/commands/show
- HashiCorp: Terraform JSON output format and change-action representation — https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp: Terraform state behavior — https://developer.hashicorp.com/terraform/language/state
- Open Policy Agent: Terraform plan policy limitations — https://www.openpolicyagent.org/docs/terraform
- Gruntwork: Terratest documentation — https://terratest.gruntwork.io/docs/
- Gruntwork: Terratest cleanup best practices — https://terratest.gruntwork.io/docs/testing-best-practices/cleanup/
- Go standard library: `testing` package — https://pkg.go.dev/testing
- AWS: EC2 API idempotency behavior — https://docs.aws.amazon.com/ec2/latest/devguide/ec2-api-idempotency.html

## Issues Found
1. **Native test assertions were described as exposing plan actions.** Terraform test assertions can reference named configuration values and run outputs, but they do not expose the saved plan's create, update, delete, or replacement action list. Clarified that native plan-mode assertions inspect available planned values, while change actions are available in JSON generated from a saved plan.
2. **The plan-JSON and pull-request safety wording was too broad.** Clarified that the documented full plan representation comes from running `terraform show -json` on a saved plan, that unmocked plans may read remote APIs, and that saved plans and JSON output may contain sensitive values. Added guidance to scope credentials and protect those artifacts.
3. **Mock-provider behavior was described imprecisely.** Replaced the statement that mocks reproduce schemas and user-supplied overrides with the documented behavior: mock providers use the original schema, preserve configured values, and generate fake computed values unless mock data or overrides supply them. Also clarified that they do not create or read remote infrastructure.
4. **The idempotency-key caveat was incomplete.** Merely supplying a key does not guarantee safe retries. Clarified that the API must honor idempotency and the retry must reuse the key for the same request.
5. **Cleanup registration and state retention were not scoped precisely.** Changed the custom/Terratest guidance to register destroy before apply so partial deployments are covered, and scoped retained recovery state to those harnesses because native `terraform test` keeps its test state in memory.

## Review Notes
- Terraform's native test framework requires Terraform 1.6 or later; provider mocking requires Terraform 1.7 or later. The post does not claim compatibility with older versions.
- Mocked computed values are unknown during a plan by default and are generated during apply unless the test uses `override_during = plan`. The post does not depend on those values being available during plan.
- All nine external links in the post resolved successfully and matched their labels. The author URL redirects to its canonical `github.com` form; the technical documentation URLs did not redirect or fail.
- The remaining layered-testing, behavior-probe, negative-test, polling, drift, and native Terraform cleanup guidance matched the consulted documentation and authoritative sources.
