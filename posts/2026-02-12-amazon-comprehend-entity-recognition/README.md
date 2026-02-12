# How to Use Amazon Comprehend for Entity Recognition

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Comprehend, Entity Recognition, NLP

Description: Learn how to extract named entities like people, organizations, dates, and locations from text using Amazon Comprehend's entity recognition APIs.

---

Named entity recognition (NER) is one of the most practical NLP tasks out there. It's how you pull structured data out of messy, unstructured text. Feed Comprehend a paragraph and it tells you which words are people, organizations, locations, dates, quantities, or other specific types. This is the backbone of document processing, content indexing, and automated data extraction.

Amazon Comprehend handles entity recognition without any training. The built-in models cover the most common entity types, and for domain-specific needs, you can train custom entity recognizers. Let's walk through both approaches.

## Built-in Entity Types

Comprehend recognizes these entity types out of the box:

- **PERSON** - Names of people
- **ORGANIZATION** - Companies, agencies, institutions
- **LOCATION** - Cities, countries, landmarks
- **DATE** - Dates and time expressions
- **QUANTITY** - Numbers and measurements
- **EVENT** - Named events
- **TITLE** - Titles of books, movies, songs
- **COMMERCIAL_ITEM** - Products and branded items
- **OTHER** - Entities that don't fit other categories

## Basic Entity Extraction

Here's how to extract entities from a single piece of text.

```python
import boto3
from collections import defaultdict

comprehend = boto3.client('comprehend', region_name='us-east-1')

def extract_entities(text, language='en'):
    """Extract named entities from text with confidence scores."""
    response = comprehend.detect_entities(
        Text=text,
        LanguageCode=language
    )

    entities = response['Entities']

    # Group by type for cleaner output
    grouped = defaultdict(list)
    for entity in entities:
        grouped[entity['Type']].append({
            'text': entity['Text'],
            'score': entity['Score'],
            'begin': entity['BeginOffset'],
            'end': entity['EndOffset']
        })

    return dict(grouped)

# Extract entities from a news article
text = """
Apple CEO Tim Cook announced at WWDC 2024 in San Jose that the company
would invest $5 billion in artificial intelligence research. The initiative,
called Apple Intelligence, will be led by John Giannandrea, the company's
SVP of Machine Learning. The first products are expected to ship in
September 2024 alongside the iPhone 16 launch.
"""

entities = extract_entities(text)
for entity_type, items in entities.items():
    print(f"\n{entity_type}:")
    for item in items:
        print(f"  - {item['text']} (confidence: {item['score']:.2%})")
```

## Batch Entity Detection

Process up to 25 documents in a single API call for better throughput.

```python
def batch_extract_entities(texts, language='en'):
    """Extract entities from multiple texts efficiently."""
    all_results = []

    for i in range(0, len(texts), 25):
        batch = texts[i:i+25]

        response = comprehend.batch_detect_entities(
            TextList=batch,
            LanguageCode=language
        )

        for item in response['ResultList']:
            doc_index = i + item['Index']
            all_results.append({
                'index': doc_index,
                'text': batch[item['Index']],
                'entities': item['Entities']
            })

        for error in response['ErrorList']:
            print(f"Error at index {i + error['Index']}: {error['ErrorMessage']}")

    return all_results

# Process multiple documents
documents = [
    "Microsoft acquired Activision Blizzard for $69 billion in October 2023.",
    "The Federal Reserve raised interest rates by 25 basis points on Wednesday.",
    "Elon Musk's SpaceX launched 22 Starlink satellites from Cape Canaveral."
]

results = batch_extract_entities(documents)
for r in results:
    print(f"\nDocument {r['index']}:")
    for entity in r['entities']:
        print(f"  [{entity['Type']}] {entity['Text']}")
```

## PII Entity Detection

Comprehend has a dedicated API for detecting personally identifiable information. This is critical for compliance with privacy regulations like GDPR and CCPA.

```python
def detect_pii(text, language='en'):
    """Detect personally identifiable information in text."""
    response = comprehend.detect_pii_entities(
        Text=text,
        LanguageCode=language
    )

    pii_entities = response['Entities']

    for entity in pii_entities:
        # Extract the actual text using offsets
        entity_text = text[entity['BeginOffset']:entity['EndOffset']]
        print(f"  [{entity['Type']}] '{entity_text}' "
              f"(confidence: {entity['Score']:.2%})")

    return pii_entities

# Find PII in customer data
detect_pii("""
Customer John Smith called from 555-123-4567 about his account.
His email is john.smith@example.com and he lives at
123 Main Street, Springfield, IL 62701. His SSN ends in 4567.
""")
```

## Redacting PII from Text

Once you've detected PII, you'll often want to redact it before storing or processing the text.

