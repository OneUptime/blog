# How to Measure Terraform Test Coverage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Testing, Coverage, Metrics, Infrastructure as Code, Quality

Description: Learn how to measure and improve test coverage for Terraform modules by tracking resource coverage, variable coverage, output coverage, and policy coverage.

---

Test coverage for Terraform does not work like code coverage in traditional software. There is no line-by-line instrumentation that tells you which HCL statements were executed. But that does not mean you cannot measure coverage. You just need to think about it differently. Terraform test coverage is about resource coverage, variable path coverage, output verification, and policy coverage. This guide shows you how to measure each one.

## What Coverage Means for Terraform

In application code, coverage measures which lines of code were executed during tests. In Terraform, the meaningful coverage metrics are:

- **Resource coverage**: What percentage of your resources are tested?
- **Variable coverage**: What percentage of variable combinations are tested?
- **Output coverage**: Are all outputs verified?
- **Conditional branch coverage**: Are both paths of conditional resources tested?
- **Policy coverage**: Are your compliance requirements covered by tests?

## Measuring Resource Coverage

The most basic coverage metric: which resources in your module have at least one test that verifies them?

```bash
#!/bin/bash
# scripts/resource-coverage.sh
# Measure what percentage of resources have tests

MODULE_DIR="${1:-.}"

# Get all resources defined in the module
echo "Resources defined in module:"
RESOURCES=$(grep -r 'resource "' "$MODULE_DIR"/*.tf | \
  sed 's/.*resource "\([^"]*\)" "\([^"]*\)".*/\1.\2/' | \
  sort -u)

TOTAL=$(echo "$RESOURCES" | wc -l | tr -d ' ')
echo "$RESOURCES"
echo ""
echo "Total resources: $TOTAL"

# Check which resources are referenced in tests
echo ""
echo "Resources referenced in tests:"
TESTED=0
UNTESTED=""

for resource in $RESOURCES; do
  TYPE=$(echo "$resource" | cut -d. -f1)
  NAME=$(echo "$resource" | cut -d. -f2)

  # Check if any test file references this resource
  if grep -rq "$TYPE" "$MODULE_DIR"/tests/*.tftest.hcl 2>/dev/null || \
     grep -rq "$NAME" "$MODULE_DIR"/tests/*.tftest.hcl 2>/dev/null; then
    echo "  COVERED: $resource"
    TESTED=$((TESTED + 1))
  else
    echo "  MISSING: $resource"
    UNTESTED="$UNTESTED\n  - $resource"
  fi
done

COVERAGE=$((TESTED * 100 / TOTAL))
echo ""
echo "Resource Coverage: $TESTED/$TOTAL ($COVERAGE%)"

if [ -n "$UNTESTED" ]; then
  echo ""
  echo "Untested resources:"
  echo -e "$UNTESTED"
fi
```

## Automated Coverage Report with Go

For a more rigorous approach, parse Terraform configurations and cross-reference with test files:

```go
// test/coverage/coverage.go
package coverage

import (
    "encoding/json"
    "fmt"
    "os"
    "path/filepath"
    "strings"
)

// CoverageReport tracks test coverage metrics
type CoverageReport struct {
    ModulePath      string            `json:"module_path"`
    Resources       []ResourceCoverage `json:"resources"`
    Variables       []VariableCoverage `json:"variables"`
    Outputs         []OutputCoverage   `json:"outputs"`
    ResourcePercent float64           `json:"resource_coverage_percent"`
    VariablePercent float64           `json:"variable_coverage_percent"`
    OutputPercent   float64           `json:"output_coverage_percent"`
}

type ResourceCoverage struct {
    Type    string `json:"type"`
    Name    string `json:"name"`
    Tested  bool   `json:"tested"`
}

type VariableCoverage struct {
    Name          string `json:"name"`
    HasDefault    bool   `json:"has_default"`
    ValidationTested bool `json:"validation_tested"`
    Tested        bool   `json:"tested"`
}

type OutputCoverage struct {
    Name     string `json:"name"`
    Asserted bool   `json:"asserted"`
}

// AnalyzeCoverage checks test coverage for a module
func AnalyzeCoverage(modulePath string) (*CoverageReport, error) {
    report := &CoverageReport{
        ModulePath: modulePath,
    }

    // Parse resources from .tf files
    resources, err := parseResources(modulePath)
    if err != nil {
        return nil, err
    }

    // Parse test files
    testContent, err := readTestFiles(modulePath)
    if err != nil {
        return nil, err
    }

    // Check resource coverage
    testedCount := 0
    for _, r := range resources {
        tested := strings.Contains(testContent, r.Type) ||
                  strings.Contains(testContent, r.Name)
        report.Resources = append(report.Resources, ResourceCoverage{
            Type:   r.Type,
            Name:   r.Name,
            Tested: tested,
        })
        if tested {
            testedCount++
        }
    }

    if len(resources) > 0 {
        report.ResourcePercent = float64(testedCount) / float64(len(resources)) * 100
    }

    return report, nil
}

// PrintReport outputs a formatted coverage report
func PrintReport(report *CoverageReport) {
    fmt.Printf("Coverage Report for %s\n", report.ModulePath)
    fmt.Printf("================================\n\n")

    fmt.Printf("Resource Coverage: %.1f%%\n", report.ResourcePercent)
    for _, r := range report.Resources {
        status := "MISSING"
        if r.Tested {
            status = "COVERED"
        }
        fmt.Printf("  [%s] %s.%s\n", status, r.Type, r.Name)
    }

    fmt.Printf("\nVariable Coverage: %.1f%%\n", report.VariablePercent)
    fmt.Printf("Output Coverage: %.1f%%\n", report.OutputPercent)
}
```

## Variable Path Coverage

