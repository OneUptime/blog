# Validation Summary: How to Create CloudWatch Synthetics Canaries with Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudWatch Synthetics
- AWS CLI
- Python
- Selenium WebDriver
- CloudWatch alarms
- Amazon S3
- IAM execution roles

## Sources Consulted
- AWS CloudWatch User Guide: Synthetic monitoring (canaries): https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html
- AWS CloudWatch User Guide: Runtime versions using Python and Selenium Webdriver: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_python_selenium.html
- AWS CloudWatch User Guide: Writing a Python canary script: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_WritingCanary_Python.html
- AWS CloudWatch User Guide: Python and Selenium library functions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_Library_Python.html
- AWS CloudWatch User Guide: Runtime versions support policy: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Runtime_Support_Policy.html
- AWS CLI Command Reference: synthetics create-canary: https://docs.aws.amazon.com/cli/latest/reference/synthetics/create-canary.html
- AWS CLI Command Reference: synthetics update-canary: https://docs.aws.amazon.com/cli/latest/reference/synthetics/update-canary.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CloudWatch User Guide: CloudWatch metrics published by canaries: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_metrics.html

## Issues Found
- The post described two Python runtime families, `syn-python-selenium` and `syn-python`. AWS's current CloudWatch Synthetics runtime documentation lists Python Selenium runtimes under the `syn-python-selenium` family, not a separate `syn-python` API runtime. Updated the runtime section to explain that Python API checks can use the Python Selenium runtime without creating a browser instance.
- The deployment example used `syn-python-selenium-3.0`, which AWS lists as deprecated as of January 22, 2026. Updated the example to use the current documented Python Selenium runtime, `syn-python-selenium-10.0`.
- The `--run-config` example used `MemoryInMBs`, but the AWS CLI schema uses `MemoryInMB`. Corrected the JSON field name.
- The Python examples used `logger.warn`, which is a deprecated logging alias in Python-style logging APIs. Updated those calls to `logger.warning`.

## Review Notes
- The Python code blocks were parsed with Python's AST parser and are syntactically valid.
- The AWS CLI was not installed locally in this workspace, so CLI validation was performed against the official AWS CLI command reference.
- The canaries use direct `urllib.request` calls for HTTP checks, so they validate overall canary success and duration but do not emit per-step Synthetics metrics unless refactored to use Synthetics step helper functions.
