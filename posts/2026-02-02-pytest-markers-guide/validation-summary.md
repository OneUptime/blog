# Validation Summary: How to Handle pytest Markers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (3.10+, 3.12 typing features)
- pytest (built-in markers: skip, skipif, xfail, parametrize)
- pytest custom markers and `pytest.ini` / `pyproject.toml` registration
- pytest hooks (`pytest_collection_modifyitems`, `pytest_configure`, `pytest_generate_tests`)
- pytest fixtures (autouse, marker-aware)
- pytest-order plugin
- GitHub Actions (CI/CD workflow example)
- PyTorch (CUDA availability check in a marker example)
- Docker SDK for Python, redis-py (small example usages)
- PostgreSQL (CI service example)

## Sources Consulted
- pytest documentation – "How to use markers": https://docs.pytest.org/en/stable/how-to/mark.html
- pytest documentation – skip / skipif / xfail: https://docs.pytest.org/en/stable/how-to/skipping.html
- pytest documentation – parametrize: https://docs.pytest.org/en/stable/how-to/parametrize.html
- pytest hooks reference (`pytest_collection_modifyitems`, `pytest_generate_tests`): https://docs.pytest.org/en/stable/reference/reference.html
- Python `sys.platform` documentation: https://docs.python.org/3/library/sys.html#sys.platform (confirms Windows is `"win32"`)
- PEP 698 – `typing.override` (Python 3.12): https://peps.python.org/pep-0698/
- pytest-order plugin docs: https://pytest-order.readthedocs.io/
- pytest-ordering plugin docs: https://pytest-ordering.readthedocs.io/ (for disambiguation)
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- Docker SDK for Python `containers.run()` return-value semantics: https://docker-py.readthedocs.io/en/stable/containers.html

## Issues Found
1. **Incorrect Windows platform string in xfail example.** In the `test_unix_paths` example the condition was `sys.platform == "windows"`. Python's `sys.platform` returns `"win32"` on Windows (even 64-bit). The condition would never be true, so the xfail would never trigger as intended. Fixed to `sys.platform == "win32"`. (The same post uses `"win32"` correctly in the `tests/markers.py` snippet, so this was an internal inconsistency.)
2. **`_gpu_available()` called before being defined.** The original snippet placed the function definition *after* the module-level expression `requires_gpu = pytest.mark.skipif(not _gpu_available(), ...)`. At import time Python evaluates statements top-to-bottom, so this would raise `NameError`. Reordered the function definition above the `requires_gpu` assignment so the module loads cleanly.
3. **Wrong plugin name for the `@pytest.mark.order(...)` example.** The text said "pytest-ordering plugin" but the syntax used (`@pytest.mark.order(1)`, `@pytest.mark.order("last")`) is the **pytest-order** plugin. pytest-ordering uses `@pytest.mark.run(order=N)` or aliases like `@pytest.mark.first`/`@pytest.mark.last`. Updated the comment to reference pytest-order, which matches the code shown.

## Review Notes
- The autouse `slow_test_timeout` fixture uses `signal.SIGALRM` / `signal.alarm`, which are Unix-only. This is consistent with pytest's own caveats around `signal`-based timeouts, but readers running on Windows should be aware that this fixture will fail there. Not changed because the surrounding educational context is clear and the post does not claim cross-platform support for this snippet.
- The `test_database_compatibility` example references `os.environ.get(...)` and `create_test_database(...)` without importing/defining them in the shown snippet. This is acceptable for an illustrative excerpt; left as-is.
- The CI workflow defines a `nightly-tests` job guarded by `if: github.event_name == 'schedule'` but the workflow's `on:` trigger only lists `[push, pull_request]`, so the job would never run as written. This is a structural omission in the example rather than a syntactic error and isn't directly tied to the markers topic; left as-is to avoid scope creep.
- Two separate `pytest_collection_modifyitems` examples are shown in different sections. If a reader literally combined both into one `conftest.py`, the second would override the first. The post presents them as independent illustrations, which is acceptable but worth keeping in mind.
- All pytest APIs referenced (`pytest.mark.skip`, `skipif`, `xfail`, `parametrize`, `pytest.param(..., marks=...)`, `request.node.get_closest_marker`, `item.add_marker`, `item.fixturenames`, `config.addinivalue_line`, `metafunc.parametrize`, `metafunc.definition.get_closest_marker`) are current and supported in modern pytest (8.x).
- `from typing import override` (PEP 698) is correctly described as a Python 3.12+ feature.
