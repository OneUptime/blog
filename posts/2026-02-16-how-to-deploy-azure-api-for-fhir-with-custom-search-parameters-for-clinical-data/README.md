# How to Deploy Azure API for FHIR with Custom Search Parameters for Clinical Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure FHIR, Healthcare, Clinical Data, HL7 FHIR, Azure Health Data Services, Search Parameters, Interoperability

Description: Deploy Azure API for FHIR and configure custom search parameters to enable efficient querying of clinical data for healthcare applications.

---

FHIR (Fast Healthcare Interoperability Resources) is the modern standard for exchanging healthcare data. The FHIR service in Azure Health Data Services provides a managed, compliant FHIR server that stores and serves clinical data through standard RESTful APIs. Out of the box, it supports the search parameters defined in the FHIR specification. But real-world clinical applications often need to search on custom extensions or specific data patterns that the default parameters do not cover.

This guide walks through deploying the FHIR service in Azure Health Data Services, configuring custom search parameters, and building efficient queries for clinical workflows.

## Why Custom Search Parameters?

The FHIR specification defines a comprehensive set of search parameters for each resource type. For example, you can search patients by name, birth date, identifier, and many other fields. But healthcare organizations frequently add custom extensions to FHIR resources for:

- Organization-specific patient identifiers (medical record numbers, insurance IDs).
- Custom clinical scores (fall risk assessments, pain scales).
- Administrative metadata (care team assignments, billing codes).
- Research data (study enrollment, cohort identifiers).

Without custom search parameters, you would have to fetch all resources and filter client-side, which is impractical for large datasets.

## Step 1: Deploy the FHIR Service in Azure Health Data Services

### Using the Azure Portal

1. Create or open an Azure Health Data Services workspace in the Azure portal.
2. In the workspace, select Services > FHIR service.
3. Click Add FHIR service.
4. Configure the basics:
   - Subscription and resource group
   - FHIR service name
   - Location (choose a region close to your users)
   - FHIR version: R4 (the common production version supported by Azure Health Data Services)
5. Review authentication:
   - By default, the FHIR service uses Microsoft Entra ID and Azure RBAC for data plane access.
   - The audience is the FHIR service endpoint, such as `https://{workspace-name}-{fhir-service-name}.fhir.azurehealthcareapis.com`.
6. Configure networking:
   - Public endpoint or private endpoint based on your security requirements.
7. Click Create.

### Using Azure CLI

```bash
# Create the workspace and FHIR service using Azure CLI

# This deploys a fully managed FHIR R4 server
az healthcareapis workspace create \
    --resource-group healthcare-rg \
    --name healthcare-workspace \
    --location eastus

az healthcareapis workspace fhir-service create \
    --resource-group healthcare-rg \
    --workspace-name healthcare-workspace \
    --name my-fhir-service \
    --kind fhir-R4 \
    --location eastus \
    --authentication-configuration \
        authority="https://login.microsoftonline.com/{tenant-id}" \
        audience="https://healthcare-workspace-my-fhir-service.fhir.azurehealthcareapis.com"
```

### Configure Access

Register a Microsoft Entra application for your client:

1. Create an app registration for the FHIR client application.
2. Assign the "FHIR Data Contributor" role to the application on the FHIR resource.
3. Use the application's client ID and credentials to request tokens for the FHIR service endpoint.

## Step 2: Load Sample Clinical Data

Before configuring custom search parameters, load some test data. Here is a Patient resource with a custom extension for a medical record number:

```json
{
    "resourceType": "Patient",
    "id": "patient-001",
    "meta": {
        "profile": [
            "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"
        ]
    },
    "extension": [
        {
            "url": "http://example.org/fhir/StructureDefinition/mrn",
            "valueString": "MRN-2026-001234"
        },
        {
            "url": "http://example.org/fhir/StructureDefinition/fall-risk-score",
            "valueInteger": 7
        }
    ],
    "identifier": [
        {
            "system": "http://hospital.example.org/patient-id",
            "value": "P001234"
        }
    ],
    "name": [
        {
            "family": "Johnson",
            "given": ["Robert", "A"]
        }
    ],
    "gender": "male",
    "birthDate": "1965-03-15",
    "address": [
        {
            "city": "Seattle",
            "state": "WA",
            "postalCode": "98101"
        }
    ]
}
```

