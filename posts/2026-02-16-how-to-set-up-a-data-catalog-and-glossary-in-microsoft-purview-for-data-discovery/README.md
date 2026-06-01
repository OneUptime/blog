# How to Set Up a Data Catalog and Glossary in Microsoft Purview

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Purview, Data Catalog, Business Glossary, Data Discovery, Data Governance, Metadata Management, Azure Cloud

Description: Learn how to set up a data catalog and business glossary in Microsoft Purview so teams across your organization can find and understand data assets.

---

One of the most frustrating problems in data-driven organizations is not having data - it is not knowing what data you already have. Data scientists spend hours asking around for the right dataset. Analysts build reports from the wrong table because they could not tell the difference between `customer_v2` and `customer_final_v3`. Business users give up on self-service analytics because they cannot find anything in the data lake.

Microsoft Purview's data catalog and business glossary solve this by creating a searchable, well-organized inventory of your data assets with business-friendly definitions attached. In this post, we will set up a practical data catalog with a glossary that makes data discoverable and understandable across your organization.

## The Data Catalog vs. The Business Glossary

These two features work together but serve different purposes:

**Data Catalog**: An automatically populated inventory of your technical data assets - tables, files, databases, columns. It is built from the scans you configure (as we covered in the registration and scanning post). The catalog answers "what data exists and where is it?"

**Business Glossary**: A manually curated dictionary of business terms and their definitions. Terms like "Active Customer," "Monthly Recurring Revenue," or "Churn Rate" are defined here with their precise business meaning. The glossary answers "what does this data mean?"

The power comes from linking glossary terms to catalog assets. When a business user searches for "Monthly Recurring Revenue," they find not just the definition but also the exact tables and columns where that metric is calculated.

## Setting Up the Business Glossary

### Creating the Glossary Structure

Start by defining a hierarchy of glossary terms that reflects your business domains. In the Purview governance portal:

1. Navigate to Data Catalog > Glossary
2. Click "New term" to create a top-level term

Here is a practical glossary structure for an e-commerce company:

```text
Customer Domain
  |-- Customer
  |-- Active Customer
  |-- Customer Lifetime Value
  |-- Customer Segment
  |-- Churn Rate

Financial Domain
  |-- Revenue
  |-- Monthly Recurring Revenue (MRR)
  |-- Annual Recurring Revenue (ARR)
  |-- Average Order Value
  |-- Gross Margin

Product Domain
  |-- Product
  |-- SKU
  |-- Product Category
  |-- Inventory Level
```

### Creating a Glossary Term

For each term, provide a comprehensive definition. Here is how to create a term through the portal and the API:

In the portal:
1. Click "New term"
2. Select a term template (or use the default System template)
3. Fill in the details

Through the API:

```python
import requests

purview_account = "my-purview-account"
base_url = f"https://{purview_account}.purview.azure.com"

headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Create a glossary term for "Active Customer"

term_payload = {
    "name": "Active Customer",
    "qualifiedName": "Active Customer@Glossary",
    "longDescription": "A customer who has made at least one purchase within the last 90 days. This definition excludes trial accounts and internal test accounts. The 90-day window is calculated from the current date, rolling daily.",
    "shortDescription": "Customer with a purchase in the last 90 days",
    "abbreviation": "AC",
    "status": "Approved",
    "anchor": {
        "glossaryGuid": "<your-glossary-guid>"
    },
    "contacts": {
        "Expert": [
            {
                "id": "jane.smith@company.com",
                "info": "Data Steward for Customer domain"
            }
        ],
        "Steward": [
            {
                "id": "vp.customer@company.com",
                "info": "Business owner for Customer terms"
            }
        ]
    },
    "attributes": {
        "Business Term Template": {
            "Source of Truth": "customer_analytics.dim_customers",
            "Update Frequency": "Daily",
            "Review Date": "2026-06-01"
        }
    }
}

response = requests.post(
    f"{base_url}/datamap/api/atlas/v2/glossary/term?api-version=2023-09-01",
    headers=headers,
    json=term_payload
)
print(f"Term created: {response.status_code}")
term_guid = response.json().get("guid")
```

