# Validation Summary: How to Use pytest Parametrize

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- pytest (test framework)
- Python (language)
- `@pytest.mark.parametrize` decorator
- `pytest.param` helper
- `pytest.raises` for exception assertions
- `pytest.mark.skipif` / `pytest.mark.xfail`
- pytest fixtures (`@pytest.fixture`, indirect parametrization)

## Sources Consulted
- pytest official parametrize docs: https://docs.pytest.org/en/stable/how-to/parametrize.html
- pytest `pytest.param` reference: https://docs.pytest.org/en/stable/reference/reference.html#pytest-param
- pytest stacking-parametrize section (decorator iteration order): https://docs.pytest.org/en/stable/how-to/parametrize.html#pytest-mark-parametrize-parametrizing-test-functions
- pytest indirect parametrization: https://docs.pytest.org/en/stable/example/parametrize.html#indirect-parametrization
- Python `json.dumps` / `json.loads` docs: https://docs.python.org/3/library/json.html
- Python operator semantics (floor division `//`): https://docs.python.org/3/reference/expressions.html

## Issues Found

1. **Quick Reference — incorrect iteration order for stacked `parametrize`.**
   The comment claimed the order was `(1,10), (1,20), (2,10), (2,20)`. Per the pytest docs, when stacking decorators "parameters [are exhausted] in the order of the decorators" — the top decorator varies fastest, the bottom decorator varies slowest. With `@parametrize("a", [1, 2])` on top of `@parametrize("b", [10, 20])`, the actual order is `(a=1, b=10), (a=2, b=10), (a=1, b=20), (a=2, b=20)`. Updated the comment to `(1,10), (2,10), (1,20), (2,20)`.

2. **Debugging Failed Tests section — the "intentional_failure" case did not actually fail.**
   The example used `pytest.param(7, 2, 3, id="intentional_failure")` and asserted `7 // 2 == 3`. Since `7 // 2 == 3` in Python's integer division, the assertion would PASS, contradicting the section's premise. The accompanying bash output also showed the nonsensical `assert 3 == 3` as a failure message. Changed the expected value to `4` so the test genuinely fails, and updated the bash output to show the realistic `assert 3 == 4` failure message with the proper `+ where 3 = 7 // 2` introspection line.

## Review Notes

- The stacked-parametrize section earlier in the post ("3 HTTP methods x 4 endpoints = 12 test cases") shows the correct iteration order in its `--collect-only` output (endpoint-major, http_method-minor), matching pytest's behavior. Only the Quick Reference comment at the end had the order inverted.
- The `test_string_length` example in "Group Related Test Cases" uses a slightly odd assertion (`len(input_str.strip()) == expected_length or len(input_str) == expected_length`) that effectively short-circuits to pass for the chosen test data. It's not technically incorrect, but the design is weak — not changed since the task scope is fixing technical errors, not redesigning examples.
- The JSON serialization test uses `sort_keys=True` on the actual output and then compares parsed dicts, which is a roundabout way to verify equality but is functionally correct.
- All example modules (`myapp.validators`, `myapp.cart`, `myapp.client`, `myapp.paths`, `myapp.games`) are placeholders — they don't exist, but the post clearly presents them as illustrative imports for the parametrize patterns being demonstrated, which is acceptable.
- No deprecation concerns: `@pytest.mark.parametrize`, `pytest.param`, `indirect`, `marks`, and `pytest.raises(... match=...)` are all current, stable APIs in pytest 7.x/8.x.