Load it using a PUT request:

```bash
# Upload the patient resource to the FHIR server
# Uses bearer token authentication
curl -X PUT \
    "https://healthcare-workspace-my-fhir-service.fhir.azurehealthcareapis.com/Patient/patient-001" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/fhir+json" \
    -d @patient.json
```

## Step 3: Create Custom Search Parameters

A custom search parameter is itself a FHIR resource of type `SearchParameter`. You POST it to the FHIR server like any other resource.

### Custom Search Parameter for Medical Record Number

```json
{
    "resourceType": "SearchParameter",
    "id": "patient-mrn",
    "url": "http://example.org/fhir/SearchParameter/patient-mrn",
    "version": "1.0.0",
    "name": "PatientMrn",
    "status": "active",
    "description": "Search patients by medical record number extension",
    "code": "mrn",
    "base": ["Patient"],
    "type": "string",
    "expression": "Patient.extension('http://example.org/fhir/StructureDefinition/mrn').value"
}
```

Upload it:

```bash
# Create the custom search parameter on the FHIR server
curl -X POST \
    "https://healthcare-workspace-my-fhir-service.fhir.azurehealthcareapis.com/SearchParameter" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/fhir+json" \
    -d @search-parameter-mrn.json
```

### Custom Search Parameter for Fall Risk Score

```json
{
    "resourceType": "SearchParameter",
    "id": "patient-fall-risk",
    "url": "http://example.org/fhir/SearchParameter/patient-fall-risk",
    "version": "1.0.0",
    "name": "PatientFallRiskScore",
    "status": "active",
    "description": "Search patients by fall risk score",
    "code": "fall-risk-score",
    "base": ["Patient"],
    "type": "number",
    "expression": "Patient.extension('http://example.org/fhir/StructureDefinition/fall-risk-score').value.ofType(integer)"
}
```

### Custom Search Parameter for Observation Components

For Observations with specific components (like blood pressure with systolic and diastolic values):

```json
{
    "resourceType": "SearchParameter",
    "id": "observation-systolic",
    "url": "http://example.org/fhir/SearchParameter/observation-systolic",
    "version": "1.0.0",
    "name": "ObservationSystolicBP",
    "status": "active",
    "description": "Search observations by systolic blood pressure value",
    "code": "systolic-bp",
    "base": ["Observation"],
    "type": "quantity",
    "expression": "Observation.component.where(code.coding.code='8480-6').value.ofType(Quantity)"
}
```

## Step 4: Reindex the FHIR Server

After creating custom search parameters, you must reindex the server so that existing resources are indexed with the new parameters.

### Trigger a Reindex Job

```bash
# Start a reindex job on the FHIR server
# This runs asynchronously and indexes all resources with the new search parameters
curl -X POST \
    "https://healthcare-workspace-my-fhir-service.fhir.azurehealthcareapis.com/$reindex" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/fhir+json" \
    -d '{
        "resourceType": "Parameters",
        "parameter": []
    }'
```

The reindex job returns a job ID. Check its status:

```bash
# Check reindex job status
curl -X GET \
    "https://healthcare-workspace-my-fhir-service.fhir.azurehealthcareapis.com/_operations/reindex/{job-id}" \
    -H "Authorization: Bearer $ACCESS_TOKEN"
```

Reindexing can take minutes to hours depending on the data volume. For large datasets, run it during off-peak hours.

## Step 5: Query Using Custom Search Parameters

Once reindexing completes, use the custom parameters in search queries.

### Search by Medical Record Number

```bash
# Find a patient by their MRN extension value
curl -X GET \
    "https://healthcare-workspace-my-fhir-service.fhir.azurehealthcareapis.com/Patient?mrn=MRN-2026-001234" \
    -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Search by Fall Risk Score

```bash
# Find patients with fall risk score greater than 5
curl -X GET \
    "https://healthcare-workspace-my-fhir-service.fhir.azurehealthcareapis.com/Patient?fall-risk-score=gt5" \
    -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Combine Custom and Standard Parameters

