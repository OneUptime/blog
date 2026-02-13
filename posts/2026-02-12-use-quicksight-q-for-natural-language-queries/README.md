# How to Use QuickSight Q for Natural Language Queries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, QuickSight, Natural Language, AI, Analytics

Description: Learn how to set up and use Amazon QuickSight Q to let business users ask questions about their data in plain English and get instant visualizations without writing SQL.

---

Not everyone on your team knows SQL or wants to learn how dashboards work. QuickSight Q bridges that gap by letting people type questions in plain English and get answers as charts, tables, or numbers. "What were our top 5 products by revenue last quarter?" becomes an instant visualization without anyone touching a query editor.

Q uses machine learning to understand your data's semantics and map natural language questions to the right fields, aggregations, and filters. It's not magic - it requires some setup to work well - but once configured, it's surprisingly effective.

## Prerequisites

QuickSight Q is available only in Enterprise Edition. You also need at least one SPICE dataset with Q enabled. Q doesn't work with direct query mode.

## Step 1: Create a Q Topic

A Q topic is a curated collection of datasets that Q can query. Think of it as defining the scope of what users can ask about. You wouldn't want someone asking HR questions against a sales dataset.

```bash
# Create a Q topic
aws quicksight create-topic \
  --aws-account-id 123456789012 \
  --topic-id sales-q-topic \
  --topic '{
    "Name": "Sales Analytics",
    "Description": "Ask questions about sales, orders, customers, and products",
    "DataSets": [{
      "DatasetArn": "arn:aws:quicksight:us-east-1:123456789012:dataset/sales-overview",
      "DatasetName": "Sales Overview",
      "DatasetDescription": "Order and revenue data by product, region, and customer",
      "DataAggregation": {
        "DatasetRowDateGranularity": "DAY",
        "DefaultDateColumnName": "order_date"
      },
      "Columns": [
        {
          "ColumnName": "order_date",
          "ColumnFriendlyName": "Order Date",
          "ColumnDescription": "The date the order was placed",
          "ColumnSynonyms": ["date", "when", "order time", "purchase date"],
          "IsIncludedInTopic": true,
          "SemanticType": {
            "TypeName": "DATE"
          },
          "TimeGranularity": "DAY",
          "DefaultAggregation": "COUNT"
        },
        {
          "ColumnName": "product",
          "ColumnFriendlyName": "Product Name",
          "ColumnDescription": "Name of the product sold",
          "ColumnSynonyms": ["item", "sku", "merchandise"],
          "IsIncludedInTopic": true,
          "SemanticType": {
            "TypeName": "STRING"
          }
        },
        {
          "ColumnName": "region",
          "ColumnFriendlyName": "Sales Region",
          "ColumnDescription": "Geographic region of the sale",
          "ColumnSynonyms": ["area", "territory", "location", "geo"],
          "IsIncludedInTopic": true,
          "SemanticType": {
            "TypeName": "STRING"
          }
        },
        {
          "ColumnName": "revenue",
          "ColumnFriendlyName": "Revenue",
          "ColumnDescription": "Total revenue from the order in USD",
          "ColumnSynonyms": ["sales", "income", "earnings", "amount"],
          "IsIncludedInTopic": true,
          "SemanticType": {
            "TypeName": "CURRENCY",
            "TypeParameters": {
              "CurrencyCode": "USD"
            }
          },
          "DefaultAggregation": "SUM"
        },
        {
          "ColumnName": "quantity",
          "ColumnFriendlyName": "Units Sold",
          "ColumnDescription": "Number of units in the order",
          "ColumnSynonyms": ["units", "count", "volume", "qty"],
          "IsIncludedInTopic": true,
          "DefaultAggregation": "SUM"
        },
        {
          "ColumnName": "customer_name",
          "ColumnFriendlyName": "Customer",
          "ColumnDescription": "Name of the customer",
          "ColumnSynonyms": ["buyer", "client", "account"],
          "IsIncludedInTopic": true
        },
        {
          "ColumnName": "category",
          "ColumnFriendlyName": "Product Category",
          "ColumnDescription": "Category of the product",
          "ColumnSynonyms": ["type", "group", "classification"],
          "IsIncludedInTopic": true
        }
      ]
    }]
  }'
```

## Step 2: Add Synonyms and Semantic Types

The quality of Q's answers depends heavily on how well you define your columns. Synonyms are the most important configuration. When a user asks "show me sales by territory," Q needs to know that "sales" maps to the revenue column and "territory" maps to region.

