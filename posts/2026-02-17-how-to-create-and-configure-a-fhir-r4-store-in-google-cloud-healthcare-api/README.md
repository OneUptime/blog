# How to Create and Configure a FHIR R4 Store in Google Cloud Healthcare API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Healthcare API, FHIR, Health Data, Cloud Healthcare

Description: Create and configure a FHIR R4 store in Google Cloud Healthcare API for storing, searching, and managing clinical healthcare data.

---

FHIR (Fast Healthcare Interoperability Resources) is the modern standard for exchanging healthcare data electronically. If you are building a health-tech application, a patient portal, or any system that handles clinical data, you need a FHIR-compliant data store. Google Cloud Healthcare API provides a fully managed FHIR server that supports FHIR R4 (a widely adopted stable version), handles data validation, supports SMART on FHIR access patterns, and scales automatically.

In this guide, I will walk through creating a FHIR R4 store, configuring it for production use, and performing basic CRUD operations on FHIR resources.

## What the Healthcare API Provides

The Healthcare API is not just a database - it is a complete FHIR server that:

- Validates resources against FHIR R4 rules and configured profiles
- Supports FHIR search parameters out of the box
- Handles references between resources
- Provides audit logging for HIPAA compliance
- Supports Pub/Sub notifications for data changes
- Integrates with BigQuery for analytics

## Prerequisites

- GCP project with the Healthcare API enabled
- Appropriate IAM permissions (Healthcare FHIR Store Admin)
- Python 3.8+ with the Google API Python client library

```bash
# Enable the Healthcare API

gcloud services enable healthcare.googleapis.com

# Install the client libraries
pip install google-api-python-client google-auth requests
```

## Step 1: Create a Dataset and FHIR Store

Healthcare API organizes resources in a hierarchy: Project > Location > Dataset > FHIR Store.

```bash
# Create a dataset - this is the container for FHIR stores
gcloud healthcare datasets create my-health-dataset \
  --location=us-central1

# Create a FHIR R4 store within the dataset
gcloud healthcare fhir-stores create my-fhir-store \
  --dataset=my-health-dataset \
  --location=us-central1 \
  --version=R4 \
  --enable-update-create
```

For more configuration options, use the Python client:

```python
# create_fhir_store.py - Creates and configures a FHIR R4 store

from googleapiclient import discovery

def create_fhir_store(project_id, location, dataset_id, fhir_store_id):
    """Creates a FHIR R4 store with production-ready configuration.

    Args:
        project_id: GCP project ID
        location: API location (e.g., us-central1)
        dataset_id: The dataset to create the store in
        fhir_store_id: Unique ID for the FHIR store
    """

    client = discovery.build("healthcare", "v1")
    parent = f"projects/{project_id}/locations/{location}/datasets/{dataset_id}"

    fhir_store = {
        # Set the FHIR version to R4
        "version": "R4",
        # Enable update-as-create (allows PUT to create resources if they do not exist)
        "enableUpdateCreate": True,
        # Disable referential integrity if you need to import data
        # that has references to resources not yet created
        # Enable it for production to enforce data consistency
        "disableReferentialIntegrity": False,
        # Disable resource versioning if you do not need version history
        "disableResourceVersioning": False,
        # Configure Pub/Sub notifications for data changes
        "notificationConfigs": [
            {
                "pubsubTopic": f"projects/{project_id}/topics/fhir-notifications",
                "sendFullResource": False,  # Send only resource ID, not full content
            }
        ],
        # Set default search parameters handling
        "defaultSearchHandlingStrict": True,
    }

    request = (
        client.projects()
        .locations()
        .datasets()
        .fhirStores()
        .create(parent=parent, body=fhir_store, fhirStoreId=fhir_store_id)
    )

    result = request.execute()
    print(f"FHIR store created: {result['name']}")
    return result

# Create the FHIR store
store = create_fhir_store(
    project_id="your-project",
    location="us-central1",
    dataset_id="my-health-dataset",
    fhir_store_id="my-fhir-store",
)
```

## Step 2: Configure IAM Permissions