Variables with validation rules and conditional logic create multiple paths. Measure how many paths are tested.

```hcl
# variables.tf
variable "environment" {
  type = string
  validation {
    condition = contains(["dev", "staging", "production"], var.environment)
    error_message = "Must be dev, staging, or production."
  }
}

variable "instance_count" {
  type = number
  validation {
    condition = var.instance_count >= 1 && var.instance_count <= 10
    error_message = "Must be between 1 and 10."
  }
}
```

The variable `environment` has 3 valid values plus invalid values to test. Full coverage means testing:
- Each valid value (dev, staging, production)
- At least one invalid value
- Boundary cases for numeric variables (1, 10, 0, 11)

```bash
#!/bin/bash
# scripts/variable-coverage.sh
# Check which variable values are tested

MODULE_DIR="${1:-.}"

echo "Variable Coverage Analysis"
echo "========================="

# Extract variables from .tf files
grep -h 'variable "' "$MODULE_DIR"/*.tf | \
  sed 's/.*variable "\([^"]*\)".*/\1/' | while read var; do

  echo ""
  echo "Variable: $var"

  # Count how many test runs reference this variable
  REFERENCES=$(grep -c "var\.$var\|variables.*$var" \
    "$MODULE_DIR"/tests/*.tftest.hcl 2>/dev/null || echo 0)

  # Check for expect_failures (validation testing)
  VALIDATION_TESTS=$(grep -c "var\.$var" \
    "$MODULE_DIR"/tests/*.tftest.hcl 2>/dev/null | \
    grep "expect_failures" || echo 0)

  echo "  Test references: $REFERENCES"
  echo "  Validation tests: $VALIDATION_TESTS"

  if [ "$REFERENCES" -eq 0 ]; then
    echo "  Status: NOT TESTED"
  elif [ "$REFERENCES" -lt 3 ]; then
    echo "  Status: PARTIALLY TESTED"
  else
    echo "  Status: WELL TESTED"
  fi
done
```

## Output Coverage

Track which outputs have explicit assertions in tests.

```hcl
# Outputs that should be tested
# outputs.tf
output "vpc_id" { ... }          # Should have assertion
output "private_subnet_ids" { ... } # Should have assertion
output "public_subnet_ids" { ... }  # Should have assertion
output "nat_gateway_ids" { ... }    # Should have assertion
```

Check coverage:

```bash
#!/bin/bash
# scripts/output-coverage.sh

MODULE_DIR="${1:-.}"

echo "Output Coverage Analysis"
echo "========================"

TOTAL=0
TESTED=0

grep -h 'output "' "$MODULE_DIR"/outputs.tf | \
  sed 's/.*output "\([^"]*\)".*/\1/' | while read output; do

  TOTAL=$((TOTAL + 1))

  # Check if any test asserts on this output
  if grep -rq "output\.$output" "$MODULE_DIR"/tests/*.tftest.hcl 2>/dev/null; then
    echo "  COVERED: $output"
    TESTED=$((TESTED + 1))
  else
    echo "  MISSING: $output"
  fi
done
```

## Generating a Coverage Badge

Create a coverage badge for your repository:

```yaml
# .github/workflows/coverage.yml
name: Test Coverage

on:
  push:
    branches: [main]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Calculate Coverage
        id: coverage
        run: |
          COVERAGE=$(./scripts/resource-coverage.sh modules/networking | \
            grep "Resource Coverage:" | grep -o '[0-9]*%' | tr -d '%')
          echo "coverage=$COVERAGE" >> $GITHUB_OUTPUT

      - name: Create Badge
        uses: schneegans/dynamic-badges-action@v1.7.0
        with:
          auth: ${{ secrets.GIST_TOKEN }}
          gistID: your-gist-id
          filename: coverage.json
          label: Terraform Coverage
          message: ${{ steps.coverage.outputs.coverage }}%
          valColorRange: ${{ steps.coverage.outputs.coverage }}
          minColorRange: 50
          maxColorRange: 90
```

## Setting Coverage Thresholds

Enforce minimum coverage in CI:

```bash
#!/bin/bash
# scripts/check-coverage-threshold.sh
# Fail CI if coverage drops below threshold

THRESHOLD=${1:-80}
MODULE_DIR=${2:-.}

COVERAGE=$(./scripts/resource-coverage.sh "$MODULE_DIR" | \
  grep "Resource Coverage:" | grep -o '[0-9]*' | head -1)

echo "Current coverage: ${COVERAGE}%"
echo "Required threshold: ${THRESHOLD}%"

if [ "$COVERAGE" -lt "$THRESHOLD" ]; then
  echo "FAIL: Coverage ${COVERAGE}% is below threshold ${THRESHOLD}%"
  exit 1
fi

echo "PASS: Coverage meets threshold"
```

## What Good Coverage Looks Like

Aim for these targets:

| Metric | Target | Notes |
|--------|--------|-------|
| Resource coverage | 90%+ | Every resource should have at least one test |
| Variable validation | 100% | Every validation rule tested with valid and invalid inputs |
| Output coverage | 100% | Every output should be asserted in at least one test |
| Conditional branches | 100% | Both true and false paths of every conditional |
| Security policies | 100% | Every security requirement has a corresponding test |

100% resource coverage is not always practical. Some resources are simple enough that testing the module as a whole covers them implicitly. Focus on covering the resources with conditional logic, complex configurations, or security implications.

Coverage metrics are a guide, not a goal. High coverage with weak assertions is worse than moderate coverage with strong assertions. Use coverage measurement to find gaps in your testing, not as a vanity metric.

For more on testing approaches, see [How to Use Contract Tests for Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-use-contract-tests-for-terraform-modules/view) and [How to Set Up Continuous Testing for Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-set-up-continuous-testing-for-terraform-modules/view).