```bash
# Update a topic to add more context
aws quicksight update-topic \
  --aws-account-id 123456789012 \
  --topic-id sales-q-topic \
  --topic '{
    "Name": "Sales Analytics",
    "Description": "Ask questions about sales performance, orders, customers, and product metrics",
    "DataSets": [{
      "DatasetArn": "arn:aws:quicksight:us-east-1:123456789012:dataset/sales-overview",
      "DatasetName": "Sales Overview",
      "Columns": [
        {
          "ColumnName": "revenue",
          "ColumnFriendlyName": "Revenue",
          "ColumnSynonyms": ["sales", "income", "earnings", "amount", "money", "total", "value"],
          "IsIncludedInTopic": true,
          "SemanticType": {
            "TypeName": "CURRENCY",
            "TypeParameters": {
              "CurrencyCode": "USD"
            }
          },
          "DefaultAggregation": "SUM",
          "ComparativeOrder": {
            "UseOrdering": "GREATER_IS_BETTER"
          }
        },
        {
          "ColumnName": "profit_margin",
          "ColumnFriendlyName": "Profit Margin",
          "ColumnSynonyms": ["margin", "profitability", "markup"],
          "IsIncludedInTopic": true,
          "SemanticType": {
            "TypeName": "PERCENTAGE"
          },
          "DefaultAggregation": "AVERAGE",
          "ComparativeOrder": {
            "UseOrdering": "GREATER_IS_BETTER"
          }
        }
      ],
      "CalculatedFields": [
        {
          "CalculatedFieldName": "average_order_value",
          "CalculatedFieldDescription": "Average revenue per order",
          "CalculatedFieldSynonyms": ["AOV", "average order", "avg order"],
          "Expression": "sum(revenue) / count(order_id)",
          "IsIncludedInTopic": true,
          "DefaultAggregation": "AVERAGE"
        }
      ],
      "NamedEntities": [
        {
          "EntityName": "top_products",
          "EntityDescription": "The highest performing products by revenue",
          "EntitySynonyms": ["best sellers", "top sellers", "highest revenue products"],
          "Definition": [
            {
              "FieldName": "product",
              "PropertyRole": "PRIMARY_KEY"
            },
            {
              "FieldName": "revenue",
              "PropertyRole": "MEASURE",
              "PropertyUsage": "METRIC"
            }
          ]
        }
      ]
    }]
  }'
```

## Step 3: Configure the Q Search Bar

Add the Q search bar to your dashboard so users can start asking questions.

The Q bar is added through the QuickSight console when building your analysis. Go to the analysis, click "Add" in the toolbar, and select "Q search bar." Position it at the top of your dashboard sheet.

## Step 4: Train Q with Sample Questions

You can improve Q's accuracy by providing sample questions and their expected interpretations.

```bash
# Add verified answers for common questions
# This is typically done through the console, but the concept is:
# 1. Ask a question in the Q bar
# 2. If the answer is correct, mark it as "verified"
# 3. If incorrect, correct the visual and save it
```

Here are examples of questions Q can handle well with proper setup:

- "What was total revenue last month?"
- "Show me sales by region for Q4 2025"
- "Which product category has the highest profit margin?"
- "Compare revenue between US-East and US-West this year"
- "What are the top 10 customers by total orders?"
- "Show me the trend of monthly revenue for the past year"
- "How many orders did we get last week vs the week before?"

## Step 5: Grant Q Access to Users

Q access needs to be explicitly granted. Not all QuickSight users automatically get Q.

```bash
# Subscribe users to Q
# Q is part of the QuickSight Q add-on, which is priced separately
# Enable it for specific users through account settings

# Check if Q is enabled for your account
aws quicksight describe-account-settings \
  --aws-account-id 123456789012
```

## Embedding Q in Your Application

You can embed the Q search bar in your own application, just like regular dashboards.

```python
# generate_q_embed_url.py
import boto3

quicksight = boto3.client('quicksight', region_name='us-east-1')

response = quicksight.generate_embed_url_for_registered_user(
    AwsAccountId='123456789012',
    SessionLifetimeInMinutes=600,
    UserArn='arn:aws:quicksight:us-east-1:123456789012:user/default/app-user',
    ExperienceConfiguration={
        'QSearchBar': {
            'InitialTopicId': 'sales-q-topic'
        }
    },
    AllowedDomains=['https://myapp.example.com']
)

print(response['EmbedUrl'])
```

Embed it in your frontend.

```javascript
// Embed the Q search bar in your app
const embeddingContext = await QuickSightEmbedding.createEmbeddingContext();

const qSearchBar = await embeddingContext.embedQSearchBar({
  url: embedUrl,
  container: '#q-search-container',
  width: '100%',
  locale: 'en-US'
});

// Listen for question events
qSearchBar.on('Q_SEARCH_OPENED', () => {
  console.log('User opened Q search');
});

qSearchBar.on('Q_SEARCH_CLOSED', () => {
  console.log('User closed Q search');
});
```

## Tips for Better Q Results

After working with Q across several deployments, here's what makes the biggest difference:

- **Synonyms matter more than anything.** Users don't know your column names. They'll say "sales" when you named it "revenue," or "territory" when you named it "region." Add every synonym you can think of.
- **Keep column names human-readable.** `ColumnFriendlyName` is what Q uses to understand questions. "Total Revenue (USD)" is better than "ttl_rev."
- **Set default aggregations.** Revenue should default to SUM, customer count to COUNT DISTINCT, margin to AVERAGE. This prevents Q from doing weird things like averaging revenue.
- **Use comparative ordering.** Telling Q that "greater is better" for revenue means it understands questions like "worst performing regions" correctly.
- **Regularly review the Q feedback.** The QuickSight console shows which questions Q answered poorly. Use this to improve your topic configuration.
- **Don't overload a single topic.** If you have sales data and support data, create separate Q topics. Mixing unrelated data confuses both Q and your users.

QuickSight Q isn't going to replace a data analyst, but it handles the "quick question" use cases that usually end up as ad-hoc SQL requests or Slack messages to the analytics team. When it works well, it genuinely saves time. For the broader QuickSight setup, see our [QuickSight setup guide](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-quicksight-for-business-intelligence/view).
