# How to Use theilsU() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, theilsU, Uncertainty Coefficient, Statistics

Description: Learn how to use theilsU() in ClickHouse to measure the asymmetric predictive power of one categorical variable over another, ranging from 0 to 1.

---

Theil's U, also known as the uncertainty coefficient, measures how much knowing one categorical variable reduces uncertainty about another. Unlike Cramer's V or the contingency coefficient, Theil's U is asymmetric: `theilsU(x, y)` measures how well `x` predicts `y`, and this value is generally different from `theilsU(y, x)`. ClickHouse implements this as an aggregate function, making directional categorical association analysis straightforward in SQL.

## What Is Theil's U (Uncertainty Coefficient)

Theil's U is based on information entropy. It is defined as:

```text
U(x -> y) = (H(y) - H(y|x)) / H(y)
```

Where `H(y)` is the entropy of `y` and `H(y|x)` is the conditional entropy of `y` given `x`. This is the fraction of uncertainty in `y` that is explained by knowing `x`.

Key properties:
- **0** - no association between `x` and `y`
- **+1** - perfect positive association (complete agreement)
- **-1** - perfect negative association (complete inversion)
- **Asymmetric** - `theilsU(x, y)` does not equal `theilsU(y, x)` in general

## Syntax

```sql
theilsU(x, y)
```

Returns a `Float64` in [-1, 1] representing the association between `x` and `y`, where 0 indicates no association, +1 indicates perfect positive association, and -1 indicates perfect negative association.

## Creating Sample Data

```sql
CREATE TABLE support_tickets
(
    ticket_id    UInt32,
    product_area String,
    issue_type   String,
    resolution   String
)
ENGINE = MergeTree()
ORDER BY ticket_id;

INSERT INTO support_tickets VALUES
    (1,  'billing',  'charge_error',   'refunded'),
    (2,  'billing',  'charge_error',   'refunded'),
    (3,  'billing',  'plan_change',    'updated'),
    (4,  'billing',  'charge_error',   'refunded'),
    (5,  'tech',     'login_issue',    'password_reset'),
    (6,  'tech',     'login_issue',    'password_reset'),
    (7,  'tech',     'bug_report',     'patch_deployed'),
    (8,  'tech',     'login_issue',    'password_reset'),
    (9,  'shipping', 'lost_package',   'resent'),
    (10, 'shipping', 'delayed',        'escalated'),
    (11, 'shipping', 'lost_package',   'resent'),
    (12, 'billing',  'plan_change',    'updated'),
    (13, 'tech',     'bug_report',     'patch_deployed'),
    (14, 'shipping', 'delayed',        'escalated'),
    (15, 'billing',  'charge_error',   'refunded');
```

## Basic Usage

How well does `product_area` predict `issue_type`?

```sql
SELECT theilsU(product_area, issue_type) AS area_predicts_issue
FROM support_tickets;
```

How well does `issue_type` predict `resolution`?

```sql
SELECT theilsU(issue_type, resolution) AS issue_predicts_resolution
FROM support_tickets;
```

## Demonstrating Asymmetry

```sql
SELECT
    theilsU(product_area, issue_type)  AS area_predicts_issue,
    theilsU(issue_type, product_area)  AS issue_predicts_area
FROM support_tickets;
-- These values will differ, showing the directionality of the relationship
```

## Predictive Power Analysis

Use Theil's U to identify which features best predict a target variable - useful for feature selection:

```sql
SELECT
    'product_area' AS feature,
    theilsU(product_area, resolution) AS predictive_power
FROM support_tickets

UNION ALL

SELECT
    'issue_type'  AS feature,
    theilsU(issue_type, resolution)   AS predictive_power
FROM support_tickets

ORDER BY predictive_power DESC;
```

The feature with a higher absolute Theil's U value is a stronger predictor of the target.

## Churn Prediction Feature Ranking

```sql
SELECT
    feature,
    theilsU_value
FROM (
    SELECT 'device_type'     AS feature, theilsU(device_type, churned)     AS theilsU_value FROM user_data
    UNION ALL
    SELECT 'plan_tier'       AS feature, theilsU(plan_tier, churned)       AS theilsU_value FROM user_data
    UNION ALL
    SELECT 'signup_channel'  AS feature, theilsU(signup_channel, churned)  AS theilsU_value FROM user_data
    UNION ALL
    SELECT 'country'         AS feature, theilsU(country, churned)         AS theilsU_value FROM user_data
)
ORDER BY theilsU_value DESC;
```

## Interpreting Theil's U Values

| Range | Interpretation |
|---|---|
| -1.0 | Perfect negative association (complete inversion) |
| -0.85 to -1.0 | Very strong negative association |
| -0.60 to -0.85 | Strong negative association |
| -0.30 to -0.60 | Moderate negative association |
| -0.15 to -0.30 | Weak negative association |
| 0.0 | No association |
| 0.0 to 0.15 | Very weak positive association |
| 0.15 to 0.30 | Weak positive association |
| 0.30 to 0.60 | Moderate positive association |
| 0.60 to 0.85 | Strong positive association |
| 0.85 to 1.0 | Very strong positive association |
| 1.0 | Perfect positive association (complete agreement) |

## Comparing Theil's U with Cramer's V

```sql
SELECT
    theilsU(product_area, issue_type)  AS theils_u_a_to_b,
    theilsU(issue_type, product_area)  AS theils_u_b_to_a,
    cramersV(product_area, issue_type) AS cramers_v
FROM support_tickets;
```

Cramer's V gives a symmetric overview; Theil's U reveals the direction of the predictive relationship.

## Summary

`theilsU()` in ClickHouse computes the uncertainty coefficient, an asymmetric measure of association between two categorical variables. It returns values from -1 (perfect negative association) through 0 (no association) to +1 (perfect positive association) and is based on information entropy. Use it to rank categorical features by their association strength, compare directional relationships, and perform feature selection for classification models directly in SQL.
