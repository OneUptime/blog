# How to Implement Tokenization Pipelines with Cloud DLP for PII Protection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud DLP, Tokenization, PII Protection, Data Security

Description: Learn how to build tokenization pipelines using Cloud DLP to protect personally identifiable information while preserving data utility for analytics and processing.

---

Tokenization replaces sensitive data with non-sensitive tokens that can maintain the same format and referential integrity when you use format-preserving encryption. A credit card number becomes a random-looking string of the same length. A numeric identifier can become a different same-length number that maps back to the original only if you have the right key. Other transformations, like deterministic encryption or cryptographic hashing, do not preserve the original format in the same way. The original data stays protected while downstream systems can still process the tokenized version.

Cloud DLP makes this straightforward to implement at scale. This guide walks through building a complete tokenization pipeline that protects PII across BigQuery and streaming data.

## Tokenization vs. Encryption vs. Hashing

Before diving into implementation, it helps to understand when tokenization is the right choice. Encryption scrambles data into an unreadable format that often changes the data length and format. Hashing produces a fixed-length output and is one-way - you cannot recover the original. Format-preserving tokenization preserves the format and length while being reversible with the right key.

Tokenization is ideal when downstream systems expect data in a specific format, when you need to preserve referential integrity across tables, or when you need to be able to re-identify records for legitimate purposes.

## Step 1: Set Up the Crypto Key for Tokenization

Cloud DLP's tokenization (called "crypto-based tokenization" in GCP terminology) needs an encryption key. Use Cloud KMS to manage this key securely.

```bash
# Create a key ring for DLP tokenization

gcloud kms keyrings create dlp-tokenization \
  --location=global

# Create a symmetric encryption key
gcloud kms keys create pii-token-key \
  --keyring=dlp-tokenization \
  --location=global \
  --purpose=encryption \
  --rotation-period=90d

# Grant the DLP service account access to the key
DLP_SA="service-PROJECT_NUMBER@dlp-api.iam.gserviceaccount.com"
gcloud kms keys add-iam-policy-binding pii-token-key \
  --keyring=dlp-tokenization \
  --location=global \
  --member="serviceAccount:$DLP_SA" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"
```

## Step 2: Create a Wrapped Key

Cloud DLP uses a wrapped key approach where your KMS key wraps (encrypts) a separate AES key that does the actual tokenization. This adds a layer of key management security.

```python
import base64
import os
from google.cloud import kms

def create_wrapped_key(project_id, location, keyring, key_name):
    """Create and wrap an AES key using Cloud KMS."""
    kms_client = kms.KeyManagementServiceClient()

    # Generate a random 32-byte AES-256 key
    aes_key = os.urandom(32)

    # Wrap (encrypt) it using the KMS key
    key_path = kms_client.crypto_key_path(
        project_id, location, keyring, key_name
    )
    response = kms_client.encrypt(
        request={
            "name": key_path,
            "plaintext": aes_key,
        }
    )

    # The wrapped key is what you provide to DLP
    wrapped_key = base64.b64encode(response.ciphertext).decode()
    print(f"Wrapped key (base64): {wrapped_key}")
    return wrapped_key

wrapped_key = create_wrapped_key(
    "my-project", "global", "dlp-tokenization", "pii-token-key"
)
```

## Step 3: Create a Deidentification Template

The deidentification template defines how each type of PII gets tokenized. Different fields can use different tokenization methods.

```python
import base64
from google.cloud import dlp_v2

def create_deidentify_template(project_id, wrapped_key, kms_key_name):
    """Create a DLP deidentification template with tokenization rules."""
    client = dlp_v2.DlpServiceClient()

    # Crypto key configuration pointing to our wrapped key
    crypto_key = {
        "kms_wrapped": {
            "wrapped_key": base64.b64decode(wrapped_key),
            "crypto_key_name": kms_key_name,
        }
    }

    deidentify_config = {
        "record_transformations": {
            "field_transformations": [
                {
                    # Format-preserving encryption for credit card numbers
                    # Output looks like a credit card number but is tokenized
                    "fields": [{"name": "credit_card"}],
                    "primitive_transformation": {
                        "crypto_replace_ffx_fpe_config": {
                            "crypto_key": crypto_key,
                            "common_alphabet": "NUMERIC",
                            # Surrogates allow re-identification later
                            "surrogate_info_type": {
                                "name": "CREDIT_CARD_TOKEN"
                            },
                        }
                    },
                },
                {
                    # Deterministic encryption for email addresses
                    # Same email always produces the same token
                    "fields": [{"name": "email"}],
                    "primitive_transformation": {
                        "crypto_deterministic_config": {
                            "crypto_key": crypto_key,
                            "surrogate_info_type": {
                                "name": "EMAIL_TOKEN"
                            },
                        }
                    },
                },
                {
                    # Hash-based tokenization for SSNs
                    # One-way - cannot be reversed
                    "fields": [{"name": "ssn"}],
                    "primitive_transformation": {
                        "crypto_hash_config": {
                            "crypto_key": crypto_key,
                        }
                    },
                },
                {
                    # Replace names with a generic placeholder
                    "fields": [{"name": "full_name"}],
                    "primitive_transformation": {
                        "replace_config": {
                            "new_value": {"string_value": "[REDACTED]"}
                        }
                    },
                },
            ]
        }
    }

    template = {
        "display_name": "PII Tokenization Template",
        "description": "Tokenizes PII fields using format-preserving and deterministic encryption",
        "deidentify_config": deidentify_config,
    }

    response = client.create_deidentify_template(
        parent=f"projects/{project_id}/locations/global",
        deidentify_template=template,
        template_id="pii-tokenization",
    )
    print(f"Created template: {response.name}")
    return response.name
```

