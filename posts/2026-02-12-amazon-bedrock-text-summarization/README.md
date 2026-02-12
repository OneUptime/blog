# How to Use Amazon Bedrock for Text Summarization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Bedrock, Text Summarization, AI, NLP

Description: Learn how to build text summarization pipelines with Amazon Bedrock, including single-document, multi-document, and streaming summarization techniques.

---

Text summarization is one of the most practical applications of large language models. Whether you're condensing long reports, summarizing customer feedback, or creating executive briefs from detailed documents, Bedrock's foundation models handle this well out of the box. The trick is knowing how to structure your requests for consistent, high-quality summaries.

This guide covers everything from basic summarization to handling documents that exceed the model's context window, plus batch processing for high-volume use cases.

## Basic Summarization

The simplest approach is to pass your text directly to the model with a clear instruction. The key is being specific about what kind of summary you want.

```python
import boto3
import json

bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

def summarize_text(text, style="concise", max_length=200):
    """Summarize text using Bedrock with configurable style and length."""

    # Different prompt strategies for different summary styles
    prompts = {
        "concise": f"Summarize the following text in a brief paragraph of about {max_length} words. Focus on the key points only.\n\nText: {text}",
        "bullet": f"Summarize the following text as a bullet-point list with the most important points.\n\nText: {text}",
        "executive": f"Write an executive summary of the following text. Include key findings, implications, and recommended actions in about {max_length} words.\n\nText: {text}",
        "technical": f"Provide a technical summary of the following text. Preserve important details, numbers, and technical terms.\n\nText: {text}"
    }

    prompt = prompts.get(style, prompts["concise"])

    response = bedrock_runtime.invoke_model(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 1024,
            'temperature': 0.3,  # Lower temperature for more consistent summaries
            'messages': [
                {'role': 'user', 'content': prompt}
            ]
        })
    )

    result = json.loads(response['body'].read())
    return result['content'][0]['text']

# Example usage
article = """
Amazon Web Services announced today that Amazon Bedrock now supports
fine-tuning for additional foundation models. The update includes support
for Meta's Llama 2 models and Cohere's Command models, in addition to
the previously available Amazon Titan models. Fine-tuning allows customers
to customize these models using their own data, improving performance on
domain-specific tasks. AWS also introduced a new pricing tier for
fine-tuning that reduces costs by up to 40% for large training jobs.
The feature is available in US East (N. Virginia) and US West (Oregon)
regions, with plans to expand to additional regions in the coming months.
"""

print("Concise:", summarize_text(article, "concise"))
print("\nBullet:", summarize_text(article, "bullet"))
print("\nExecutive:", summarize_text(article, "executive"))
```

## Handling Long Documents

Foundation models have context window limits. When your document exceeds that limit, you need a chunking strategy. The most reliable approach is map-reduce summarization: summarize each chunk individually, then summarize the summaries.

```python
def chunk_text(text, chunk_size=3000, overlap=200):
    """Split text into overlapping chunks for processing."""
    words = text.split()
    chunks = []
    start = 0

    while start < len(words):
        end = start + chunk_size
        chunk = ' '.join(words[start:end])
        chunks.append(chunk)
        start = end - overlap  # Overlap to maintain context

    return chunks

def summarize_long_document(text, final_style="executive"):
    """Summarize a document that may exceed the model's context window."""
    chunks = chunk_text(text)

    if len(chunks) == 1:
        # Document fits in one chunk, summarize directly
        return summarize_text(text, final_style)

    print(f"Document split into {len(chunks)} chunks")

    # Phase 1: Summarize each chunk individually
    chunk_summaries = []
    for i, chunk in enumerate(chunks):
        print(f"Summarizing chunk {i + 1}/{len(chunks)}...")
        summary = summarize_text(chunk, "concise", max_length=150)
        chunk_summaries.append(summary)

    # Phase 2: Combine chunk summaries and create a final summary
    combined = "\n\n".join(
        f"Section {i+1}: {s}" for i, s in enumerate(chunk_summaries)
    )

    final_prompt = f"""The following are summaries of different sections of a document.
Create a unified {final_style} summary that captures the complete picture.
Do not mention that these are section summaries - write it as one cohesive summary.

{combined}"""

    response = bedrock_runtime.invoke_model(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 2048,
            'temperature': 0.3,
            'messages': [
                {'role': 'user', 'content': final_prompt}
            ]
        })
    )

    result = json.loads(response['body'].read())
    return result['content'][0]['text']
```

## Multi-Document Summarization

Sometimes you need to summarize information across multiple documents - like combining insights from several customer feedback reports or merging findings from multiple research papers.