### Term Templates

Purview supports custom term templates that add structured fields to your glossary terms. Create a template when you want consistent metadata across all terms:

```python
# Define the custom attributes to create in Manage term templates
template_payload = {
    "name": "Business Term Template",
    "attributes": [
        {
            "name": "Data Steward",
            "description": "Person responsible for the accuracy of this term",
            "fieldType": "Text"
        },
        {
            "name": "Source of Truth",
            "description": "The authoritative data source for this term",
            "fieldType": "Text"
        },
        {
            "name": "Calculation Logic",
            "description": "SQL or business logic for computing this metric",
            "fieldType": "Text"
        },
        {
            "name": "Business Owner",
            "description": "Business stakeholder who owns this term",
            "fieldType": "Text"
        },
        {
            "name": "Review Date",
            "description": "Date when this term was last reviewed for accuracy",
            "fieldType": "Date"
        }
    ]
}
```

## Linking Glossary Terms to Data Assets

The real value of the glossary emerges when you connect terms to the actual data. This creates a bridge between business language and technical assets.

### Assigning Terms to Tables

```python
# Link the "Active Customer" term to the dim_customers table
# First, find the table's GUID
search_response = requests.post(
    f"{base_url}/datamap/api/search/query?api-version=2023-09-01",
    headers=headers,
    json={
        "keywords": "dim_customers",
        "limit": 5
    }
)

table_guid = search_response.json()["value"][0]["id"]

# Assign the glossary term to the table
assign_payload = [
    {
        "guid": table_guid
    }
]

response = requests.post(
    f"{base_url}/datamap/api/atlas/v2/glossary/terms/{term_guid}/assignedEntities?api-version=2023-09-01",
    headers=headers,
    json=assign_payload
)
```

### Assigning Terms to Columns

You can also assign glossary terms to specific columns, which is more precise:

1. Navigate to the table in the data catalog
2. Click on the Schema tab
3. Find the relevant column
4. Click the glossary term icon and search for the appropriate term
5. Select the term to assign it

This means when someone searches for "Active Customer" in Purview, they find not just the definition but also the exact column (`is_active` in `dim_customers`) that implements this concept.

## Organizing with Collections

Collections provide a hierarchical access control structure for your catalog. They complement the glossary by organizing data assets by domain, team, or environment.

### Creating a Collection Hierarchy

```python
# Create a collection structure via the Purview API
collections = [
    {
        "name": "production",
        "friendlyName": "Production",
        "description": "Production data assets",
        "parentCollection": purview_account
    },
    {
        "name": "customer-data",
        "friendlyName": "Customer Data",
        "description": "All customer-related data assets",
        "parentCollection": "production"
    },
    {
        "name": "financial-data",
        "friendlyName": "Financial Data",
        "description": "Financial and revenue data assets",
        "parentCollection": "production"
    },
    {
        "name": "development",
        "friendlyName": "Development",
        "description": "Development and testing data assets",
        "parentCollection": purview_account
    }
]

for collection in collections:
    response = requests.put(
        f"{base_url}/account/collections/{collection['name']}?api-version=2019-11-01-preview",
        headers=headers,
        json={
            "friendlyName": collection["friendlyName"],
            "description": collection["description"],
            "parentCollection": {
                "referenceName": collection["parentCollection"]
            }
        }
    )
    print(f"Collection '{collection['name']}' created: {response.status_code}")
```

## Enabling Data Discovery

With the catalog populated and glossary terms linked, let us make sure people can actually find things.

### Search Best Practices

Purview's portal search supports simple keyword searches:

```text
# Search by business term
"Active Customer"

# Search by table name
dim_customers
```

For API searches, use the documented `filter` object rather than field-qualified strings:

