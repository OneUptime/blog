# How to Set Up Azure Content Safety to Moderate User-Generated Content

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Content Safety, Moderation, AI, Trust and Safety, User Generated Content

Description: Configure Azure Content Safety to automatically moderate user-generated text and images for harmful content in your applications.

---

Any application that accepts user-generated content - comments, reviews, chat messages, uploaded images, forum posts - needs content moderation. Without it, you risk exposing your users to harmful content and your business to legal and reputational damage. Manual moderation does not scale, and simple keyword blocklists are easy to bypass. Azure Content Safety provides AI-powered moderation that understands context and nuance, catching harmful content that keyword filters miss while reducing false positives on legitimate content. In this post, I will show you how to set it up and integrate it into your application.

## What Azure Content Safety Detects

Azure Content Safety analyzes both text and images across four harm categories:

- **Hate**: Content that attacks or discriminates against people based on race, ethnicity, nationality, gender, sexual orientation, religion, disability, or other protected characteristics.
- **Sexual**: Sexually explicit content, including both graphic descriptions and suggestive content.
- **Violence**: Descriptions or depictions of physical violence, threats, or glorification of violent acts.
- **Self-harm**: Content that promotes, encourages, or provides instructions for self-harm or suicide.

Each category is rated on a severity scale from 0 to 6:

- **0-1**: Safe content
- **2-3**: Low severity
- **4-5**: Medium severity
- **6**: High severity

You choose the threshold for each category based on your application's needs.

## Step 1: Create a Content Safety Resource

In the Azure Portal:

1. Search for "Content Safety" in the marketplace.
2. Click "Create."
3. Select your subscription, resource group, and region (East US, West Europe, and other major regions are supported).
4. Choose the Standard S0 pricing tier.
5. Review and create.

Copy the endpoint and API key.

## Step 2: Install the SDK

```bash
# Install the Azure Content Safety SDK
pip install azure-ai-contentsafety
```

## Step 3: Moderate Text Content

```python
from azure.ai.contentsafety import ContentSafetyClient
from azure.ai.contentsafety.models import AnalyzeTextOptions, TextCategory
from azure.core.credentials import AzureKeyCredential

# Configure the client
endpoint = "https://your-resource.cognitiveservices.azure.com/"
key = "your-api-key"

client = ContentSafetyClient(endpoint, AzureKeyCredential(key))

def moderate_text(text):
    """
    Analyze text for harmful content across all four categories.
    Returns the severity level for each category.
    """
    request = AnalyzeTextOptions(
        text=text,
        categories=[
            TextCategory.HATE,
            TextCategory.SEXUAL,
            TextCategory.VIOLENCE,
            TextCategory.SELF_HARM
        ]
    )

    response = client.analyze_text(request)

    result = {
        "text": text[:100] + "..." if len(text) > 100 else text,
        "categories": {}
    }

    for category_result in response.categories_analysis:
        result["categories"][category_result.category] = {
            "severity": category_result.severity
        }

    return result


# Test with different types of content
test_messages = [
    "This product is great, I really love the new features!",
    "The weather is terrible today, I hope it gets better tomorrow.",
    "I am going to share my experience with the customer support team."
]

for msg in test_messages:
    result = moderate_text(msg)
    print(f"\nText: {result['text']}")
    for category, info in result["categories"].items():
        print(f"  {category}: severity {info['severity']}")
```

## Step 4: Build a Content Moderation Pipeline

In a real application, you need a moderation pipeline that decides whether to allow, flag, or block content based on the severity scores.

