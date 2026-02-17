# How to Create Custom Classifications and Classification Rules in Microsoft Purview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Purview, Data Classification, Data Governance, Custom Rules, Sensitive Data, Compliance, Azure Cloud

Description: Learn how to build custom classification rules in Microsoft Purview to detect domain-specific sensitive data patterns unique to your organization.

---

Microsoft Purview comes with over 200 built-in classification rules that detect common sensitive data types like credit card numbers, social security numbers, and email addresses. But every organization has its own unique data patterns that the built-in rules do not cover. Internal employee IDs, proprietary product codes, custom account numbers, medical record identifiers - these are all examples of data that matters to your organization but is not recognized by generic classifiers.

Custom classifications let you extend Purview's detection capabilities to identify these domain-specific data patterns. In this post, we will walk through creating custom classifications using both regex patterns and dictionary-based matching, applying them to scan rule sets, and validating that they work correctly.

## Understanding Classification in Purview

Before creating custom rules, it helps to understand how classification works during a scan.

When Purview scans a data source, it samples data from each column (or field, for unstructured data). It then runs each sample value against the classification rules in the active scan rule set. If a sufficient percentage of sampled values match a classification rule, Purview applies that classification to the column.

The key parameters are:

- **Distinct match threshold**: The minimum number of distinct matching values needed
- **Minimum match threshold**: The minimum percentage of sampled values that must match

These thresholds prevent false positives. A column named "notes" might occasionally contain something that looks like a phone number, but if only 2% of values match, it should not be classified as a phone number column.

## Creating a Custom Classification

Let us create a custom classification for an internal employee ID format. Say your organization uses employee IDs that follow the pattern: two letters followed by six digits (e.g., AB123456, XY789012).

### Step 1: Define the Classification

In the Purview governance portal:

1. Navigate to Data Map > Classifications
2. Click "New" to create a custom classification
3. Fill in the details:
   - **Name**: "Internal Employee ID"
   - **Description**: "Identifies internal employee identification numbers in the format XX999999"
   - **Category**: Choose an appropriate category or create a new one

### Step 2: Create the Classification Rule

Classification rules define how Purview detects the pattern. You can use regex patterns or dictionary matching.

#### Regex-Based Rule

For our employee ID pattern:

1. Navigate to Data Map > Classification rules
2. Click "New" to create a rule
3. Select "Regular Expression" as the rule type
4. Configure the rule:
   - **Name**: "employee-id-regex"
   - **Classification**: Select "Internal Employee ID" (the one we just created)
   - **Pattern**: `^[A-Z]{2}\d{6}$`
   - **Distinct match threshold**: 1
   - **Minimum match threshold**: 60

The regex pattern breaks down as follows:
- `^` - Start of string
- `[A-Z]{2}` - Exactly two uppercase letters
- `\d{6}` - Exactly six digits
- `$` - End of string

You can also create this through the REST API:

```python
import requests

purview_account = "my-purview-account"
base_url = f"https://{purview_account}.purview.azure.com"

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Create the custom classification
classification_payload = {
    "name": "Internal_Employee_ID",
    "kind": "Custom",
    "description": "Internal employee identification numbers in format XX999999"
}

response = requests.put(
    f"{base_url}/catalog/api/atlas/v2/types/typedefs",
    headers=headers,
    json={
        "classificationDefs": [classification_payload]
    }
)
print(f"Classification created: {response.status_code}")
```

#### Dictionary-Based Rule

For patterns that are better described by a known set of values rather than a regex, use dictionary matching. For example, classifying columns that contain department codes:

1. Create a CSV file with your dictionary values:

```csv
Value
ENGINEERING
MARKETING
SALES
FINANCE
HR
LEGAL
OPERATIONS
PRODUCT
```

2. Upload this as a dictionary in Purview:
   - Navigate to Data Map > Classification rules
   - Click "New" and select "Dictionary" as the rule type
   - Upload your CSV file
   - Set the match thresholds

Dictionary rules check if column values match entries in your dictionary. This is useful for categorical data with a known set of valid values.

## Combining Multiple Patterns

Sometimes a single pattern is not enough. You can create multiple classification rules that map to the same classification. Purview treats them as an OR condition - if any rule matches, the classification is applied.

For example, your organization might have two formats of employee IDs from different eras:

```python
# Old format: XX-999999 (with hyphen)
old_pattern = r'^[A-Z]{2}-\d{6}$'

# New format: XX999999 (without hyphen)
new_pattern = r'^[A-Z]{2}\d{6}$'
```

Create two classification rules, both mapped to the "Internal Employee ID" classification.

## Adding Custom Rules to Scan Rule Sets

