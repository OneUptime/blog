# How to Extract Named Entities from Text Using the Cloud Natural Language API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Natural Language API, Entity Extraction, NER, Text Analysis

Description: Learn how to extract named entities like people, organizations, locations, and dates from text using Google Cloud Natural Language API for structured data extraction.

---

Unstructured text is everywhere - emails, support tickets, news articles, social media posts, contracts, and reports. The challenge is pulling out the useful structured information buried in all those words. Who is mentioned? What companies? Which locations? What dates and amounts?

Named Entity Recognition (NER) through Google Cloud Natural Language API solves this by automatically identifying and classifying entities in text. It finds people, organizations, locations, events, dates, numbers, and more, then gives you structured data you can store, search, and analyze.

## What Entity Extraction Returns

For each detected entity, the API provides:

- **Name**: The entity text as it appears in the content
- **Type**: The entity category (PERSON, ORGANIZATION, LOCATION, EVENT, WORK_OF_ART, CONSUMER_GOOD, NUMBER, DATE, PRICE, etc.)
- **Salience**: How central or important the entity is to the overall text (0 to 1)
- **Metadata**: Additional details like Wikipedia URL and Knowledge Graph MID
- **Mentions**: Every place in the text where the entity appears, with position offsets

## Getting Started

Enable the API and install the client:

```bash
# Enable the Natural Language API
gcloud services enable language.googleapis.com

# Install the Python client
pip install google-cloud-language
```

## Basic Entity Extraction

Here is how to extract entities from a block of text:

```python
from google.cloud import language_v1

def extract_entities(text):
    """Extract named entities from text."""
    client = language_v1.LanguageServiceClient()

    document = language_v1.Document(
        content=text,
        type_=language_v1.Document.Type.PLAIN_TEXT,
    )

    response = client.analyze_entities(request={"document": document})

    print(f"Found {len(response.entities)} entities:\n")

    for entity in response.entities:
        entity_type = language_v1.Entity.Type(entity.type_).name
        print(f"  {entity.name}")
        print(f"    Type:     {entity_type}")
        print(f"    Salience: {entity.salience:.3f}")

        # Print metadata if available (Wikipedia URL, Knowledge Graph ID)
        if entity.metadata:
            for key, value in entity.metadata.items():
                print(f"    {key}: {value}")

        # Print mention details
        for mention in entity.mentions:
            mention_type = language_v1.EntityMention.Type(mention.type_).name
            print(f"    Mention:  '{mention.text.content}' (type: {mention_type}, "
                  f"offset: {mention.text.begin_offset})")
        print()

    return response.entities

# Extract entities from a news article paragraph
text = """
Google CEO Sundar Pichai announced new AI features at the annual Google I/O
conference in Mountain View, California on May 14. The company plans to invest
$2 billion in cloud infrastructure across Europe. Microsoft and Amazon are
also expanding their AI capabilities this year.
"""

entities = extract_entities(text)
```

## Filtering Entities by Type

In most applications, you care about specific entity types. Here is how to filter:

```python
from google.cloud import language_v1

def extract_entities_by_type(text, entity_types):
    """Extract only entities matching specific types."""
    client = language_v1.LanguageServiceClient()

    document = language_v1.Document(
        content=text,
        type_=language_v1.Document.Type.PLAIN_TEXT,
    )

    response = client.analyze_entities(request={"document": document})

    # Convert type names to enum values for comparison
    target_types = set()
    for type_name in entity_types:
        target_types.add(language_v1.Entity.Type[type_name])

    # Filter entities
    filtered = [
        entity for entity in response.entities
        if entity.type_ in target_types
    ]

    return filtered

# Extract only people and organizations from text
text = """
Tim Cook met with European regulators in Brussels to discuss Apple's
compliance with the Digital Markets Act. Margrethe Vestager, the EU's
competition chief, led the discussions alongside representatives from
Meta and Alphabet.
"""

people = extract_entities_by_type(text, ["PERSON"])
orgs = extract_entities_by_type(text, ["ORGANIZATION"])
locations = extract_entities_by_type(text, ["LOCATION"])

print("People:", [e.name for e in people])
print("Organizations:", [e.name for e in orgs])
print("Locations:", [e.name for e in locations])
```

