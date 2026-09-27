# Validation Summary: How to Investigate Currency Precision Differences Between Cloudability CSV and API Results

## Status
validated

## Post Type
Technical troubleshooting guide with executable Python examples.

## Technologies Covered
- IBM Cloudability cost reporting API and report scope controls
- Apptio BI visualization formatting
- Python standard library: decimal, csv, json, and pathlib
- CSV and JSON normalization, currency precision, and reconciliation

## Sources Consulted
- IBM Cloudability Cost Reporting End Point: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-essentials/saas?topic=api-cost-reporting-end-point
- IBM Getting started with Cloudability API V3: https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=api-getting-started-cloudability-v3
- IBM Apptio BI Create custom reports: https://www.ibm.com/docs/en/apptio-platform/apptio-bi/saas?topic=reports-create-custom
- Python decimal arithmetic: https://docs.python.org/3/library/decimal.html
- Python CSV parsing: https://docs.python.org/3/library/csv.html
- Python JSON decoding: https://docs.python.org/3/library/json.html
- Microsoft Excel Keeping leading zeros and large numbers: https://support.microsoft.com/en-US/Excel/keeping-leading-zeros-and-large-numbers
- Microsoft Excel Import or export text files: https://support.microsoft.com/en-us/excel/get-started/import-or-export-text-txt-or-csv-files
- ISO 4217 currency codes and minor units: https://www.iso.org/iso-4217-currency-codes.html

## Issues Found
- The full-precision guidance omitted Decimal arithmetic's context limit. Added a qualification that the default is 28 significant digits and that aggregation and subtraction require sufficient context precision. Decimal construction preserves supplied digits, but arithmetic can round before explicit presentation rounding.
- The dashboard comparison implied that visualization formatting can propagate into downloaded CSV files. The referenced BI documentation establishes configurable display precision, not that export behavior. Reworded the passage to distinguish dashboard display formatting from the downloaded CSV and require independent inspection.

## Review Notes
- Executed both Python code blocks with Python 3.9.6. The rounding example produced `0.00 0.01`, and both embedded assertions passed.
- Tested the comparison example with decimal JSON numbers, string amounts, differing trailing zeros, a UTF-8 BOM, and a quoted vendor containing a comma. Equivalent amounts compared as zero; a one-cent discrepancy printed `0.01`.
- Confirmed rejection of duplicate vendor keys, mismatched vendor coverage, non-finite amounts, blank amounts, and unparseable amounts. Blank and malformed strings raise decimal.InvalidOperation; the example stops rather than producing a separate invalid-row report.
- Verified documented JSON/CSV support, decimal-string monetary examples, metric names and labels, allocation controls, and pagination. API V3 documentation specifies application/json and text/csv Accept headers. A small vendor-only report is a reasonable initial comparison, but complete row coverage must still be checked.
- The code intentionally consumes a normalized JSON array and CSV columns named vendor and amount; it does not directly consume Cloudability's response envelope. Normalization must preserve original numeric precision and use the intended metric.
- Discrepancy patterns are appropriately framed as diagnostic suggestions rather than proof of a particular rounding implementation. The fixture does not claim Cloudability uses ROUND_HALF_UP.
- All four documentation URLs in the post identify the intended resources. Direct retrieval of IBM pages was restricted, so IBM claims were checked using search-indexed official documentation. No authenticated Cloudability tenant or actual exports were available for an integration comparison.
- No terminal commands, configuration snippets, deprecated APIs, or product-version-specific instructions required correction.
