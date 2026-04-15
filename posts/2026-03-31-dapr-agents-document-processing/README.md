# How to Use Dapr Agents for Document Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Document Processing, OCR, LLM

Description: Learn how to build automated document processing pipelines with Dapr Agents for extracting, transforming, and routing information from PDFs and images.

---

## Document Processing Use Cases

Dapr Agents can automate document workflows including:

- Invoice extraction and validation
- Contract analysis and key term identification
- Medical record parsing and coding
- Resume screening and data extraction
- Financial statement analysis

## Architecture

```text
Document Upload (S3, SharePoint, email)
        |
   Intake Agent (classify document type)
        |
   Extraction Agent (OCR + LLM extraction)
        |
   Validation Agent (verify extracted data)
        |
   Routing Agent (send to downstream systems)
```

## Building the Document Intake Agent

```python
import hashlib
from pathlib import Path
from dapr_agents import DurableAgent, tool, OpenAIChatClient
from dapr.clients import DaprClient
import json

@tool
def classify_document(filepath: str) -> str:
    """Classifies a document by type based on filename and content preview.

    Args:
        filepath: Path to the document file.
    """
    name = Path(filepath).name.lower()
    doc_types = {
        "invoice": ["inv", "invoice", "bill", "receipt"],
        "contract": ["contract", "agreement", "nda", "sla"],
        "resume": ["resume", "cv", "curriculum"],
    }
    for doc_type, keywords in doc_types.items():
        if any(kw in name for kw in keywords):
            return json.dumps({"type": doc_type, "confidence": "high"})
    return json.dumps({"type": "unknown", "confidence": "low"})

@tool
def register_document(filepath: str, doc_type: str) -> str:
    """Registers a document in the processing queue.

    Args:
        filepath: Path to the document.
        doc_type: Classified document type.
    """
    with open(filepath, "rb") as f:
        file_hash = hashlib.sha256(f.read()).hexdigest()

    doc_id = file_hash[:16]
    with DaprClient() as client:
        client.save_state("statestore", f"doc-{doc_id}", json.dumps({
            "id": doc_id,
            "filepath": filepath,
            "type": doc_type,
            "status": "pending"
        }))
        client.publish_event(
            pubsub_name="doc-pubsub",
            topic_name=f"{doc_type}-processing",
            data=json.dumps({"doc_id": doc_id, "filepath": filepath})
        )
    return f"Document registered: {doc_id}"

intake_agent = DurableAgent(
    name="document-intake-agent",
    instructions=[
        "You manage incoming documents. Classify each document "
        "by type (invoice, contract, resume, report), validate it is readable, "
        "and route it to the appropriate processing queue."
    ],
    tools=[classify_document, register_document],
    llm=OpenAIChatClient(model="gpt-4o"),
)
```

## Building the Invoice Extraction Agent

```python
from dapr_agents import DurableAgent, tool, OpenAIChatClient
from dapr.clients import DaprClient
import json

@tool
def extract_text_from_pdf(filepath: str) -> str:
    """Extracts text content from a PDF file.

    Args:
        filepath: Path to the PDF file.
    """
    try:
        import pdfplumber
        with pdfplumber.open(filepath) as pdf:
            text = "\n".join(page.extract_text() or "" for page in pdf.pages)
        return text[:5000]  # Limit for LLM context
    except Exception as e:
        return f"PDF extraction error: {str(e)}"

@tool
def validate_extracted_invoice(extracted_data: str) -> str:
    """Validates extracted invoice data for completeness and accuracy.

    Args:
        extracted_data: JSON string of extracted invoice fields.
    """
    data = json.loads(extracted_data)
    required_fields = ["invoice_number", "date", "vendor", "total"]
    missing = [f for f in required_fields if not data.get(f)]
    if missing:
        return json.dumps({"valid": False, "missing_fields": missing})
    return json.dumps({"valid": True, "invoice_number": data["invoice_number"]})

@tool
def save_extracted_data(doc_id: str, extracted_data: str) -> str:
    """Saves validated extracted data for downstream processing.

    Args:
        doc_id: The document identifier.
        extracted_data: JSON string of validated invoice data.
    """
    with DaprClient() as client:
        client.save_state("statestore", f"extracted-{doc_id}", extracted_data)
        client.publish_event(
            pubsub_name="doc-pubsub",
            topic_name="extracted-invoices",
            data=json.dumps({"doc_id": doc_id})
        )
    return f"Data saved and forwarded for doc {doc_id}"

invoice_agent = DurableAgent(
    name="invoice-extraction-agent",
    instructions=[
        "You extract structured data from invoices. "
        "Always extract: invoice number, date, vendor name, line items, "
        "subtotal, tax, and total amount. Return as structured JSON."
    ],
    tools=[extract_text_from_pdf, validate_extracted_invoice, save_extracted_data],
    llm=OpenAIChatClient(model="gpt-4o"),
)
```

## Subscribing to Processing Topics

```python
from fastapi import FastAPI, Body
from dapr.ext.fastapi import DaprApp
from dapr_agents import trigger_agent
import json

app = FastAPI()
dapr_app = DaprApp(app)

@dapr_app.subscribe(pubsub="doc-pubsub", topic="invoice-processing")
async def process_invoice(event_data=Body()):
    data = json.loads(event_data.get("data", "{}"))
    trigger_agent(
        agent_name="invoice-extraction-agent",
        input={
            "task": f"Extract all fields from this invoice file: {data['filepath']}. "
                    f"Document ID: {data['doc_id']}"
        },
        app_id="invoice-extraction",
    )
```

## Running Document Processing

```bash
dapr run --app-id document-intake --app-port 8080 \
  --components-path ./components -- python intake_service.py &

dapr run --app-id invoice-extraction --app-port 8081 \
  --components-path ./components -- uvicorn invoice_service:app --port 8081
```

## Summary

Dapr Agents automate document processing through a pipeline of specialized agents: intake, extraction, validation, and routing. Each agent handles one concern and communicates via Dapr pub/sub topics. The state store maintains document status throughout the pipeline. Use pdfplumber or similar libraries for text extraction, and rely on LLMs for structured field extraction from unstructured document text.