```python
def summarize_multiple_documents(documents, focus=None):
    """Summarize key themes across multiple documents.

    Args:
        documents: List of dicts with 'title' and 'content' keys
        focus: Optional topic to focus the summary on
    """
    # Summarize each document first
    doc_summaries = []
    for doc in documents:
        summary = summarize_text(doc['content'], "concise", max_length=100)
        doc_summaries.append(f"Document: {doc['title']}\nSummary: {summary}")

    combined = "\n\n".join(doc_summaries)

    focus_instruction = ""
    if focus:
        focus_instruction = f"Focus particularly on information related to: {focus}\n"

    prompt = f"""I have summaries from {len(documents)} different documents.
{focus_instruction}
Create a unified analysis that:
1. Identifies common themes across the documents
2. Highlights key differences or contradictions
3. Provides an overall synthesis

Documents:
{combined}"""

    response = bedrock_runtime.invoke_model(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 2048,
            'temperature': 0.3,
            'messages': [{'role': 'user', 'content': prompt}]
        })
    )

    result = json.loads(response['body'].read())
    return result['content'][0]['text']

# Example usage
docs = [
    {"title": "Q1 Sales Report", "content": "Sales increased 15% in Q1..."},
    {"title": "Q1 Customer Feedback", "content": "Customer satisfaction dropped 3%..."},
    {"title": "Q1 Product Updates", "content": "Three new features shipped..."}
]

synthesis = summarize_multiple_documents(docs, focus="customer impact")
print(synthesis)
```

## Streaming Summarization

For long documents, streaming the summary as it generates provides a much better user experience.

```python
def summarize_stream(text):
    """Stream a summary as it is generated."""
    response = bedrock_runtime.invoke_model_with_response_stream(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 1024,
            'temperature': 0.3,
            'messages': [{
                'role': 'user',
                'content': f"Provide a detailed summary of this text:\n\n{text}"
            }]
        })
    )

    full_text = ""
    for event in response['body']:
        chunk = json.loads(event['chunk']['bytes'])
        if chunk['type'] == 'content_block_delta':
            text_piece = chunk['delta'].get('text', '')
            full_text += text_piece
            print(text_piece, end='', flush=True)

    print()
    return full_text
```

## Batch Summarization Pipeline

When you need to process hundreds or thousands of documents, a batch pipeline with proper error handling and rate management is essential.

```python
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

def batch_summarize(documents, max_workers=5, style="concise"):
    """Process multiple documents with controlled concurrency.

    Args:
        documents: List of dicts with 'id' and 'content' keys
        max_workers: Number of parallel workers
        style: Summary style to use
    """
    results = {}
    failed = []

    def process_one(doc):
        """Process a single document with retry logic."""
        retries = 3
        for attempt in range(retries):
            try:
                summary = summarize_text(doc['content'], style)
                return doc['id'], summary
            except Exception as e:
                if attempt < retries - 1:
                    # Exponential backoff
                    time.sleep(2 ** attempt)
                else:
                    return doc['id'], None

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(process_one, doc): doc
            for doc in documents
        }

        for future in as_completed(futures):
            doc_id, summary = future.result()
            if summary:
                results[doc_id] = summary
                print(f"Completed: {doc_id}")
            else:
                failed.append(doc_id)
                print(f"Failed: {doc_id}")

    print(f"\nProcessed: {len(results)}, Failed: {len(failed)}")
    return results, failed
```

## Quality Evaluation

After generating summaries, it's worth checking their quality programmatically. You can use the model itself to evaluate whether a summary accurately captures the original content.

```python
def evaluate_summary(original_text, summary):
    """Use the model to evaluate the quality of a summary."""
    prompt = f"""Evaluate this summary against the original text.
Rate each dimension from 1-5:
1. Accuracy: Does the summary correctly represent the original?
2. Completeness: Are all key points covered?
3. Conciseness: Is the summary free of unnecessary detail?
4. Coherence: Does the summary read well on its own?

Return your evaluation as JSON with keys: accuracy, completeness, conciseness, coherence, overall, notes

Original text:
{original_text[:2000]}

Summary:
{summary}"""

    response = bedrock_runtime.invoke_model(
        modelId='anthropic.claude-3-sonnet-20240229-v1:0',
        body=json.dumps({
            'anthropic_version': 'bedrock-2023-05-31',
            'max_tokens': 512,
            'temperature': 0.1,
            'messages': [{'role': 'user', 'content': prompt}]
        })
    )

    result = json.loads(response['body'].read())
    return result['content'][0]['text']
```

## Practical Tips

Temperature matters a lot for summarization. Keep it low - 0.1 to 0.3 - for factual summaries. Higher temperatures introduce creative rewording that can subtly change meaning.

Always specify the summary format you want. "Summarize this" is vague. "Summarize this as three bullet points focusing on financial impact" gives you consistent, useful results.

For high-volume processing, consider [Bedrock batch inference](https://oneuptime.com/blog/post/amazon-bedrock-batch-inference/view) instead of real-time API calls. It's more cost-effective and you don't have to worry about rate limits.

If you're also using Bedrock for other NLP tasks, you might find our guide on [text analysis with Amazon Comprehend](https://oneuptime.com/blog/post/amazon-comprehend-text-analysis/view) useful for pre-processing steps like language detection and entity extraction before summarization.

Text summarization with Bedrock is one of those features that delivers immediate value. You can go from raw documents to actionable summaries in minutes, and the quality is consistently good enough for business use.