```python
# Search by classification
requests.post(
    f"{base_url}/datamap/api/search/query?api-version=2023-09-01",
    headers=headers,
    json={
        "keywords": None,
        "limit": 10,
        "filter": {
            "classification": "MICROSOFT.GOVERNMENT.US.SOCIAL_SECURITY_NUMBER"
        }
    }
)

# Search by collection
requests.post(
    f"{base_url}/datamap/api/search/query?api-version=2023-09-01",
    headers=headers,
    json={
        "keywords": None,
        "limit": 10,
        "filter": {
            "collectionId": "production"
        }
    }
)

# Search by glossary term
requests.post(
    f"{base_url}/datamap/api/search/query?api-version=2023-09-01",
    headers=headers,
    json={
        "keywords": "Active Customer",
        "limit": 10,
        "filter": {
            "term": "Active Customer"
        }
    }
)
```

### Curating Asset Descriptions

Automated scans populate technical metadata, but human-readable descriptions make assets truly discoverable. Assign data stewards to curate descriptions for your most important assets:

```python
# Update a table's description and add expert contacts
update_payload = {
    "entity": {
        "typeName": "azure_sql_table",
        "guid": table_guid,
        "attributes": {
            "userDescription": "Central customer dimension table. Contains one row per customer with demographic info, acquisition details, and current engagement metrics. Updated daily at 6 AM UTC by the customer-etl pipeline. Use the is_active column to filter to active customers (purchased in last 90 days)."
        },
        "contacts": {
            "Expert": [
                {
                    "id": "jane.smith@company.com",
                    "info": "Data Steward for Customer domain"
                }
            ],
            "Owner": [
                {
                    "id": "vp.customer@company.com",
                    "info": "VP of Customer Success"
                }
            ]
        }
    }
}

response = requests.post(
    f"{base_url}/datamap/api/atlas/v2/entity?api-version=2023-09-01",
    headers=headers,
    json=update_payload
)
```

## Managing Glossary Term Workflows

For organizations with formal governance processes, Purview supports term approval workflows:

**Draft**: The term is being written. Not visible to general users.
**Approved**: The term has been reviewed and approved by the data steward. Visible to all users.
**Expired**: The term is outdated and needs review. Still visible but flagged.

Set up a review process:

1. New terms start as Draft
2. The data steward reviews and moves to Approved
3. Set a review date for periodic re-validation
4. Terms past their review date are flagged for attention

## Measuring Catalog Adoption

Track whether your catalog is actually being used:

- **Search volume**: How many searches are performed per week?
- **Asset coverage**: What percentage of your data assets have descriptions and glossary terms?
- **Term coverage**: How many business terms are defined vs. how many should be?
- **Steward assignment**: What percentage of critical assets have assigned stewards?

```python
# Query Purview for catalog statistics
# Get total asset count
search_response = requests.post(
    f"{base_url}/datamap/api/search/query?api-version=2023-09-01",
    headers=headers,
    json={
        "keywords": None,
        "limit": 1
    }
)
total_assets = search_response.json().get("@search.count", 0)
print(f"Total cataloged assets: {total_assets}")

# Get assets with descriptions
search_response = requests.post(
    f"{base_url}/datamap/api/search/query?api-version=2023-09-01",
    headers=headers,
    json={
        "keywords": None,
        "limit": 1,
        "filter": {
            "not": {"attributeName": "userDescription", "operator": "eq", "attributeValue": ""}
        }
    }
)
described_assets = search_response.json().get("@search.count", 0)
print(f"Assets with descriptions: {described_assets}")
print(f"Description coverage: {described_assets/total_assets*100:.1f}%")
```

## Summary

A data catalog and business glossary in Microsoft Purview bridge the gap between technical data assets and business understanding. The catalog is populated automatically through scans, while the glossary requires intentional curation by data stewards. The key to making this work is linking glossary terms to data assets so that business users can search in their language and find the right technical resources. Start with your most important business terms and most frequently used data assets, assign stewards, and expand coverage over time. The goal is not to catalog everything immediately but to make the most valuable data easy to find and understand.
