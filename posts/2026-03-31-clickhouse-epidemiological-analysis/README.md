# How to Build Epidemiological Analysis with ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Healthcare, Epidemiology, Public Health, Disease Surveillance

Description: Perform epidemiological analysis in ClickHouse - calculate incidence rates, track outbreak spread, model Rt, and generate age-stratified disease burden reports.

---

Epidemiologists need to process large volumes of case reports, laboratory results, and vaccination records to understand disease dynamics. ClickHouse's analytical capabilities make it a strong platform for public health surveillance and outbreak response analytics.

## Disease Case Table

```sql
CREATE TABLE disease_cases (
    case_id         UUID,
    disease_code    LowCardinality(String),   -- ICD-10 or custom code
    report_date     Date,
    onset_date      Date,
    county_fips     UInt32,
    state_code      FixedString(2),
    age_bucket      LowCardinality(String),
    gender          FixedString(1),
    outcome         LowCardinality(String),   -- 'recovered', 'hospitalized', 'icu', 'deceased'
    vaccinated      UInt8,
    variant         LowCardinality(String),
    source          LowCardinality(String)    -- 'lab_confirmed', 'clinical', 'probable'
) ENGINE = MergeTree()
ORDER BY (disease_code, report_date)
PARTITION BY toYear(report_date);
```

## 7-Day Rolling Incidence Rate

```sql
SELECT
    report_date,
    sum(count()) OVER (ORDER BY report_date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS rolling_7day_cases
FROM disease_cases
WHERE disease_code = 'COVID-19'
  AND report_date >= today() - 90
GROUP BY report_date
ORDER BY report_date;
```

## Age-Stratified Case Fatality Rate

```sql
SELECT
    age_bucket,
    count()                                              AS cases,
    countIf(outcome = 'deceased')                        AS deaths,
    round(100.0 * countIf(outcome = 'deceased') / count(), 3) AS cfr_pct
FROM disease_cases
WHERE disease_code = 'COVID-19'
  AND source = 'lab_confirmed'
GROUP BY age_bucket
ORDER BY age_bucket;
```

## Vaccine Effectiveness Estimate

```sql
SELECT
    vaccinated,
    count()                              AS cases,
    countIf(outcome = 'hospitalized')    AS hospitalized,
    countIf(outcome = 'icu')             AS icu_admits,
    round(100.0 * countIf(outcome = 'hospitalized') / count(), 2) AS hosp_rate_pct
FROM disease_cases
WHERE disease_code = 'COVID-19'
  AND report_date >= today() - 90
GROUP BY vaccinated;
```

## Geographic Spread by State

```sql
SELECT
    state_code,
    count()                                   AS cases,
    countIf(outcome = 'deceased')             AS deaths,
    round(100.0 * countIf(outcome = 'deceased') / count(), 2) AS cfr_pct
FROM disease_cases
WHERE disease_code = 'COVID-19'
  AND report_date >= today() - 30
GROUP BY state_code
ORDER BY cases DESC
LIMIT 20;
```

## Variant Dominance Over Time

```sql
SELECT
    toStartOfWeek(report_date) AS week,
    variant,
    count()                    AS cases,
    round(100.0 * count() / sum(count()) OVER (PARTITION BY toStartOfWeek(report_date)), 2) AS pct_of_week
FROM disease_cases
WHERE disease_code = 'COVID-19'
  AND report_date >= today() - 180
GROUP BY week, variant
ORDER BY week, cases DESC;
```

## Approximate Rt Estimation

```sql
SELECT
    report_date,
    cases,
    cases_7d_ago,
    round(pow(cases / nullIf(cases_7d_ago, 0), 1.0/7), 3) AS approx_Rt
FROM (
    SELECT
        report_date,
        count() AS cases,
        lagInFrame(count(), 7) OVER (ORDER BY report_date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS cases_7d_ago
    FROM disease_cases
    WHERE disease_code = 'COVID-19'
    GROUP BY report_date
)
WHERE cases_7d_ago > 0
ORDER BY report_date;
```

## Summary

ClickHouse provides public health teams with the query speed needed for real-time epidemiological surveillance. Rolling 7-day counts, age-stratified case fatality rates, variant dominance tracking, and approximate Rt estimation all run in seconds over millions of case records - enabling fast response during outbreak investigations.