```bash
# Find male patients in WA with high fall risk
curl -X GET \
    "https://healthcare-workspace-my-fhir-service.fhir.azurehealthcareapis.com/Patient?gender=male&address-state=WA&fall-risk-score=gt5" \
    -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Search Observations by Systolic Blood Pressure

```bash
# Find observations with systolic BP above 140 mmHg
curl -X GET \
    "https://healthcare-workspace-my-fhir-service.fhir.azurehealthcareapis.com/Observation?systolic-bp=gt140|http://unitsofmeasure.org|mm[Hg]" \
    -H "Authorization: Bearer $ACCESS_TOKEN"
```

## Step 6: Implement in a Clinical Application

Here is a Python example of querying the FHIR server with custom search parameters:

```python
# Python client for querying the Azure Health Data Services FHIR service with custom search parameters
# Uses the requests library and Microsoft Entra authentication
import requests
from azure.identity import ClientSecretCredential

class FhirClient:
    def __init__(self, fhir_url, tenant_id, client_id, client_secret):
        self.fhir_url = fhir_url
        # Authenticate using client credentials
        self.credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret
        )

    def _get_token(self):
        """Get an access token for the FHIR API."""
        token = self.credential.get_token(f"{self.fhir_url}/.default")
        return token.token

    def search_patients_by_mrn(self, mrn):
        """Search for a patient by medical record number."""
        response = requests.get(
            f"{self.fhir_url}/Patient",
            params={"mrn": mrn},
            headers={
                "Authorization": f"Bearer {self._get_token()}",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        bundle = response.json()
        return bundle.get("entry", [])

    def find_high_risk_patients(self, min_score=5):
        """Find patients with fall risk score above a threshold."""
        response = requests.get(
            f"{self.fhir_url}/Patient",
            params={"fall-risk-score": f"gt{min_score}"},
            headers={
                "Authorization": f"Bearer {self._get_token()}",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        bundle = response.json()
        return bundle.get("entry", [])

    def get_patient_observations(self, patient_id, code=None):
        """Get observations for a patient, optionally filtered by code."""
        params = {"patient": patient_id, "_sort": "-date", "_count": 50}
        if code:
            params["code"] = code

        response = requests.get(
            f"{self.fhir_url}/Observation",
            params=params,
            headers={
                "Authorization": f"Bearer {self._get_token()}",
                "Accept": "application/fhir+json"
            }
        )
        response.raise_for_status()
        return response.json().get("entry", [])
```

## Performance Considerations

### Search Parameter Design

- Keep FHIRPath expressions simple. Complex expressions slow down indexing and search.
- Use the most specific type possible (number vs string, token vs string).
- Limit the `base` to only the resource types that need the parameter.

### Throughput

The FHIR service indexes search parameters for efficient search, and query complexity affects performance:

- Search queries are generally more expensive than direct reads.
- Queries with multiple or low-selectivity parameters can increase latency.
- Sort operations (`_sort`) add additional query cost.

Monitor latency, request volume, throttling, and errors in Azure Monitor, and tune search parameters and client query patterns as needed.

### Indexing Impact

Each custom search parameter adds indexing overhead:

- Every create and update operation takes longer because the new parameter must be indexed.
- Storage increases because the index grows.
- Limit custom parameters to what is actually needed for search workflows.

## Compliance and Security

The FHIR service in Azure Health Data Services supports:

- Customer-managed encryption keys for data at rest.
- Private Link for network isolation.
- Audit logging through diagnostic settings.
- Role-based access control with FHIR-specific roles.

Enable diagnostic logging to track all search queries for compliance auditing:

```bash
# Enable diagnostic logging for the FHIR service
az monitor diagnostic-settings create \
    --resource "/subscriptions/{sub}/resourceGroups/healthcare-rg/providers/Microsoft.HealthcareApis/workspaces/healthcare-workspace/fhirservices/my-fhir-service" \
    --name "fhir-diagnostics" \
    --workspace "/subscriptions/{sub}/resourceGroups/healthcare-rg/providers/Microsoft.OperationalInsights/workspaces/my-workspace" \
    --logs '[{"category":"AuditLogs","enabled":true}]'
```

## Wrapping Up

The FHIR service in Azure Health Data Services with custom search parameters lets you build efficient clinical data queries that go beyond the default FHIR specification. The process involves deploying the FHIR server, creating SearchParameter resources with FHIRPath expressions targeting your custom extensions, reindexing the server, and then using the new parameters in standard FHIR search queries. Design your search parameters carefully since each one adds indexing overhead, and monitor query performance to keep performance within acceptable limits.
