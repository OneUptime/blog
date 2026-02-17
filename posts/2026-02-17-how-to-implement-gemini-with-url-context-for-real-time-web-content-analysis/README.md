# How to Implement Gemini with URL Context for Real-Time Web Content Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Gemini, Vertex AI, URL Context, Web Analysis

Description: Learn how to use Gemini with URL context on Vertex AI to analyze web pages in real time for content monitoring, competitive analysis, and data extraction.

---

Gemini's URL context feature lets you point the model at a web page and have it analyze the content directly. Instead of scraping a page, extracting text, and then sending that text to the model, you just provide the URL. The model fetches and processes the page content, including text, images, and layout structure.

This is incredibly useful for real-time content monitoring, competitive analysis, and automated web data extraction. I have been using it to build monitoring tools that check web pages for changes and extract structured data from websites. Let me show you how to set it up.

## How URL Context Works

When you provide a URL to Gemini, the model fetches the web page content at inference time. This means you always get analysis of the current version of the page, not a cached or stale copy. The model can understand the page structure, read text content, analyze images on the page, and interpret the overall layout.

## Basic URL Analysis

Here is the simplest way to analyze a web page with Gemini:

```python
import vertexai
from vertexai.generative_models import GenerativeModel, Part

# Initialize Vertex AI
vertexai.init(project="your-project-id", location="us-central1")

model = GenerativeModel("gemini-2.0-flash")

# Analyze a web page by providing its URL
response = model.generate_content([
    Part.from_uri(
        uri="https://cloud.google.com/vertex-ai/docs/generative-ai/learn/overview",
        mime_type="text/html"
    ),
    "Summarize the main topics covered on this documentation page. "
    "List the key sections and what each one explains."
])

print(response.text)
```

## Extracting Structured Data from Web Pages

One of the most practical uses is pulling structured data out of web pages automatically.

This code extracts product information from a web page:

```python
from vertexai.generative_models import GenerationConfig

def extract_page_data(url, schema):
    """Extract structured data from a web page."""
    config = GenerationConfig(
        response_mime_type="application/json",
        response_schema=schema,
        temperature=0.1
    )

    response = model.generate_content(
        [
            Part.from_uri(uri=url, mime_type="text/html"),
            "Extract the requested information from this web page."
        ],
        generation_config=config
    )

    import json
    return json.loads(response.text)

# Define what data to extract
product_schema = {
    "type": "object",
    "properties": {
        "page_title": {"type": "string"},
        "main_heading": {"type": "string"},
        "key_features": {
            "type": "array",
            "items": {"type": "string"}
        },
        "pricing_mentioned": {"type": "boolean"},
        "call_to_action": {"type": "string"},
        "last_updated": {"type": "string"}
    }
}

data = extract_page_data(
    "https://cloud.google.com/vertex-ai",
    product_schema
)

print(f"Title: {data.get('page_title')}")
print(f"Features: {data.get('key_features')}")
```

## Building a Web Content Monitor

Monitor web pages for changes and get notified when content changes significantly.

```python
import hashlib
from datetime import datetime

class WebContentMonitor:
    """Monitor web pages for content changes using Gemini."""

    def __init__(self):
        self.model = GenerativeModel("gemini-2.0-flash")
        self.baselines = {}

    def capture_baseline(self, url, label=None):
        """Capture the current state of a web page as a baseline."""
        analysis = self._analyze_page(url)

        key = label or url
        self.baselines[key] = {
            "url": url,
            "analysis": analysis,
            "captured_at": datetime.utcnow().isoformat(),
            "content_hash": hashlib.md5(analysis.encode()).hexdigest()
        }

        return analysis

    def check_for_changes(self, url, label=None):
        """Check if a page has changed since the baseline."""
        key = label or url

        if key not in self.baselines:
            return {"error": "No baseline captured for this URL"}

        baseline = self.baselines[key]

        # Get current analysis
        current = self._analyze_page(url)
        current_hash = hashlib.md5(current.encode()).hexdigest()

        if current_hash == baseline["content_hash"]:
            return {"changed": False, "message": "No significant changes detected"}

        # Ask Gemini to compare the baseline and current analyses
        comparison = self._compare_analyses(
            baseline["analysis"],
            current,
            url
        )

        return {
            "changed": True,
            "baseline_date": baseline["captured_at"],
            "comparison": comparison
        }

    def _analyze_page(self, url):
        """Analyze a web page and return a text summary."""
        response = self.model.generate_content([
            Part.from_uri(uri=url, mime_type="text/html"),
            "Provide a detailed analysis of this page including: "
            "main content, navigation structure, key messages, "
            "pricing information if any, and notable features or changes."
        ])
        return response.text

    def _compare_analyses(self, baseline, current, url):
        """Compare two analyses to identify changes."""
        response = self.model.generate_content(
            f"Compare these two analyses of the same web page ({url}).\n\n"
            f"BASELINE:\n{baseline}\n\n"
            f"CURRENT:\n{current}\n\n"
            "What has changed? Categorize changes as: "
            "major (pricing, features, structure), "
            "minor (text updates, styling), "
            "or cosmetic (typos, small wording changes)."
        )
        return response.text

# Usage
monitor = WebContentMonitor()

# Capture baseline
monitor.capture_baseline(
    "https://cloud.google.com/vertex-ai/pricing",
    label="vertex-ai-pricing"
)

# Later, check for changes
result = monitor.check_for_changes(
    "https://cloud.google.com/vertex-ai/pricing",
    label="vertex-ai-pricing"
)

if result.get("changed"):
    print(f"Changes detected:\n{result['comparison']}")
else:
    print("No changes since baseline.")
```

