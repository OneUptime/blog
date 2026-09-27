# How to Exclude Credits and One-Time Charges in Cloudability Enhanced Forecast

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: FinOps, Cost Management, Forecasting, Budgeting

Description: Compare Cloudability Enhanced Forecast scenarios with credits and one-time charges excluded while keeping cost basis, history, and budget assumptions explicit.

A one-time credit can make a normal operating month look unusually cheap. An upfront charge can make the same workload look unusually expensive. Forecasting that history without understanding those events can produce a budget that neither engineering nor finance recognizes.

Cloudability Enhanced Forecast includes an Excluded Spend control for credits, one-time charges, or both. Use it to build a deliberate forecasting scenario, then compare that scenario with an unchanged baseline.

## Preserve the baseline

Open Enhanced Forecast under the intended View. Record the cost metric, historical inputs, forecast duration, spend drivers, and model-related settings. Generate a baseline without exclusions and save or export the evidence available in your workflow.

The same View and cost basis must remain in use throughout the comparison. Changing from cash to amortized cost while also excluding upfront charges makes it impossible to identify which change caused the difference.

Give each scenario an explicit name in your working notes, such as All Charges, Credits Excluded, or Credits and One-Time Excluded. These names describe analytical assumptions; they do not imply changes to the provider's bill.

## Inspect the historical events

Use a cost report over the history period to identify the dates and categories of large credits or exceptional charges. Determine whether each event is genuinely nonrecurring for the planning question.

For example, a migration credit expected to expire may be a poor predictor of future operating cost. A recurring contractual credit may belong in the forecast. A known annual license charge is episodic but still needs a place in next year's budget.

Do not equate every negative value with the same commercial event. Preserve transaction classification and obtain the financial explanation when the label is ambiguous.

## Generate controlled exclusion scenarios

In Enhanced Forecast, select the Excluded Spend option for Credits and regenerate. Then test One-time Charges, followed by both if that matches the planning question. Keep duration, drivers, View, and cost metric fixed.

IBM documents this control as an exclusion from the forecast calculation. It should not be presented as deleting billing records or rewriting reported actuals.

An illustrative comparison table can help reviewers separate model output from policy:

| Scenario | Annual forecast | Interpretation to investigate |
| --- | ---: | --- |
| All charges | 180,000 | Includes all modeled history |
| Credits excluded | 192,000 | Prior credits reduced the baseline |
| Both excluded | 186,000 | Exceptional charges also affected history |

These are invented values for explaining a review, not expected Cloudability outputs. Actual differences depend on the data and selected model; exclusions do not guarantee a fixed proportional change.

## Review the drivers and model behavior

Use the Details view to identify which driver combinations account for the change. A small organization-wide difference can conceal a large change for one application offset by another.

Enhanced Forecast supports model comparison and selection for individual forecast lines. Review the underlying history before overriding a model. A model that fits a credit-driven dip well may still be unsuitable for a period after the credit expires.

IBM documents a detail-table limit with an Other row when there are more than 1,000 forecast items. Include that row when reconciling displayed drivers to the summary. Reducing drivers can make a diagnostic comparison easier without changing the business scope.

## Keep the approved budget separate

Once the scenario is reviewed, Save forecast as Budget opens a budget creation flow with forecast values that can be edited. Review the resulting period, View, and values before saving.

Add known future events explicitly in the appropriate planning workflow. Excluding last year's one-time charge from the statistical history does not mean a planned replacement project should disappear from next year's budget.

Store the chosen assumptions with the budget: excluded spend categories, date of forecast, cost basis, material model overrides, and known adjustments. Revisit them when commercial terms change.

## Conclusion

Use exclusions as transparent forecasting assumptions. Compare them against a stable baseline, explain the affected drivers, and retain the distinction between historical actuals, model predictions, and the approved budget.

## Official Documentation

- [IBM Enhanced Forecast controls](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-premium/saas?topic=plan-enhanced-forecast)
- [IBM Intelligent Forecasting](https://www.ibm.com/docs/en/cloudability-commercial/cloudability-enterprise/saas?topic=forecast-intelligent-forecasting)
- [IBM financial planning concepts](https://www.ibm.com/docs/en/cloudability-commercial/financial-planning/saas?topic=getting-started-cloudability-financial-planning)
