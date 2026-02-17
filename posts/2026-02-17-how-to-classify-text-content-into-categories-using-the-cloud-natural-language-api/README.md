# How to Classify Text Content into Categories Using the Cloud Natural Language API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Natural Language API, Text Classification, Content Categorization, NLP

Description: Learn how to automatically classify text content into predefined categories using Google Cloud Natural Language API for content organization and routing.

---

When you have a large volume of text content - articles, support tickets, product reviews, forum posts, or documents - organizing it into categories manually is not sustainable. Google Cloud Natural Language API includes a content classification feature that automatically assigns text to categories from a predefined taxonomy of over 1,000 categories covering topics like technology, finance, sports, health, entertainment, and more.

This is different from building a custom classifier. You do not need to provide training data or label examples. The API uses a pre-trained model that works out of the box. Let me show you how to use it and what you can build with it.

## How Content Classification Works

The API classifies text against Google's content taxonomy, which is a hierarchical set of categories. For example:

- /Technology/Computer Electronics
- /Finance/Banking
- /Health/Medical Facilities & Services
- /Sports/Team Sports/Soccer
- /Arts & Entertainment/Movies

Each classification comes with a confidence score between 0 and 1. The API can assign multiple categories to a single piece of text if the content spans multiple topics.

The text needs to be at least 20 words for classification to work effectively. Longer texts generally produce more accurate results.

## Basic Text Classification

Here is how to classify a piece of text:

```python
from google.cloud import language_v1

def classify_text(text):
    """Classify text content into categories."""
    client = language_v1.LanguageServiceClient()

    document = language_v1.Document(
        content=text,
        type_=language_v1.Document.Type.PLAIN_TEXT,
    )

    response = client.classify_text(request={"document": document})

    print(f"Text: {text[:80]}...\n")
    print("Categories:")
    for category in response.categories:
        print(f"  {category.name}: {category.confidence:.2f}")

    return response.categories

# Classify different types of content
classify_text(
    "The new MacBook Pro features the M3 chip with improved GPU performance. "
    "Apple claims up to 40 percent faster rendering compared to the previous "
    "generation. The laptop is available in space black and silver finishes "
    "with starting prices at $1,599 for the 14-inch model."
)

classify_text(
    "The Federal Reserve held interest rates steady at its latest meeting, "
    "signaling a cautious approach to monetary policy amid mixed economic "
    "signals. Inflation has moderated but remains above the central bank's "
    "two percent target. Stock markets responded positively to the announcement."
)

classify_text(
    "Barcelona secured a dominant 4-1 victory over Real Madrid in the "
    "Champions League semifinal. Two goals from the young forward helped "
    "seal the result, with the home crowd celebrating throughout the match. "
    "The team will face Bayern Munich in the final next month."
)
```

## Batch Classification

Classify multiple texts efficiently:

```python
from google.cloud import language_v1
from concurrent.futures import ThreadPoolExecutor, as_completed

def classify_batch(texts, max_workers=10):
    """Classify multiple texts in parallel."""
    client = language_v1.LanguageServiceClient()

    def classify_single(text_item):
        """Classify a single text item."""
        document = language_v1.Document(
            content=text_item["text"],
            type_=language_v1.Document.Type.PLAIN_TEXT,
        )

        try:
            response = client.classify_text(request={"document": document})

            categories = [
                {"name": cat.name, "confidence": round(cat.confidence, 3)}
                for cat in response.categories
            ]

            return {
                "id": text_item.get("id"),
                "text_preview": text_item["text"][:60],
                "categories": categories,
                "primary_category": categories[0]["name"] if categories else "Uncategorized",
            }

        except Exception as e:
            return {
                "id": text_item.get("id"),
                "error": str(e),
                "primary_category": "Error",
            }

    results = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(classify_single, item): item
            for item in texts
        }

        for future in as_completed(futures):
            results.append(future.result())

    return results
```

## Building a Content Organization System

A practical application is automatically organizing content into sections:

