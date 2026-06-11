# Validation Summary: How to Build Cost Anomaly Detection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- NumPy
- pandas
- scikit-learn IsolationForest
- Prophet
- Terraform AWS provider
- AWS Cost Anomaly Detection
- Amazon SNS
- AWS Lambda
- Slack incoming webhooks
- PagerDuty Events API
- Mermaid

## Sources Consulted
- AWS Cost Anomaly Detection user guide: https://docs.aws.amazon.com/cost-management/latest/userguide/manage-ad.html
- AWS Cost Anomaly Detection getting started and SNS message example: https://docs.aws.amazon.com/cost-management/latest/userguide/getting-started-ad.html
- AWS SNS topic policy for Cost Anomaly Detection: https://docs.aws.amazon.com/cost-management/latest/userguide/ad-SNS.html
- AWS User Notifications / EventBridge Cost Anomaly Detection event format: https://docs.aws.amazon.com/cost-management/latest/userguide/cad-user-notifications.html
- Terraform AWS provider `aws_ce_anomaly_monitor`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ce_anomaly_monitor.html.markdown
- Terraform AWS provider `aws_ce_anomaly_subscription`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ce_anomaly_subscription.html.markdown
- scikit-learn IsolationForest API reference: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html
- Prophet quick start and diagnostics docs: https://facebook.github.io/prophet/docs/quick_start.html and https://facebook.github.io/prophet/docs/diagnostics.html
- pandas `Series.dt.isocalendar` API reference: https://pandas.pydata.org/docs/reference/api/pandas.Series.dt.isocalendar.html
- Python typing documentation: https://docs.python.org/3/library/typing.html
- Slack incoming webhooks documentation: https://api.slack.com/messaging/webhooks
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/docs/events-api-v2/overview/

## Issues Found
- The Z-score examples used `mean * 0.01` as the fallback standard deviation. If historical costs were all zero, this still produced a zero divisor. Updated the fallback to `max(abs(mean) * 0.01, 0.01)`.
- The IsolationForest example described `score_samples` as a score from `-1` to `1`. scikit-learn documents it as a raw anomaly score where lower values are more abnormal, not a fixed `-1` to `1` range. Updated the explanation.
- The Prophet section called the forecast bounds "confidence intervals." Prophet documents these as uncertainty/prediction intervals controlled by `interval_width`. Updated the wording.
- The Lambda alert processor assumed one AWS Cost Anomaly Detection payload key, `dimensionValue`, and built a console URL manually from the anomaly ID. AWS SNS examples use `dimensionalValue` and include `anomalyDetailsLink`; AWS EventBridge/User Notifications examples use `dimensionValue` under `detail`. Updated the Lambda snippet to handle both payload shapes and use `anomalyDetailsLink` when available.
- The ensemble detector claimed three detector votes and included an unused Isolation Forest enum/config field, but the code only implemented Z-score and moving-average detectors. Removed the unused Isolation Forest references and corrected the voting threshold comments.
- The ensemble result type used `any` instead of `typing.Any`. Updated the import and annotation.

## Review Notes
- Terraform was not installed in the local environment, so the HCL could not be executed with `terraform validate`; it was reviewed against the current Terraform AWS provider resource documentation instead.
- pandas, scikit-learn, and Prophet were not installed locally, so ML snippets were syntax-checked but not executed end to end. The NumPy-only examples were executed successfully.
