# How to Use Firewall Insights to Identify Shadowed and Overly Permissive Firewall Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firewall Insights, Network Security, VPC Firewall, Google Cloud

Description: Learn how to use GCP Firewall Insights to find shadowed firewall rules, overly permissive configurations, and unused rules that weaken your network security posture.

---

Firewall rules tend to accumulate over time. Someone adds a rule to fix a connectivity issue, another gets created during a migration, and before you know it, you have dozens of rules with overlapping scopes, some of which are never hit by any traffic. These shadowed and overly permissive rules create security blind spots that are hard to find manually.

GCP Firewall Insights automates the process of finding these problems. It analyzes your firewall rules against actual traffic patterns and flags rules that are shadowed by higher-priority rules, rules that are too broad, and rules that have not been hit in weeks or months.

## Enabling Firewall Insights

Firewall Insights is part of Network Intelligence Center and requires Firewall Rules Logging to be enabled. Without logging, the tool cannot compare rules against actual traffic.

First, enable the required API:

```bash
# Enable the Recommender API which powers Firewall Insights
gcloud services enable recommender.googleapis.com --project=my-project
```

Then enable firewall rules logging on your VPC network:

```bash
# Enable logging on all existing firewall rules in the VPC
for rule in $(gcloud compute firewall-rules list \
  --filter="network=my-vpc" \
  --format="value(name)" \
  --project=my-project); do
  gcloud compute firewall-rules update "$rule" \
    --enable-logging \
    --project=my-project
done
```

Give it a few days to collect enough traffic data before the insights become meaningful.

## Understanding Shadowed Rules

A shadowed rule is a firewall rule that can never be matched because a higher-priority rule with a broader or equal scope always takes precedence. Shadowed rules give a false sense of security - you might think traffic is being blocked by a specific rule, but that rule never actually applies.

Here is how shadowed rules happen in practice:

```
Rule A (Priority 900): ALLOW tcp:80 from 0.0.0.0/0 to all instances
Rule B (Priority 1000): DENY tcp:80 from 10.0.0.0/8 to tag:web-servers
```

Rule B is shadowed by Rule A. Rule A has a higher priority (lower number) and allows traffic from all sources on port 80. Rule B tries to deny traffic from the 10.0.0.0/8 range on the same port, but it will never be evaluated because Rule A already matches and allows the traffic.

## Viewing Shadowed Rule Insights

You can list shadowed rule insights using gcloud:

```bash
# List all shadowed firewall rule insights for your project
gcloud recommender insights list \
  --insight-type=google.compute.firewall.Insight \
  --location=global \
  --project=my-project \
  --filter="insightSubtype=SHADOWED_RULE" \
  --format="table(name,description,stateInfo.state)"
```

To get the details of a specific insight including which rule is doing the shadowing:

```bash
# Get detailed information about a specific shadowed rule insight
gcloud recommender insights describe INSIGHT_ID \
  --insight-type=google.compute.firewall.Insight \
  --location=global \
  --project=my-project \
  --format=yaml
```

The output will show both the shadowed rule and the shadowing rule, making it clear which rule to fix or remove.

## Finding Overly Permissive Rules

Overly permissive rules allow more traffic than is actually needed. Firewall Insights identifies these by comparing the rule definition against actual traffic patterns from the logs.

For example, a rule might allow all TCP ports from a subnet, but the logs show only ports 443 and 8080 are actually used. Firewall Insights flags this and recommends tightening the rule.

```bash
# List overly permissive firewall rule insights
gcloud recommender insights list \
  --insight-type=google.compute.firewall.Insight \
  --location=global \
  --project=my-project \
  --filter="insightSubtype=OVERLY_PERMISSIVE" \
  --format="table(name,description)"
```

## Identifying Unused Rules

Rules that have not had any hits over the observation period (typically 6 weeks) are flagged as unused. These are candidates for removal.

```bash
# List firewall rules with no hits in the observation period
gcloud recommender insights list \
  --insight-type=google.compute.firewall.Insight \
  --location=global \
  --project=my-project \
  --filter="insightSubtype=UNUSED_ATTRIBUTE" \
  --format="table(name,description,content.operationGroups)"
```