```python
from google.cloud import language_v1
from collections import defaultdict

class ContentOrganizer:
    """Automatically organize text content into categories."""

    def __init__(self, min_confidence=0.5):
        self.client = language_v1.LanguageServiceClient()
        self.min_confidence = min_confidence
        self.categorized_content = defaultdict(list)

    def add_content(self, content_id, text, metadata=None):
        """Classify and store content."""
        document = language_v1.Document(
            content=text,
            type_=language_v1.Document.Type.PLAIN_TEXT,
        )

        try:
            response = self.client.classify_text(request={"document": document})

            # Get categories above confidence threshold
            categories = [
                cat for cat in response.categories
                if cat.confidence >= self.min_confidence
            ]

            if not categories:
                categories_names = ["Uncategorized"]
            else:
                categories_names = [cat.name for cat in categories]

            # Store content under each matching category
            content_record = {
                "id": content_id,
                "text_preview": text[:200],
                "categories": [
                    {"name": cat.name, "confidence": cat.confidence}
                    for cat in categories
                ] if categories != ["Uncategorized"] else [],
                "metadata": metadata or {},
            }

            for cat_name in categories_names:
                # Use the top-level category for organization
                top_level = cat_name.split("/")[1] if "/" in cat_name else cat_name
                self.categorized_content[top_level].append(content_record)

            return content_record

        except Exception as e:
            print(f"Classification failed for {content_id}: {e}")
            return None

    def get_category_summary(self):
        """Get a summary of content by category."""
        summary = {}
        for category, items in sorted(self.categorized_content.items()):
            summary[category] = {
                "count": len(items),
                "sample_ids": [item["id"] for item in items[:5]],
            }
        return summary

    def get_content_by_category(self, category, limit=10):
        """Retrieve content for a specific category."""
        items = self.categorized_content.get(category, [])
        return items[:limit]

    def search_similar(self, text):
        """Find content in the same category as the given text."""
        document = language_v1.Document(
            content=text,
            type_=language_v1.Document.Type.PLAIN_TEXT,
        )

        response = self.client.classify_text(request={"document": document})

        if not response.categories:
            return []

        # Get the primary category
        primary = response.categories[0].name
        top_level = primary.split("/")[1] if "/" in primary else primary

        return self.get_content_by_category(top_level)

# Build an organized content library
organizer = ContentOrganizer(min_confidence=0.5)

articles = [
    ("art_1", "New advances in quantum computing promise to revolutionize cryptography "
              "and drug discovery. Researchers at MIT demonstrated a 100-qubit processor "
              "that maintains coherence for record-breaking durations."),
    ("art_2", "The S&P 500 reached a new all-time high today as tech stocks rallied. "
              "Investors are optimistic about upcoming earnings reports from major "
              "companies including Apple, Microsoft, and Amazon."),
    ("art_3", "A new study published in the Journal of Medicine shows promising results "
              "for a novel cancer immunotherapy treatment. Clinical trials involved "
              "over 500 patients across 20 hospitals worldwide."),
    ("art_4", "The latest smartphone from Samsung features a foldable display with "
              "improved durability and a 200 megapixel camera sensor. The device "
              "runs on the latest Snapdragon processor with 12GB of RAM."),
    ("art_5", "Climate scientists warn that Arctic ice levels have reached their "
              "lowest point in recorded history. The findings were presented at "
              "the International Climate Research Conference in Geneva."),
]

for article_id, text in articles:
    organizer.add_content(article_id, text)

# View organization results
summary = organizer.get_category_summary()
for category, info in summary.items():
    print(f"{category}: {info['count']} articles")
```

## Routing Support Tickets

Use classification to automatically route support tickets to the right team:

