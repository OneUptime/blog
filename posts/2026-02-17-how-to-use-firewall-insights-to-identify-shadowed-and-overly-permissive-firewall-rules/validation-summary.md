# Validation Summary: How to Use Firewall Insights to Identify Shadowed

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Firewall Insights
- Network Intelligence Center
- VPC firewall rules
- Firewall Rules Logging
- Recommender API
- Google Cloud CLI

## Sources Consulted
- Google Cloud Firewall Insights overview: https://docs.cloud.google.com/network-intelligence-center/docs/firewall-insights/concepts/overview
- Google Cloud Firewall Insights enable APIs and features: https://docs.cloud.google.com/network-intelligence-center/docs/firewall-insights/how-to/enable-api-features
- Google Cloud Firewall Insights categories and states: https://docs.cloud.google.com/network-intelligence-center/docs/firewall-insights/concepts/insights-categories-states
- Google Cloud Firewall Insights observation period and refresh cycle: https://docs.cloud.google.com/network-intelligence-center/docs/firewall-insights/how-to/configure-observation-period
- Google Cloud Firewall Insights manage and export insights: https://docs.cloud.google.com/network-intelligence-center/docs/firewall-insights/how-to/manage-insights
- Google Cloud Firewall Insights review and optimize firewall rules: https://docs.cloud.google.com/network-intelligence-center/docs/firewall-insights/how-to/review-optimize
- Google Cloud SDK `gcloud recommender insights list`: https://cloud.google.com/sdk/gcloud/reference/recommender/insights/list
- Google Cloud SDK `gcloud recommender recommendations list`: https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/list
- Google Cloud Recommender supported recommenders: https://docs.cloud.google.com/recommender/docs/recommenders
- Google Cloud SDK `gcloud compute firewall-rules list`: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/list
- Google Cloud VPC firewall rules usage guide: https://docs.cloud.google.com/firewall/docs/using-firewalls

## Issues Found
- The post stated that Firewall Insights generally requires Firewall Rules Logging. Updated this to distinguish configuration-based shadowed rule insights from log-based overly permissive and deny-rule insights.
- The setup steps only enabled the Recommender API. Added the required Firewall Insights API and noted that shadowed and overly permissive insight features must be enabled in the Firewall Insights console.
- The post said users should wait a few days for insights. Replaced this with Google's current guidance that generated insights can take up to 48 hours after feature enablement, and that log-based insights depend on the configured observation period.
- The overly permissive and unused-rule examples used undocumented `insightSubtype` filter values. Replaced those examples with a documented `gcloud recommender insights list` command that displays the `insightSubtype` column for review.
- The post used `google.compute.firewall.Recommender` with `gcloud recommender recommendations`, but current Google documentation lists Firewall Insights as an insight type and does not list that firewall recommender ID as a supported recommender. Replaced the recommendations section with `gcloud recommender insights describe`.
- The post claimed shadowed rule insights are generated within a few hours. Updated this to Google's current description: shadowed rule analysis evaluates the existing firewall rule configuration every 24 hours and does not use an observation period.
- The post said the tool currently analyzes only VPC firewall rules. Updated this to reflect current documentation that Firewall Insights can also show insights for hierarchical firewall policies and global network firewall policies.

## Review Notes
The local environment did not have `gcloud` installed, so CLI syntax was checked against official Google Cloud SDK documentation instead of local `--help` output.