```python
class ContentModerator:
    """
    Content moderation pipeline with configurable thresholds.
    Decides whether user content should be allowed, flagged for review, or blocked.
    """

    def __init__(self, endpoint, key):
        self.client = ContentSafetyClient(endpoint, AzureKeyCredential(key))
        # Default thresholds - customize per category
        self.block_thresholds = {
            "Hate": 4,        # Block at medium severity and above
            "Sexual": 4,
            "Violence": 4,
            "SelfHarm": 2     # More sensitive - block at lower severity
        }
        self.flag_thresholds = {
            "Hate": 2,        # Flag for review at low severity
            "Sexual": 2,
            "Violence": 2,
            "SelfHarm": 1     # Flag at any detection
        }

    def moderate(self, text):
        """
        Moderate text and return a decision: allow, flag, or block.
        Also returns the detailed category scores.
        """
        request = AnalyzeTextOptions(text=text)
        response = self.client.analyze_text(request)

        decision = "allow"
        triggered_categories = []
        scores = {}

        for category_result in response.categories_analysis:
            category = category_result.category
            severity = category_result.severity
            scores[category] = severity

            # Check block threshold
            if severity >= self.block_thresholds.get(category, 4):
                decision = "block"
                triggered_categories.append({
                    "category": category,
                    "severity": severity,
                    "action": "block"
                })
            # Check flag threshold
            elif severity >= self.flag_thresholds.get(category, 2):
                if decision != "block":  # Do not downgrade from block to flag
                    decision = "flag"
                triggered_categories.append({
                    "category": category,
                    "severity": severity,
                    "action": "flag"
                })

        return {
            "decision": decision,
            "scores": scores,
            "triggered_categories": triggered_categories,
            "text_preview": text[:100]
        }

    def set_thresholds(self, category, block_level, flag_level):
        """Update thresholds for a specific category."""
        self.block_thresholds[category] = block_level
        self.flag_thresholds[category] = flag_level


# Create the moderator
moderator = ContentModerator(endpoint, key)

# Moderate user content
def handle_user_message(user_id, message):
    """
    Process a user message through the moderation pipeline.
    Takes action based on the moderation decision.
    """
    result = moderator.moderate(message)

    if result["decision"] == "block":
        # Do not publish the content
        print(f"BLOCKED message from user {user_id}")
        for trigger in result["triggered_categories"]:
            print(f"  Reason: {trigger['category']} (severity: {trigger['severity']})")
        # Log for audit
        log_moderation_action(user_id, message, result)
        return {"status": "blocked", "message": "Your message could not be posted."}

    elif result["decision"] == "flag":
        # Publish but queue for human review
        print(f"FLAGGED message from user {user_id} for review")
        queue_for_review(user_id, message, result)
        return {"status": "published", "message": "Your message has been posted."}

    else:
        # Content is clean - publish immediately
        print(f"ALLOWED message from user {user_id}")
        return {"status": "published", "message": "Your message has been posted."}


def log_moderation_action(user_id, message, result):
    """Log moderation decisions for audit and analytics."""
    # In production, write to a database or logging service
    print(f"  Audit log: user={user_id}, decision={result['decision']}, "
          f"scores={result['scores']}")

def queue_for_review(user_id, message, result):
    """Queue flagged content for human review."""
    # In production, add to a review queue (database, service bus, etc.)
    print(f"  Queued for review: user={user_id}, "
          f"triggers={result['triggered_categories']}")
```

## Step 5: Moderate Images

Azure Content Safety also analyzes images for harmful content.

```python
from azure.ai.contentsafety.models import AnalyzeImageOptions, ImageData
import base64

def moderate_image(image_path):
    """
    Analyze an image for harmful content.
    Accepts local file paths - the image is sent as base64.
    """
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    # Encode image as base64
    image_base64 = base64.b64encode(image_bytes).decode("utf-8")

    request = AnalyzeImageOptions(
        image=ImageData(content=image_base64)
    )

    response = client.analyze_image(request)

    result = {"categories": {}}
    for category_result in response.categories_analysis:
        result["categories"][category_result.category] = {
            "severity": category_result.severity
        }

    return result


# Moderate an uploaded image
image_result = moderate_image("user_upload.jpg")
print("Image moderation results:")
for category, info in image_result["categories"].items():
    print(f"  {category}: severity {info['severity']}")
```

## Step 6: Custom Blocklists

Sometimes you need to block specific terms that are not inherently harmful but are inappropriate for your context (competitor names, internal jargon used inappropriately, etc.). Custom blocklists handle this.