```python
def redact_pii(text, language='en', types_to_redact=None):
    """Replace PII entities with placeholder tags."""
    response = comprehend.detect_pii_entities(
        Text=text,
        LanguageCode=language
    )

    entities = response['Entities']

    # Sort entities by position in reverse order to avoid offset issues
    entities.sort(key=lambda x: x['BeginOffset'], reverse=True)

    redacted = text
    for entity in entities:
        # Only redact specified types, or all if none specified
        if types_to_redact and entity['Type'] not in types_to_redact:
            continue

        placeholder = f"[{entity['Type']}]"
        redacted = (
            redacted[:entity['BeginOffset']] +
            placeholder +
            redacted[entity['EndOffset']:]
        )

    return redacted

# Redact all PII
original = "Contact Jane Doe at jane.doe@corp.com or 555-987-6543."
redacted = redact_pii(original)
print(f"Original: {original}")
print(f"Redacted: {redacted}")

# Redact only specific types
redacted_partial = redact_pii(
    original,
    types_to_redact=['EMAIL', 'PHONE']
)
print(f"Partial:  {redacted_partial}")
```

## Building an Entity Extraction Pipeline

For production use, you'll want a pipeline that processes documents, extracts entities, and stores them in a searchable format.

```python
import json
from datetime import datetime

class EntityExtractionPipeline:
    """Pipeline for extracting and storing entities from documents."""

    def __init__(self):
        self.comprehend = boto3.client('comprehend', region_name='us-east-1')
        self.dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        self.table = self.dynamodb.Table('document-entities')

    def process_document(self, doc_id, text, metadata=None):
        """Process a document and store extracted entities."""
        # Handle Comprehend's 5000 byte limit
        chunks = self._chunk_text(text, max_bytes=5000)

        all_entities = []
        for chunk in chunks:
            response = self.comprehend.detect_entities(
                Text=chunk['text'],
                LanguageCode='en'
            )

            for entity in response['Entities']:
                # Adjust offsets for chunk position
                all_entities.append({
                    'text': entity['Text'],
                    'type': entity['Type'],
                    'score': str(entity['Score']),
                    'offset': entity['BeginOffset'] + chunk['offset']
                })

        # Deduplicate entities
        unique_entities = self._deduplicate(all_entities)

        # Store in DynamoDB
        self.table.put_item(Item={
            'doc_id': doc_id,
            'entities': json.dumps(unique_entities),
            'entity_count': len(unique_entities),
            'processed_at': datetime.utcnow().isoformat(),
            'metadata': json.dumps(metadata or {})
        })

        return unique_entities

    def _chunk_text(self, text, max_bytes=5000):
        """Split text into chunks that fit within Comprehend's size limit."""
        chunks = []
        current_pos = 0
        encoded = text.encode('utf-8')

        while current_pos < len(encoded):
            end_pos = min(current_pos + max_bytes, len(encoded))

            # Don't split in the middle of a word
            if end_pos < len(encoded):
                while end_pos > current_pos and encoded[end_pos:end_pos+1] != b' ':
                    end_pos -= 1

            chunk_text = encoded[current_pos:end_pos].decode('utf-8', errors='ignore')
            chunks.append({'text': chunk_text, 'offset': current_pos})
            current_pos = end_pos

        return chunks

    def _deduplicate(self, entities):
        """Remove duplicate entity mentions."""
        seen = set()
        unique = []

        for entity in entities:
            key = (entity['text'].lower(), entity['type'])
            if key not in seen:
                seen.add(key)
                unique.append(entity)

        return unique

# Usage
pipeline = EntityExtractionPipeline()
entities = pipeline.process_document(
    doc_id='doc-001',
    text='Amazon Web Services, led by CEO Matt Garman, launched...',
    metadata={'source': 'news', 'category': 'technology'}
)
```

## Async Jobs for Large-Scale Entity Extraction

For bulk processing, use asynchronous jobs.

```python
def start_entity_job(input_s3, output_s3, role_arn):
    """Start a large-scale entity recognition job."""
    response = comprehend.start_entities_detection_job(
        InputDataConfig={
            'S3Uri': input_s3,
            'InputFormat': 'ONE_DOC_PER_LINE'
        },
        OutputDataConfig={
            'S3Uri': output_s3
        },
        DataAccessRoleArn=role_arn,
        LanguageCode='en',
        JobName=f'entity-extraction-{int(datetime.now().timestamp())}'
    )

    print(f"Job started: {response['JobId']}")
    return response['JobId']
```

## Use Cases

Entity recognition powers a lot of practical applications. You can build automated document tagging systems that categorize content based on the organizations, people, and topics mentioned. Media monitoring tools use entity extraction to track brand mentions across news sources. Legal document processing uses it to identify parties, dates, and monetary amounts.

For custom entity types that Comprehend doesn't recognize by default - like product codes, medical terms, or domain-specific identifiers - check out our guide on [Amazon Comprehend custom classification](https://oneuptime.com/blog/post/amazon-comprehend-custom-classification/view). You can train models that recognize exactly the entities your business cares about.

If you're building entity extraction into a larger text analysis pipeline, consider combining it with [sentiment analysis](https://oneuptime.com/blog/post/amazon-comprehend-sentiment-analysis/view) to understand not just what entities are mentioned, but how people feel about them. That combination is incredibly powerful for brand monitoring and competitive intelligence.