Set up appropriate access controls:

```bash
# Grant the FHIR resource reader role to your application service account
gcloud healthcare fhir-stores add-iam-policy-binding my-fhir-store \
  --dataset=my-health-dataset \
  --location=us-central1 \
  --member="serviceAccount:your-app-sa@your-project.iam.gserviceaccount.com" \
  --role="roles/healthcare.fhirResourceReader"

# Grant FHIR resource editor for write access
gcloud healthcare fhir-stores add-iam-policy-binding my-fhir-store \
  --dataset=my-health-dataset \
  --location=us-central1 \
  --member="serviceAccount:your-app-sa@your-project.iam.gserviceaccount.com" \
  --role="roles/healthcare.fhirResourceEditor"
```

## Step 3: Create FHIR Resources

Now you can create, read, update, and delete FHIR resources. Here is how to work with common resource types:

```python
# fhir_operations.py - CRUD operations on FHIR resources

from google.auth.transport.requests import AuthorizedSession
from googleapiclient import discovery
from google.oauth2 import service_account

# Initialize the Healthcare API client
def get_fhir_client():
    """Creates an authenticated Healthcare API client."""
    credentials = service_account.Credentials.from_service_account_file(
        "service-account-key.json",
        scopes=["https://www.googleapis.com/auth/cloud-healthcare"],
    )
    return discovery.build("healthcare", "v1", credentials=credentials)

def get_authorized_session():
    """Creates an authenticated HTTP session for FHIR search requests."""
    credentials = service_account.Credentials.from_service_account_file(
        "service-account-key.json",
        scopes=["https://www.googleapis.com/auth/cloud-healthcare"],
    )
    return AuthorizedSession(credentials)

PROJECT_ID = "your-project"
LOCATION = "us-central1"
DATASET_ID = "my-health-dataset"
FHIR_STORE_ID = "my-fhir-store"

FHIR_BASE = (
    f"projects/{PROJECT_ID}/locations/{LOCATION}/"
    f"datasets/{DATASET_ID}/fhirStores/{FHIR_STORE_ID}"
)
FHIR_ENDPOINT = f"https://healthcare.googleapis.com/v1/{FHIR_BASE}/fhir"

def create_patient():
    """Creates a Patient resource in the FHIR store.
    This is typically the first resource you create, as other
    resources reference the patient."""

    client = get_fhir_client()

    patient = {
        "resourceType": "Patient",
        "name": [
            {
                "use": "official",
                "family": "Smith",
                "given": ["John", "Jacob"],
            }
        ],
        "gender": "male",
        "birthDate": "1985-03-15",
        "address": [
            {
                "use": "home",
                "line": ["123 Main St"],
                "city": "Springfield",
                "state": "IL",
                "postalCode": "62701",
            }
        ],
        "telecom": [
            {
                "system": "phone",
                "value": "555-0100",
                "use": "mobile",
            },
            {
                "system": "email",
                "value": "john.smith@example.com",
            },
        ],
        "identifier": [
            {
                "system": "http://hospital.example.com/mrn",
                "value": "MRN-12345",
            }
        ],
    }

    request = (
        client.projects()
        .locations()
        .datasets()
        .fhirStores()
        .fhir()
        .create(parent=FHIR_BASE, type="Patient", body=patient)
    )
    request.headers["content-type"] = "application/fhir+json;charset=utf-8"
    result = request.execute()

    print(f"Patient created: {result['id']}")
    return result

def create_observation(patient_id):
    """Creates an Observation resource linked to a patient.
    Observations record clinical measurements like vital signs."""

    client = get_fhir_client()

    observation = {
        "resourceType": "Observation",
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                        "code": "vital-signs",
                        "display": "Vital Signs",
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "8867-4",
                    "display": "Heart rate",
                }
            ],
            "text": "Heart rate",
        },
        "subject": {
            "reference": f"Patient/{patient_id}",
        },
        "effectiveDateTime": "2026-02-17T10:30:00Z",
        "valueQuantity": {
            "value": 72,
            "unit": "beats/minute",
            "system": "http://unitsofmeasure.org",
            "code": "/min",
        },
    }

    request = (
        client.projects()
        .locations()
        .datasets()
        .fhirStores()
        .fhir()
        .create(parent=FHIR_BASE, type="Observation", body=observation)
    )
    request.headers["content-type"] = "application/fhir+json;charset=utf-8"
    result = request.execute()

    print(f"Observation created: {result['id']}")
    return result
```