## Processing Support Tickets

A practical application is extracting structured data from support tickets:

```python
from google.cloud import language_v1
import json

def parse_support_ticket(ticket_text):
    """Extract structured information from a support ticket."""
    client = language_v1.LanguageServiceClient()

    document = language_v1.Document(
        content=ticket_text,
        type_=language_v1.Document.Type.PLAIN_TEXT,
    )

    response = client.analyze_entities(request={"document": document})

    # Organize entities by type
    extracted = {
        "people": [],
        "organizations": [],
        "products": [],
        "locations": [],
        "dates": [],
        "numbers": [],
        "other": [],
    }

    type_mapping = {
        "PERSON": "people",
        "ORGANIZATION": "organizations",
        "CONSUMER_GOOD": "products",
        "LOCATION": "locations",
        "DATE": "dates",
        "NUMBER": "numbers",
    }

    for entity in response.entities:
        type_name = language_v1.Entity.Type(entity.type_).name
        category = type_mapping.get(type_name, "other")

        extracted[category].append({
            "name": entity.name,
            "salience": round(entity.salience, 3),
            "type": type_name,
        })

    return extracted

# Parse a support ticket
ticket = """
Hi, my name is Sarah Johnson. I've been having issues with my
MacBook Pro since upgrading to the latest version of Chrome.
The browser crashes every time I try to open Gmail. I'm located
in the Austin, Texas office. This has been happening since
January 15th and is affecting my entire team of 12 people.
Our account number is 4521-8873.
"""

parsed = parse_support_ticket(ticket)
print(json.dumps(parsed, indent=2))
```

## Batch Entity Extraction

Process multiple documents efficiently:

```python
from google.cloud import language_v1
from concurrent.futures import ThreadPoolExecutor, as_completed

def batch_extract_entities(texts, max_workers=10):
    """Extract entities from multiple texts in parallel."""
    client = language_v1.LanguageServiceClient()

    def process_single(text_data):
        """Process a single text."""
        document = language_v1.Document(
            content=text_data["text"],
            type_=language_v1.Document.Type.PLAIN_TEXT,
        )

        try:
            response = client.analyze_entities(request={"document": document})

            entities = []
            for entity in response.entities:
                entities.append({
                    "name": entity.name,
                    "type": language_v1.Entity.Type(entity.type_).name,
                    "salience": round(entity.salience, 3),
                })

            return {
                "id": text_data.get("id"),
                "entities": entities,
                "entity_count": len(entities),
            }

        except Exception as e:
            return {
                "id": text_data.get("id"),
                "error": str(e),
            }

    results = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(process_single, text_data): text_data
            for text_data in texts
        }

        for future in as_completed(futures):
            results.append(future.result())

    return results

# Process multiple articles
articles = [
    {"id": 1, "text": "Amazon opened a new headquarters in Arlington, Virginia."},
    {"id": 2, "text": "Tesla CEO Elon Musk announced record quarterly earnings."},
    {"id": 3, "text": "The United Nations Climate Summit will be held in Dubai in December."},
]

results = batch_extract_entities(articles)
for r in results:
    print(f"Article {r.get('id')}: {r.get('entity_count', 0)} entities")
    for e in r.get("entities", [])[:5]:
        print(f"  [{e['type']:15s}] {e['name']}")
```

## Entity Extraction with Sentiment

Combine entity extraction with sentiment analysis to understand how people feel about specific entities:

```python
from google.cloud import language_v1

def extract_entity_sentiment(text):
    """Extract entities with their associated sentiment."""
    client = language_v1.LanguageServiceClient()

    document = language_v1.Document(
        content=text,
        type_=language_v1.Document.Type.PLAIN_TEXT,
    )

    # Use analyze_entity_sentiment to get both
    response = client.analyze_entity_sentiment(request={"document": document})

    print("Entity Sentiment Analysis:\n")

    for entity in response.entities:
        entity_type = language_v1.Entity.Type(entity.type_).name
        score = entity.sentiment.score
        magnitude = entity.sentiment.magnitude

        # Determine sentiment label
        if score >= 0.3:
            label = "Positive"
        elif score <= -0.3:
            label = "Negative"
        else:
            label = "Neutral"

        print(f"  {entity.name} ({entity_type})")
        print(f"    Sentiment: {label} (score: {score:+.2f}, magnitude: {magnitude:.2f})")

        # Show sentiment per mention
        for mention in entity.mentions:
            m_score = mention.sentiment.score
            print(f"    Mention: '{mention.text.content}' (sentiment: {m_score:+.2f})")
        print()

    return response.entities

# Analyze a product comparison review
text = """
I tested both the iPhone 15 Pro and the Samsung Galaxy S24 Ultra.
The iPhone has an excellent camera system that produces stunning photos.
The Samsung has a beautiful display but the battery life was disappointing.
Both phones handle everyday tasks smoothly, but the iPhone feels more
polished overall. The Samsung's S Pen integration is unique and useful.
"""

extract_entity_sentiment(text)
```

## Building a Knowledge Extraction Pipeline

Here is a more complete example that extracts and structures knowledge from text:

```python
from google.cloud import language_v1
from collections import defaultdict

class KnowledgeExtractor:
    """Extract structured knowledge from unstructured text."""

    def __init__(self):
        self.client = language_v1.LanguageServiceClient()
        self.knowledge_base = defaultdict(list)

    def process_text(self, text, source_id=None):
        """Process text and add extracted entities to the knowledge base."""
        document = language_v1.Document(
            content=text,
            type_=language_v1.Document.Type.PLAIN_TEXT,
        )

        response = self.client.analyze_entities(request={"document": document})

        for entity in response.entities:
            entity_type = language_v1.Entity.Type(entity.type_).name

            # Build entity record
            record = {
                "name": entity.name,
                "type": entity_type,
                "salience": entity.salience,
                "source": source_id,
                "wikipedia_url": entity.metadata.get("wikipedia_url"),
                "mid": entity.metadata.get("mid"),
            }

            # Add to knowledge base indexed by entity name
            self.knowledge_base[entity.name.lower()].append(record)

    def search(self, query):
        """Search the knowledge base for an entity."""
        query_lower = query.lower()
        results = self.knowledge_base.get(query_lower, [])

        if not results:
            # Try partial matching
            for key, records in self.knowledge_base.items():
                if query_lower in key:
                    results.extend(records)

        return results

    def get_entities_by_type(self, entity_type):
        """Get all entities of a specific type."""
        results = []
        for name, records in self.knowledge_base.items():
            for record in records:
                if record["type"] == entity_type:
                    results.append(record)
        return results

    def get_summary(self):
        """Get a summary of the knowledge base contents."""
        type_counts = defaultdict(int)
        for name, records in self.knowledge_base.items():
            for record in records:
                type_counts[record["type"]] += 1

        return {
            "unique_entities": len(self.knowledge_base),
            "total_mentions": sum(len(r) for r in self.knowledge_base.values()),
            "by_type": dict(type_counts),
        }

# Build a knowledge base from multiple articles
extractor = KnowledgeExtractor()

articles = [
    ("article_1", "Google announced new cloud regions in Tokyo and London."),
    ("article_2", "Amazon Web Services expanded to Mumbai and Sydney last quarter."),
    ("article_3", "Microsoft Azure now has 60 regions worldwide including Tokyo."),
]

for article_id, text in articles:
    extractor.process_text(text, source_id=article_id)

# Query the knowledge base
print("Summary:", extractor.get_summary())
print("\nLocations:", [e["name"] for e in extractor.get_entities_by_type("LOCATION")])
print("Organizations:", [e["name"] for e in extractor.get_entities_by_type("ORGANIZATION")])
```

## Wrapping Up

Entity extraction with the Cloud Natural Language API transforms unstructured text into structured, searchable data. Whether you are parsing support tickets, analyzing news articles, or building knowledge bases, the API gives you a reliable way to identify and classify the important information in your text. Combined with sentiment analysis, you get a complete picture of not just what is being discussed but how people feel about it.

For monitoring your NLP processing pipeline and tracking API health, [OneUptime](https://oneuptime.com) provides the monitoring infrastructure to keep your text analysis services running reliably.
