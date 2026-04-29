# JSON Output for OpenTofu Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, JSON, CI/CD, Infrastructure as Code

Description: Learn how to use JSON-formatted test output in OpenTofu to integrate test results with CI/CD pipelines and reporting tools.

## Why JSON Output for Tests?

OpenTofu's native test runner produces human-readable output by default. JSON output enables:

- Machine-readable test results for CI/CD pipeline parsing
- Integration with test reporting dashboards (JUnit, Allure, etc.)
- Automated pass/fail gates in deployment workflows
- Log aggregation and structured querying

## Enabling JSON Output

Run `tofu test` with the `-json` flag:

```bash
tofu test -json
```

This outputs a stream of JSON UI messages, one per line.

## Sample JSON Output

```json
{"@level":"info","@message":"OpenTofu 1.11.0","@module":"tofu.ui","@timestamp":"2026-03-20T10:00:00.000Z","tofu":"1.11.0","type":"version","ui":"1.2"}
{"@level":"info","@message":"Found 1 file and 1 run block","@module":"tofu.ui","@timestamp":"2026-03-20T10:00:00.100Z","test_abstract":{"tests/vpc.tftest.hcl":["create_vpc"]},"type":"test_abstract"}
{"@level":"info","@message":"tests/vpc.tftest.hcl... pass","@module":"tofu.ui","@testfile":"tests/vpc.tftest.hcl","@timestamp":"2026-03-20T10:00:15.000Z","test_file":{"path":"tests/vpc.tftest.hcl","status":"pass"},"type":"test_file"}
{"@level":"info","@message":"  \"create_vpc\"... pass","@module":"tofu.ui","@testfile":"tests/vpc.tftest.hcl","@testrun":"create_vpc","@timestamp":"2026-03-20T10:00:15.000Z","test_run":{"path":"tests/vpc.tftest.hcl","run":"create_vpc","status":"pass"},"type":"test_run"}
{"@level":"info","@message":"Success! 1 passed, 0 failed.","@module":"tofu.ui","@timestamp":"2026-03-20T10:00:15.000Z","test_summary":{"status":"pass","passed":1,"failed":0,"errored":0,"skipped":0},"type":"test_summary"}
```

## Parsing JSON Output in Shell

```bash
tofu test -json | jq -c 'select(.type == "test_run") | .test_run | {run, status}'
```

Output:
```json
{"run":"create_vpc","status":"pass"}
{"run":"verify_outputs","status":"pass"}
```

## Converting to JUnit XML for CI/CD

Many CI systems and test reporting tools accept JUnit XML. Convert with a small script:

```bash
#!/bin/bash
tofu test -json > test-results.ndjson

python3 - <<'EOF'
import json
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

results = []
with open("test-results.ndjson", encoding="utf-8") as f:
    for line in f:
        obj = json.loads(line)
        if obj.get("type") == "test_run":
            results.append(obj["test_run"])

suite = Element(
    "testsuite",
    name="OpenTofu",
    tests=str(len(results)),
    failures=str(sum(r["status"] == "fail" for r in results)),
    errors=str(sum(r["status"] == "error" for r in results)),
    skipped=str(sum(r["status"] == "skip" for r in results)),
)
for r in results:
    tc = SubElement(suite, "testcase", name=r["run"], classname=r["path"])
    if r["status"] == "fail":
        SubElement(tc, "failure", message=f'{r["run"]} failed')
    elif r["status"] == "error":
        SubElement(tc, "error", message=f'{r["run"]} errored')
    elif r["status"] == "skip":
        SubElement(tc, "skipped")

xml_str = minidom.parseString(tostring(suite)).toprettyxml(indent="  ")
with open("test-results.xml", "w") as f:
    f.write(xml_str)
print("Wrote test-results.xml")
EOF
```

## GitHub Actions Integration

```yaml
- name: Run OpenTofu Tests
  continue-on-error: true
  run: tofu test -json > test-results.ndjson

- name: Parse and Report
  if: always()
  run: |
    if [ ! -f test-results.ndjson ]; then
      echo "No test results were produced"
      exit 1
    fi
    NON_PASSING=$(jq -ser '[.[] | select(.type=="test_summary") | (.test_summary.failed + .test_summary.errored)] | if length > 0 then last else error("No test_summary event found") end' test-results.ndjson)
    echo "Failed or errored tests: $NON_PASSING"
    if [ "$NON_PASSING" -gt 0 ]; then exit 1; fi

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: test-results.ndjson
```

## Filtering Specific Event Types

The JSON stream contains multiple event types:

| Event Type | Description |
|---|---|
| `version` | OpenTofu version and JSON UI schema version |
| `test_abstract` | Test files and run blocks discovered |
| `test_file` | Overall status for a test file |
| `test_run` | Status for an individual `run` block |
| `test_summary` | Final summary of all tests |
| `diagnostic` | Warning and error diagnostics |
| `test_plan` / `test_state` | Additional plan or state output when `-verbose` is enabled |

```bash
# Show only failed or errored runs

tofu test -json | jq 'select(.type == "test_run" and (.test_run.status == "fail" or .test_run.status == "error"))'

# Show summary
tofu test -json | jq 'select(.type == "test_summary") | .test_summary'
```

## Best Practices

1. **Always capture JSON output to a file** in CI/CD for post-run analysis
2. **Parse the summary event** for a quick pass/fail decision
3. **Include test result artifacts** in pipeline runs for debugging
4. **Set up dashboards** to track test trends over time
5. **Combine with `-verbose`** to add `test_plan` or `test_state` messages to the JSON stream

## Conclusion

JSON output mode in `tofu test` transforms test results into machine-readable data that integrates cleanly with CI/CD pipelines and reporting tools. By parsing the JSON message stream, you can build sophisticated test gates and track infrastructure test trends over time.