## Step 4: Search FHIR Resources

The FHIR search API supports a rich query syntax:

```python
def search_patients(family_name=None, given_name=None):
    """Searches for patients by name using FHIR search parameters."""

    session = get_authorized_session()

    # Build search parameters
    params = {}
    if family_name:
        params["family"] = family_name
    if given_name:
        params["given"] = given_name

    response = session.get(f"{FHIR_ENDPOINT}/Patient", params=params)
    response.raise_for_status()
    result = response.json()

    bundle = result
    entries = bundle.get("entry", [])
    print(f"Found {len(entries)} patients")

    for entry in entries:
        resource = entry["resource"]
        name = resource.get("name", [{}])[0]
        print(f"  {name.get('family', '')}, {' '.join(name.get('given', []))}"
              f" (ID: {resource['id']})")

    return bundle

def search_observations_for_patient(patient_id, code=None):
    """Searches for observations linked to a specific patient.
    Optionally filter by LOINC code."""

    session = get_authorized_session()

    search_params = {"subject": f"Patient/{patient_id}"}
    if code:
        search_params["code"] = f"http://loinc.org|{code}"

    response = session.get(f"{FHIR_ENDPOINT}/Observation", params=search_params)
    response.raise_for_status()
    result = response.json()

    entries = result.get("entry", [])
    print(f"Found {len(entries)} observations for patient {patient_id}")

    for entry in entries:
        resource = entry["resource"]
        code_text = resource.get("code", {}).get("text", "Unknown")
        value = resource.get("valueQuantity", {})
        print(f"  {code_text}: {value.get('value', 'N/A')} {value.get('unit', '')}")

    return result
```

## Step 5: Export to BigQuery for Analytics

Export FHIR data to BigQuery for analytical queries:

```bash
# Export the FHIR store to BigQuery
gcloud healthcare fhir-stores export bq my-fhir-store \
  --dataset=my-health-dataset \
  --location=us-central1 \
  --bq-dataset=bq://your-project.fhir_analytics \
  --schema-type=analytics
```

Then query in BigQuery:

```sql
-- Find patients with abnormal heart rate observations
SELECT
  p.id as patient_id,
  p.name[SAFE_OFFSET(0)].family as family_name,
  o.value.quantity.value as heart_rate,
  o.effective.dateTime as measurement_date
FROM
  `your-project.fhir_analytics.Patient` p
JOIN
  `your-project.fhir_analytics.Observation` o
ON
  o.subject.patientId = p.id
WHERE
  o.code.coding[SAFE_OFFSET(0)].code = '8867-4'
  AND o.value.quantity.value > 100
ORDER BY
  o.effective.dateTime DESC
```

## Security and Compliance

For HIPAA compliance:

- Enable audit logging on the Healthcare API
- Use VPC Service Controls to restrict data access
- Encrypt data at rest (automatic) and in transit (enforced)
- Implement SMART on FHIR for user-level access control
- Set up data access logging to track who reads what

```bash
# Enable audit logging for the Healthcare API
gcloud logging sinks create healthcare-audit-log \
  bigquery.googleapis.com/projects/your-project/datasets/audit_logs \
  --log-filter='resource.type="healthcare_dataset"'
```

## Wrapping Up

The Google Cloud Healthcare API gives you a production-ready FHIR server without the operational burden of running one yourself. It handles the FHIR specification compliance, search indexing, reference validation, and audit logging that would take months to build from scratch. For health-tech startups, this means you can focus on your application logic instead of wrestling with FHIR server infrastructure. The BigQuery export feature is particularly valuable because it lets you run analytics on clinical data using standard SQL.
