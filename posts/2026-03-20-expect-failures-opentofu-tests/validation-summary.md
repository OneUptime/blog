# Validation Summary: How to Use expect_failures in OpenTofu Tests

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu testing (`.tftest.hcl` run blocks)
- HCL
- OpenTofu custom conditions (`validation`, `precondition`, `postcondition`, `check`)

## Sources Consulted
- OpenTofu test command documentation: https://opentofu.org/docs/cli/commands/test/
- OpenTofu checks documentation: https://opentofu.org/docs/language/checks/
- OpenTofu custom conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu official source, `internal/configs/test_file.go` for valid `expect_failures` reference types: https://github.com/opentofu/opentofu/blob/main/internal/configs/test_file.go
- OpenTofu official source, `internal/moduletest/run.go` for expected vs unexpected failure handling: https://github.com/opentofu/opentofu/blob/main/internal/moduletest/run.go

## Issues Found
- The introduction described `expect_failures` too broadly, as though any resource, variable, or data source error would qualify. I corrected it to say that `expect_failures` is for checkable objects reporting errors from custom conditions.
- The syntax example omitted output references even though OpenTofu supports `output.<name>` in `expect_failures`. I added `output.some_output` to make the supported scope more accurate.
- The postcondition section said postconditions “fire after apply.” I corrected this to match OpenTofu’s behavior: postconditions are checked after object evaluation, and `apply` is specifically needed when the condition depends on values that are only known after changes are applied.
- The `check` block section incorrectly said checks run after every apply and included a version claim that was not supported by the current OpenTofu docs. I changed this to the documented behavior that checks run at the end of plan and apply operations.
- The commented `check` example referenced `data.http.health` without defining that data source. I added the scoped `data "http" "health"` block so the example is internally consistent.
- The pitfalls section incorrectly claimed that a different failure would still let the test pass. I replaced that with the actual OpenTofu behavior: unexpected failures are still reported, and OpenTofu also emits a missing expected failure error for the object that was supposed to fail.
- The pitfalls section also implied a blanket rule about mixing `expect_failures` and `assert` that is not stated in the docs and is not how the implementation is generally described. I replaced that text with the documented limitation that `expect_failures` only applies to custom conditions, not provider-side validation or generic provider errors.

## Review Notes
- The example URL `https://httpstat.us/503` is plausible for demonstration, but it is a third-party endpoint and may be less stable than a mocked response in automated tests.
