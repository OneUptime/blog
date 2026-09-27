# How to Diagnose Currency Precision Differences in Cloudability Exports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API, FinOps, Cost Management, Troubleshooting

Description: Reconcile Cloudability CSV and JSON cost differences by preserving decimal precision, aligning report scope, and separating display rounding from source amounts.

A one-cent difference and a ten-percent difference deserve different investigations. CSV and API results may display or serialize the same amount differently, but scope, cost basis, allocations, and missing pages can also produce discrepancies. Establish that both exports describe the same financial question before attributing the difference to rounding.

Cloudability's cost-report API supports JSON and CSV responses. Its examples represent currency amounts as decimal strings. That is a useful signal to preserve the original representation rather than immediately converting everything to binary floating point.

## Match the exports before comparing numbers

Capture a fixed period, one metric, the same view, the same grouping dimensions, and the same allocation setting. Start with a small vendor-level report to avoid pagination during the first comparison. Record the exact request and extraction time.

Request JSON and CSV from the same documented endpoint by changing the `Accept` header. A dashboard can display formatted amounts or use a different selected measure; inspect its downloaded CSV independently rather than assuming it preserves the display formatting. Keep that as a separate comparison until the API pair agrees.

Inspect the CSV in a text editor before opening it in a spreadsheet. A spreadsheet may infer number formats, scientific notation, or locale-dependent separators. Retain the raw bytes and use a CSV parser; splitting each line on commas breaks quoted fields.

## Demonstrate the rounding boundary

This independent fixture illustrates why summing displayed row amounts can differ from rounding the complete sum. It does not assert Cloudability uses this particular rounding mode.

```python
from decimal import Decimal, ROUND_HALF_UP

amounts = [Decimal("0.0049"), Decimal("0.0049"), Decimal("0.0049")]
cent = Decimal("0.01")
round_each = sum(
    (x.quantize(cent, rounding=ROUND_HALF_UP) for x in amounts), Decimal(0)
)
round_total = sum(amounts, Decimal(0)).quantize(cent, rounding=ROUND_HALF_UP)
assert round_each == Decimal("0.00")
assert round_total == Decimal("0.01")
print(round_each, round_total)
```

Use the precision appropriate to the report's currency and your accounting policy; not every currency uses two fractional digits. Keep full supplied precision through aggregation, then format the result at the presentation boundary. Python decimal arithmetic uses a context precision of 28 significant digits by default; increase it as needed for your amounts and intermediate results to avoid rounding during aggregation or subtraction.

## Compare a normalized small report

For a controlled test, normalize the API and CSV extracts into local files with `vendor` and `amount` fields, using the selected metric's actual column name when producing those files. This comparison checks the normalized fixture rather than guessing the tenant's CSV header labels.

```python
import csv
import json
from decimal import Decimal
from pathlib import Path

api_rows = json.loads(Path("api-normalized.json").read_text(), parse_float=Decimal)
with open("csv-normalized.csv", newline="", encoding="utf-8-sig") as handle:
    csv_rows = list(csv.DictReader(handle))

def index(rows):
    result = {}
    for row in rows:
        key = row["vendor"]
        if key in result:
            raise ValueError(f"Duplicate comparison key: {key}")
        value = Decimal(str(row["amount"]))
        if not value.is_finite():
            raise ValueError("Non-finite currency value")
        result[key] = value
    return result

left, right = index(api_rows), index(csv_rows)
if left.keys() != right.keys():
    raise ValueError("Different row coverage")
for key in sorted(left):
    print(key, left[key] - right[key])
```

If you add account, date, or currency dimensions, expand the key accordingly. Never merge different currencies into the same total without an explicit conversion basis.

## Classify the discrepancy

A small difference correlated with many fractional rows suggests a rounding-stage issue. A consistent proportional difference suggests a different cost basis, currency conversion, or pricing adjustment. Missing vendors or abrupt cutoffs suggest filters, views, or incomplete extraction.

Inspect whether CSV headers use readable names while API fields use metric IDs. A script that selects the first currency-looking column can compare amortized cost with total cost without raising a parsing error.

Do not silently insert zero for blank or unparseable amounts. Report those rows separately and resolve their meaning. Likewise, do not impose an arbitrary tolerance large enough to make every export pass.

## Conclusion

Preserve source precision, prove scope equivalence, and compare complete rows before rounding. A defensible reconciliation identifies the stage where the difference appears instead of labeling every mismatch a currency precision issue.

## Official Documentation

- [IBM cost-report formats and monetary examples](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point)
- [Python decimal arithmetic](https://docs.python.org/3/library/decimal.html)
- [Python CSV parsing](https://docs.python.org/3/library/csv.html)
- [Apptio BI visualization formatting](https://www.ibm.com/docs/en/apptio-platform/apptio-bi/saas?topic=reports-create-custom)