```python
from google.cloud import language_v1

class TicketRouter:
    """Route support tickets to teams based on content classification."""

    def __init__(self):
        self.client = language_v1.LanguageServiceClient()

        # Map categories to support teams
        self.routing_rules = {
            "Computers & Electronics": "tech_support",
            "Internet & Telecom": "network_team",
            "Finance": "billing_team",
            "Shopping": "orders_team",
            "Business & Industrial": "enterprise_team",
        }

        self.default_team = "general_support"

    def route_ticket(self, ticket_text):
        """Classify a ticket and determine the appropriate team."""
        document = language_v1.Document(
            content=ticket_text,
            type_=language_v1.Document.Type.PLAIN_TEXT,
        )

        try:
            response = self.client.classify_text(request={"document": document})

            if not response.categories:
                return {
                    "team": self.default_team,
                    "category": "Uncategorized",
                    "confidence": 0,
                }

            # Find the best matching team
            for category in response.categories:
                # Check each level of the category path
                parts = category.name.strip("/").split("/")
                for part in parts:
                    if part in self.routing_rules:
                        return {
                            "team": self.routing_rules[part],
                            "category": category.name,
                            "confidence": category.confidence,
                        }

            return {
                "team": self.default_team,
                "category": response.categories[0].name,
                "confidence": response.categories[0].confidence,
            }

        except Exception as e:
            return {
                "team": self.default_team,
                "category": "Error",
                "confidence": 0,
                "error": str(e),
            }

# Route incoming tickets
router = TicketRouter()

tickets = [
    "My laptop screen is flickering after the latest Windows update. I have tried "
    "restarting and updating the display drivers but nothing has worked so far.",

    "I was charged twice for my subscription this month. My credit card shows "
    "two transactions of $29.99 on the same date. Please refund the duplicate.",

    "Our company needs to upgrade from the starter plan to the enterprise plan. "
    "We have 500 employees and need SSO integration with our Active Directory.",
]

for ticket in tickets:
    result = router.route_ticket(ticket)
    print(f"Team: {result['team']}")
    print(f"Category: {result['category']}")
    print(f"Confidence: {result['confidence']:.2f}")
    print(f"Ticket: {ticket[:60]}...")
    print()
```

## Combining Classification with Other NLP Features

For a complete content analysis pipeline, combine classification with sentiment and entity extraction:

```python
from google.cloud import language_v1

def full_content_analysis(text):
    """Run classification, sentiment, and entity analysis on text."""
    client = language_v1.LanguageServiceClient()

    document = language_v1.Document(
        content=text,
        type_=language_v1.Document.Type.PLAIN_TEXT,
    )

    # Run all three analyses
    # Note: classify_text requires at least 20 words
    results = {}

    # Classification
    try:
        class_response = client.classify_text(request={"document": document})
        results["categories"] = [
            {"name": cat.name, "confidence": round(cat.confidence, 3)}
            for cat in class_response.categories
        ]
    except Exception:
        results["categories"] = []

    # Sentiment
    sent_response = client.analyze_sentiment(request={"document": document})
    results["sentiment"] = {
        "score": round(sent_response.document_sentiment.score, 3),
        "magnitude": round(sent_response.document_sentiment.magnitude, 3),
    }

    # Entities
    ent_response = client.analyze_entities(request={"document": document})
    results["entities"] = [
        {
            "name": entity.name,
            "type": language_v1.Entity.Type(entity.type_).name,
            "salience": round(entity.salience, 3),
        }
        for entity in ent_response.entities[:10]  # Top 10 entities
    ]

    return results

# Complete analysis of an article
article = """
Apple has announced a major update to its iCloud service, introducing
end-to-end encryption for all stored data. The move comes after years
of criticism from privacy advocates who argued that Apple's cloud
storage was not as secure as its device-level encryption. Tim Cook
stated that user privacy remains the company's top priority. The update
will roll out across all regions by the end of the quarter.
"""

analysis = full_content_analysis(article)
print("Categories:", analysis["categories"])
print("Sentiment:", analysis["sentiment"])
print("Top entities:", [(e["name"], e["type"]) for e in analysis["entities"][:5]])
```

## Limitations to Know About

A few things to keep in mind when using content classification:

- The text must be at least 20 words. Shorter texts will return an error.
- The taxonomy is fixed - you cannot add custom categories. For custom classification, you would need AutoML Natural Language or Vertex AI.
- The categories are English-centric in naming, but the API works with text in many languages.
- Very specialized or niche content may not match any category well.
- The confidence threshold matters. Experiment to find the right cutoff for your use case.

## Wrapping Up

Content classification with the Cloud Natural Language API gives you instant categorization without any model training. It works well for organizing content, routing tickets, filtering feeds, and building recommendation systems. For most applications, combining it with sentiment analysis and entity extraction creates a powerful NLP pipeline that extracts maximum value from your text data.

For monitoring the reliability of your content classification pipeline and tracking processing metrics, [OneUptime](https://oneuptime.com) provides monitoring and alerting that keeps your NLP infrastructure healthy and responsive.