Before deleting an unused rule, check whether it might be for a periodic workload (like a monthly batch job) or a disaster recovery scenario. Not all unused rules are unnecessary.

## Acting on Recommendations

Firewall Insights does not just identify problems - it also provides recommendations. These are actionable suggestions to fix the issues found.

```bash
# List firewall recommendations
gcloud recommender recommendations list \
  --recommender=google.compute.firewall.Recommender \
  --location=global \
  --project=my-project \
  --format="table(name,priority,description)"
```

To apply a recommendation:

```bash
# View the details of a specific recommendation
gcloud recommender recommendations describe RECOMMENDATION_ID \
  --recommender=google.compute.firewall.Recommender \
  --location=global \
  --project=my-project \
  --format=yaml
```

The recommendation will include the specific changes needed - like reducing allowed ports or removing the rule entirely. You can then apply those changes manually or mark the recommendation as applied.

## A Practical Cleanup Workflow

Here is a workflow I use to clean up firewall rules in a project:

Step 1 - Export all current rules for reference:

```bash
# Export all firewall rules to a CSV for review
gcloud compute firewall-rules list \
  --project=my-project \
  --format="csv(name,network,direction,priority,sourceRanges.list(),allowed[].map().firewall_rule().list())" \
  > firewall-rules-export.csv
```

Step 2 - Get all insights and recommendations:

```bash
# Get all firewall insights grouped by type
for subtype in SHADOWED_RULE OVERLY_PERMISSIVE UNUSED_ATTRIBUTE; do
  echo "=== $subtype ==="
  gcloud recommender insights list \
    --insight-type=google.compute.firewall.Insight \
    --location=global \
    --project=my-project \
    --filter="insightSubtype=$subtype" \
    --format="table(description)"
  echo ""
done
```

Step 3 - Handle shadowed rules first since they indicate logic errors:

```bash
# For each shadowed rule, decide whether to:
# 1. Delete the shadowed rule if it is redundant
# 2. Adjust the priority of one of the rules
# 3. Narrow the scope of the shadowing rule

# Example: Delete a redundant shadowed rule
gcloud compute firewall-rules delete old-deny-rule \
  --project=my-project \
  --quiet
```

Step 4 - Tighten overly permissive rules:

```bash
# Example: Restrict a rule that allows all TCP to only needed ports
gcloud compute firewall-rules update allow-web-traffic \
  --allow=tcp:443,tcp:8080 \
  --project=my-project
```

Step 5 - Review and remove unused rules after confirming they are truly unnecessary.

## Monitoring Firewall Insights Over Time

Firewall misconfigurations tend to recur as teams add new rules. Set up a periodic review using Cloud Scheduler and a Cloud Function that queries insights and sends alerts:

```bash
# Check insight count - useful for a monitoring script
insight_count=$(gcloud recommender insights list \
  --insight-type=google.compute.firewall.Insight \
  --location=global \
  --project=my-project \
  --format="value(name)" | wc -l)

echo "Current firewall insights count: $insight_count"

if [ "$insight_count" -gt 0 ]; then
  echo "Review needed - new firewall insights detected"
fi
```

## Limits and Considerations

Firewall Insights requires firewall rules logging, which does incur additional costs. The logging data is used to determine traffic patterns, so the accuracy improves with more data over time.

Insights for shadowed rules are generated within a few hours of rule creation. Traffic-based insights like overly permissive and unused rules need at least a few weeks of logging data to be reliable.

The tool currently analyzes VPC firewall rules. If you are using hierarchical firewall policies or Cloud Armor, those require separate analysis tools.

## Summary

Firewall Insights takes the guesswork out of firewall rule management. Instead of manually auditing rules and hoping you catch the problems, you get automated analysis that highlights shadowed rules, overly permissive configurations, and unused rules. Make it part of your regular security review process - run through the insights quarterly at minimum, and act on the recommendations to keep your network security posture tight.