```python
from azure.ai.contentsafety.models import (
    TextBlocklist,
    AddOrUpdateTextBlocklistItemsOptions,
    TextBlocklistItem
)

def create_blocklist(blocklist_name, description):
    """Create a custom blocklist for domain-specific terms."""
    blocklist = TextBlocklist(
        blocklist_name=blocklist_name,
        description=description
    )
    client.create_or_update_text_blocklist(
        blocklist_name=blocklist_name,
        options=blocklist
    )
    print(f"Blocklist '{blocklist_name}' created")

def add_terms_to_blocklist(blocklist_name, terms):
    """Add terms to an existing blocklist."""
    items = [TextBlocklistItem(text=term) for term in terms]
    options = AddOrUpdateTextBlocklistItemsOptions(blocklist_items=items)
    client.add_or_update_blocklist_items(blocklist_name, options=options)
    print(f"Added {len(terms)} terms to '{blocklist_name}'")


# Create and populate a blocklist
create_blocklist("competitor-names", "Block mentions of competitor products")
add_terms_to_blocklist("competitor-names", [
    "CompetitorProduct",
    "RivalService",
    "OtherBrand"
])
```

Then reference the blocklist in your analysis:

```python
def moderate_with_blocklist(text, blocklist_names):
    """
    Moderate text using both AI analysis and custom blocklists.
    """
    request = AnalyzeTextOptions(
        text=text,
        blocklist_names=blocklist_names,
        halt_on_blocklist_hit=False  # Continue analysis even if blocklist matches
    )

    response = client.analyze_text(request)

    # Check blocklist matches
    blocklist_matches = response.blocklists_match or []
    if blocklist_matches:
        print(f"Blocklist matches found:")
        for match in blocklist_matches:
            print(f"  Term: '{match.blocklist_item_text}' "
                  f"from blocklist '{match.blocklist_name}'")

    return response
```

## Integrating with Your Application

Here is how moderation fits into a typical API endpoint:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)
moderator = ContentModerator(endpoint, key)

@app.route("/api/comments", methods=["POST"])
def post_comment():
    """
    API endpoint that moderates comments before publishing.
    Demonstrates the moderation flow in a web application.
    """
    data = request.json
    user_id = data.get("user_id")
    comment_text = data.get("text", "")

    # Run moderation
    moderation_result = moderator.moderate(comment_text)

    if moderation_result["decision"] == "block":
        return jsonify({
            "status": "rejected",
            "message": "Your comment could not be posted because it "
                       "violates our community guidelines."
        }), 400

    elif moderation_result["decision"] == "flag":
        # Save the comment but mark it for review
        save_comment(user_id, comment_text, status="pending_review")
        return jsonify({
            "status": "pending",
            "message": "Your comment has been submitted and is pending review."
        }), 202

    else:
        # Publish immediately
        save_comment(user_id, comment_text, status="published")
        return jsonify({
            "status": "published",
            "message": "Your comment has been posted."
        }), 201
```

## Monitoring and Analytics

Track your moderation metrics to understand patterns and tune your thresholds.

Key metrics to monitor:

- Block rate (percentage of content blocked)
- Flag rate (percentage flagged for review)
- False positive rate (content blocked or flagged that should have been allowed)
- Category distribution (which harm categories are most common)
- User-level patterns (are certain users repeatedly submitting harmful content)

A consistently high block rate might indicate that your thresholds are too aggressive, while a low block rate combined with user reports might suggest they are too lenient.

## Wrapping Up

Azure Content Safety gives you a production-ready moderation pipeline that goes beyond simple keyword matching. The severity scoring system lets you fine-tune the balance between safety and user freedom, while custom blocklists handle domain-specific needs. Build moderation into your content pipeline from the start rather than bolting it on later. Start with moderate thresholds, monitor the results, and adjust based on the false positive and false negative rates you see in practice. The combination of automated AI moderation and human review for edge cases gives you the best balance of safety and scalability.