## Step 4: Build the BigQuery Tokenization Pipeline

For data already in BigQuery, create a pipeline that reads from the source table, tokenizes PII columns with the DLP content API, and writes to a destination table. The destination table should already exist with compatible string columns for the transformed values.

```python
from google.cloud import bigquery
from google.cloud import dlp_v2

def tokenize_bigquery_table(
    project_id, source_dataset, source_table,
    dest_dataset, dest_table
):
    """Tokenize PII in a BigQuery table using the DLP content API."""
    bq_client = bigquery.Client(project=project_id)
    dlp_client = dlp_v2.DlpServiceClient()

    source = f"`{project_id}.{source_dataset}.{source_table}`"
    row_iter = bq_client.query(f"SELECT * FROM {source}").result()
    headers = [{"name": field.name} for field in row_iter.schema]
    destination = f"{project_id}.{dest_dataset}.{dest_table}"

    tokenized_rows = []
    for row in row_iter:
        values = [
            {"string_value": "" if row[field.name] is None else str(row[field.name])}
            for field in row_iter.schema
        ]
        table = {"headers": headers, "rows": [{"values": values}]}

        response = dlp_client.deidentify_content(
            request={
                "parent": f"projects/{project_id}/locations/global",
                "deidentify_template_name": f"projects/{project_id}/locations/global/deidentifyTemplates/pii-tokenization",
                "item": {"table": table},
            }
        )

        result_row = response.item.table.rows[0]
        tokenized_rows.append({
            header.name: result_row.values[i].string_value
            for i, header in enumerate(response.item.table.headers)
        })

    if tokenized_rows:
        errors = bq_client.insert_rows_json(destination, tokenized_rows)
        if errors:
            raise RuntimeError(f"BigQuery insert failed: {errors}")

    print(f"Tokenized {len(tokenized_rows)} rows into {destination}")
    return len(tokenized_rows)
```

## Step 5: Stream Tokenization with Dataflow

For real-time data, use Dataflow to tokenize records as they flow through your pipeline.

```python
import apache_beam as beam
from google.cloud import dlp_v2
import json

class TokenizePII(beam.DoFn):
    """Beam DoFn that tokenizes PII fields using Cloud DLP."""

    def __init__(self, project_id, template_name):
        self.project_id = project_id
        self.template_name = template_name
        self.client = None

    def setup(self):
        # Initialize the DLP client once per worker
        self.client = dlp_v2.DlpServiceClient()

    def process(self, record):
        """Tokenize a single record."""
        # Convert the record to DLP content item format
        headers = [{"name": key} for key in record.keys()]
        values = [{"string_value": str(v)} for v in record.values()]

        table = {
            "headers": headers,
            "rows": [{"values": values}],
        }

        # Call DLP to deidentify the record
        response = self.client.deidentify_content(
            request={
                "parent": f"projects/{self.project_id}/locations/global",
                "deidentify_template_name": self.template_name,
                "item": {"table": table},
            }
        )

        # Convert the response back to a dictionary
        result_row = response.item.table.rows[0]
        tokenized = {}
        for i, header in enumerate(response.item.table.headers):
            tokenized[header.name] = result_row.values[i].string_value

        yield tokenized

def run_streaming_tokenization():
    """Run a streaming Dataflow pipeline with tokenization."""
    options = beam.options.pipeline_options.PipelineOptions([
        '--project=my-project',
        '--runner=DataflowRunner',
        '--streaming',
        '--region=us-central1',
    ])

    with beam.Pipeline(options=options) as p:
        (
            p
            | 'ReadFromPubSub' >> beam.io.ReadFromPubSub(
                topic='projects/my-project/topics/raw-events'
            )
            | 'ParseJSON' >> beam.Map(json.loads)
            | 'TokenizePII' >> beam.ParDo(TokenizePII(
                project_id='my-project',
                template_name='projects/my-project/locations/global/deidentifyTemplates/pii-tokenization'
            ))
            | 'WriteToBigQuery' >> beam.io.WriteToBigQuery(
                'my-project:tokenized_data.events',
                write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
            )
        )
```

## Step 6: Re-identification When Needed

When authorized users need to see the original data, use the re-identification API with the same template and key for reversible transformations. Hashed and redacted fields cannot be restored.

```python
from google.cloud import dlp_v2

def reidentify_record(project_id, tokenized_record, template_name):
    """Re-identify a previously tokenized record."""
    client = dlp_v2.DlpServiceClient()

    headers = [{"name": key} for key in tokenized_record.keys()]
    values = [{"string_value": str(v)} for v in tokenized_record.values()]

    table = {
        "headers": headers,
        "rows": [{"values": values}],
    }

    # Re-identify using the same template
    response = client.reidentify_content(
        request={
            "parent": f"projects/{project_id}/locations/global",
            "reidentify_template_name": template_name,
            "item": {"table": table},
        }
    )

    # Extract the original values
    result_row = response.item.table.rows[0]
    original = {}
    for i, header in enumerate(response.item.table.headers):
        original[header.name] = result_row.values[i].string_value

    return original
```

Building a tokenization pipeline with Cloud DLP gives you a scalable, managed approach to PII protection. The format-preserving encryption keeps your data useful for analytics while the crypto key management through KMS ensures only authorized processes can reverse the tokenization. Start with batch tokenization for existing data, then add streaming tokenization for new data flows.