Creating a classification and its rules is not enough - you also need to include them in the scan rule sets used by your scans.

### Create a Custom Scan Rule Set

```python
# Create a custom scan rule set that includes built-in and custom classifications
scan_ruleset_payload = {
    "name": "custom-sql-ruleset",
    "kind": "AzureSqlDatabase",
    "properties": {
        "description": "Custom scan rule set with org-specific classifications",
        "excludedSystemClassifications": [],
        "includedCustomClassificationRuleNames": [
            "employee-id-regex",
            "department-code-dictionary"
        ],
        "scanningRule": {
            "fileExtensions": [],
            "customFileExtensions": [],
            "dataPatternRules": []
        }
    }
}

response = requests.put(
    f"{base_url}/scan/scanrulesets/custom-sql-ruleset?api-version=2022-07-01-preview",
    headers=headers,
    json=scan_ruleset_payload
)
```

### Update Existing Scans

Update your existing scans to use the custom scan rule set:

1. Navigate to the data source in Purview
2. Edit the existing scan
3. Change the scan rule set from the system default to your custom rule set
4. Save and optionally trigger a re-scan

## Testing Custom Classifications

Before deploying custom classifications to production scans, test them to verify they work correctly.

### Using the Purview Portal Test Feature

The classification rule editor in the Purview portal includes a test feature:

1. Open your classification rule
2. Click "Test"
3. Enter sample values to test against:

```
AB123456    -> Should match
XY789012    -> Should match
abc123456   -> Should NOT match (lowercase letters)
AB12345     -> Should NOT match (only 5 digits)
AB1234567   -> Should NOT match (7 digits)
```

### Validate with a Test Scan

Create a small test database with known data patterns and run a scan against it:

```sql
-- Create a test table with known employee ID patterns
CREATE TABLE classification_test (
    id INT IDENTITY PRIMARY KEY,
    employee_id VARCHAR(20),
    name VARCHAR(100),
    random_text VARCHAR(200)
);

-- Insert rows where employee_id should be classified
INSERT INTO classification_test (employee_id, name, random_text) VALUES
('AB123456', 'Alice Johnson', 'Some random text here'),
('CD789012', 'Bob Smith', 'More random text'),
('EF345678', 'Charlie Brown', 'Nothing sensitive here'),
('GH901234', 'Diana Prince', 'Just regular content'),
('IJ567890', 'Eve Wilson', 'Plain text value');
```

Run a scan with your custom rule set and verify that the `employee_id` column gets classified as "Internal Employee ID" while the other columns do not.

## Advanced Patterns

### Column Name Matching

You can create rules that match based on column names in addition to (or instead of) data patterns. This is useful when column names follow conventions:

For example, any column named `emp_id`, `employee_id`, or `eid` might contain employee IDs regardless of the data format.

### Composite Classifications

For highly specific detection, combine column name patterns with data patterns. A column must match both conditions to be classified. This reduces false positives significantly.

For instance, a column named `notes` with values that happen to match the employee ID regex probably is not actually an employee ID column. But a column named `emp_id` with matching values almost certainly is.

## Managing Classifications at Scale

As your classification library grows, organization becomes important.

**Use meaningful names**: Name your classifications clearly. "Internal Employee ID" is better than "Custom Pattern 1".

**Document the business context**: Add descriptions that explain why this data is sensitive and what compliance requirements it relates to.

**Version your rules**: When modifying regex patterns, keep notes on what changed and why. A pattern change can cause previously classified columns to lose their classification.

**Review regularly**: Schedule quarterly reviews of custom classifications to ensure they still match current data formats. Data formats evolve, and your classification rules need to keep up.

## Common Pitfalls

**Overly broad regex patterns**: A pattern like `\d{6}` will match any six-digit number, causing massive false positives. Be as specific as your data format allows.

**Too low match thresholds**: Setting the minimum match threshold to 10% means a column will be classified even if only 10% of values match. This leads to noisy classifications.

**Forgetting to add rules to scan rule sets**: Creating a classification rule does not automatically include it in scans. You must explicitly add it to the scan rule set.

**Not testing with edge cases**: Test your patterns with values that are close to matching but should not. This catches regex mistakes before they hit production.

## Summary

Custom classifications in Microsoft Purview let you extend the platform's data detection capabilities to match your organization's specific data patterns. The process involves creating a classification (the label), defining classification rules (the detection logic using regex or dictionary matching), and adding those rules to scan rule sets used by your data source scans. Take the time to test your patterns thoroughly and set appropriate match thresholds to balance detection accuracy with false positive reduction. Well-configured custom classifications turn Purview into a powerful tool for discovering and governing sensitive data that is unique to your business.