## Competitive Analysis Tool

Build a tool that compares your web presence against competitors.

```python
def competitive_analysis(your_url, competitor_urls):
    """Compare your web page against competitors."""
    # Analyze all pages
    parts = []

    parts.append(f"YOUR PAGE:")
    parts.append(Part.from_uri(uri=your_url, mime_type="text/html"))

    for i, comp_url in enumerate(competitor_urls, 1):
        parts.append(f"\nCOMPETITOR {i}:")
        parts.append(Part.from_uri(uri=comp_url, mime_type="text/html"))

    parts.append(
        "\nCompare these web pages and provide a competitive analysis:\n"
        "1. Feature comparison - what does each page offer?\n"
        "2. Messaging comparison - how does each position their product?\n"
        "3. Pricing comparison - if pricing is shown\n"
        "4. User experience assessment\n"
        "5. Strengths and weaknesses of each\n"
        "6. Recommendations for improving the first page"
    )

    response = model.generate_content(parts)
    return response.text

# Compare your product page against competitors
analysis = competitive_analysis(
    your_url="https://your-product.com/features",
    competitor_urls=[
        "https://competitor-a.com/features",
        "https://competitor-b.com/features"
    ]
)
print(analysis)
```

## Monitoring Documentation for Updates

Track documentation pages for updates that might affect your integrations.

```python
class DocumentationTracker:
    """Track external documentation for changes that affect your integrations."""

    def __init__(self):
        self.model = GenerativeModel(
            "gemini-2.0-flash",
            system_instruction=(
                "You are a technical documentation analyst. Focus on "
                "API changes, deprecations, new features, and breaking changes."
            )
        )
        self.tracked_pages = {}

    def track(self, url, focus_areas=None):
        """Add a documentation page to track."""
        self.tracked_pages[url] = {
            "focus_areas": focus_areas or ["API changes", "deprecations"],
            "last_check": None,
            "last_summary": None
        }

    def check_all(self):
        """Check all tracked pages for relevant updates."""
        results = []

        for url, config in self.tracked_pages.items():
            focus = ", ".join(config["focus_areas"])

            response = self.model.generate_content([
                Part.from_uri(uri=url, mime_type="text/html"),
                f"Analyze this documentation page focusing on: {focus}\n\n"
                "Report any:\n"
                "- API changes or new endpoints\n"
                "- Deprecated features or methods\n"
                "- Breaking changes\n"
                "- New features or capabilities\n"
                "- Updated code examples\n\n"
                "If nothing noteworthy, just say 'No significant changes.'"
            ])

            results.append({
                "url": url,
                "analysis": response.text,
                "checked_at": datetime.utcnow().isoformat()
            })

            config["last_check"] = datetime.utcnow().isoformat()
            config["last_summary"] = response.text

        return results

# Track important documentation
tracker = DocumentationTracker()
tracker.track(
    "https://cloud.google.com/vertex-ai/docs/reference/rest",
    focus_areas=["API changes", "new endpoints", "deprecations"]
)
tracker.track(
    "https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini",
    focus_areas=["model versions", "parameter changes", "new features"]
)

updates = tracker.check_all()
for update in updates:
    print(f"\n{update['url']}:")
    print(update["analysis"][:300])
```

## Bulk Page Analysis

Process multiple URLs in sequence for large-scale web analysis.

```python
def bulk_analyze_urls(urls, analysis_prompt, max_concurrent=5):
    """Analyze multiple URLs with rate limiting."""
    import time

    results = []
    for i, url in enumerate(urls):
        try:
            response = model.generate_content([
                Part.from_uri(uri=url, mime_type="text/html"),
                analysis_prompt
            ])

            results.append({
                "url": url,
                "analysis": response.text,
                "status": "success"
            })

        except Exception as e:
            results.append({
                "url": url,
                "error": str(e),
                "status": "failed"
            })

        # Rate limiting
        if (i + 1) % max_concurrent == 0:
            time.sleep(2)

        print(f"Processed {i+1}/{len(urls)}: {url[:60]}...")

    return results

# Analyze a list of documentation pages
urls = [
    "https://cloud.google.com/vertex-ai/docs/generative-ai/learn/overview",
    "https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini",
]

results = bulk_analyze_urls(
    urls,
    "Summarize the key topics and list any code examples shown on this page."
)
```

## Error Handling for URL Access

Not all URLs will be accessible. Handle timeouts, blocked requests, and invalid pages.

```python
def safe_url_analysis(url, prompt, timeout_seconds=30):
    """Analyze a URL with comprehensive error handling."""
    try:
        response = model.generate_content([
            Part.from_uri(uri=url, mime_type="text/html"),
            prompt
        ])

        if not response.candidates:
            return {"status": "blocked", "message": "Content was blocked by safety filters"}

        return {"status": "success", "analysis": response.text}

    except Exception as e:
        error_msg = str(e)
        if "404" in error_msg:
            return {"status": "not_found", "message": f"Page not found: {url}"}
        elif "403" in error_msg:
            return {"status": "forbidden", "message": f"Access denied: {url}"}
        elif "timeout" in error_msg.lower():
            return {"status": "timeout", "message": f"Request timed out: {url}"}
        else:
            return {"status": "error", "message": error_msg}
```

## Wrapping Up

Gemini's URL context capability simplifies real-time web content analysis. You can monitor pages for changes, extract structured data, run competitive analysis, and track documentation updates - all without building custom scrapers. The model handles page rendering and content extraction, so you focus on what to analyze rather than how to get the data. Monitor your web analysis pipelines with tools like OneUptime to track success rates and catch when monitored pages become unavailable.
