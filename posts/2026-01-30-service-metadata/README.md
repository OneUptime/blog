# How to Create Service Metadata

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Platform Engineering, Service Metadata, Service Catalog, DevOps

Description: Learn to implement service metadata management with standardized schemas, automated collection, and validation for comprehensive service understanding.

---

Service metadata is the foundation of any mature platform engineering practice. Without it, teams operate in the dark - unsure of who owns what, how services connect, or what standards they follow. This guide walks you through building a robust service metadata system from the ground up.

---

## What is Service Metadata?

Service metadata describes everything about a service beyond its code: ownership, dependencies, SLOs, deployment configuration, runbooks, and operational characteristics. It transforms scattered tribal knowledge into structured, queryable information.

```mermaid
flowchart TB
    subgraph Metadata Categories
        Identity[Identity & Ownership]
        Technical[Technical Specifications]
        Operational[Operational Details]
        Relationships[Dependencies & Consumers]
    end

    subgraph Use Cases
        Catalog[Service Catalog]
        Incidents[Incident Response]
        Compliance[Compliance & Audits]
        Discovery[Service Discovery]
    end

    Identity --> Catalog
    Technical --> Discovery
    Operational --> Incidents
    Relationships --> Compliance
```

### Why Service Metadata Matters

- **Incident Response**: Responders instantly find owners, runbooks, and dependencies
- **Change Management**: Understand blast radius before deployments
- **Compliance**: Auditors get ownership evidence and data classification
- **Developer Experience**: New team members discover services and their purposes
- **Platform Automation**: Enable self-service infrastructure based on service attributes

---

## Designing the Metadata Schema

A good schema balances comprehensiveness with maintainability. Start small and expand as needs emerge.

### Core Schema Structure

```mermaid
erDiagram
    SERVICE ||--o{ DEPENDENCY : depends_on
    SERVICE ||--|| OWNERSHIP : has
    SERVICE ||--o{ SLO : defines
    SERVICE ||--o{ DEPLOYMENT : deployed_to
    SERVICE ||--o{ ALERT : triggers

    SERVICE {
        string id PK
        string name
        string description
        string lifecycle_stage
        string tier
        datetime created_at
        datetime updated_at
    }

    OWNERSHIP {
        string team_id FK
        string escalation_policy
        string slack_channel
        string on_call_rotation
    }

    DEPENDENCY {
        string upstream_id FK
        string dependency_type
        boolean is_critical
    }

    SLO {
        string metric
        float target
        string window
    }

    DEPLOYMENT {
        string environment
        string cluster
        string namespace
    }
```

### JSON Schema Definition

Create a formal schema to validate metadata submissions:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": ["apiVersion", "kind", "metadata", "spec"],
  "properties": {
    "apiVersion": {
      "type": "string",
      "const": "platform.example.com/v1"
    },
    "kind": {
      "type": "string",
      "const": "ServiceMetadata"
    },
    "metadata": {
      "type": "object",
      "required": ["name"],
      "properties": {
        "name": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]{2,62}$",
          "description": "Service identifier - lowercase, alphanumeric with dashes"
        },
        "labels": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        },
        "annotations": {
          "type": "object",
          "additionalProperties": { "type": "string" }
        }
      }
    },
    "spec": {
      "type": "object",
      "required": ["description", "owner", "tier"],
      "properties": {
        "description": {
          "type": "string",
          "minLength": 10,
          "maxLength": 500
        },
        "owner": {
          "$ref": "#/$defs/ownership"
        },
        "tier": {
          "type": "string",
          "enum": ["tier-1", "tier-2", "tier-3", "tier-4"],
          "description": "Service criticality tier"
        },
        "lifecycle": {
          "type": "string",
          "enum": ["experimental", "development", "production", "deprecated", "decommissioned"],
          "default": "development"
        },
        "links": {
          "$ref": "#/$defs/links"
        },
        "dependencies": {
          "type": "array",
          "items": { "$ref": "#/$defs/dependency" }
        },
        "slos": {
          "type": "array",
          "items": { "$ref": "#/$defs/slo" }
        },
        "deployments": {
          "type": "array",
          "items": { "$ref": "#/$defs/deployment" }
        }
      }
    }
  },
  "$defs": {
    "ownership": {
      "type": "object",
      "required": ["team"],
      "properties": {
        "team": { "type": "string" },
        "slack_channel": { "type": "string", "pattern": "^#" },
        "escalation_policy": { "type": "string" },
        "email": { "type": "string", "format": "email" }
      }
    },
    "links": {
      "type": "object",
      "properties": {
        "repository": { "type": "string", "format": "uri" },
        "documentation": { "type": "string", "format": "uri" },
        "runbook": { "type": "string", "format": "uri" },
        "dashboard": { "type": "string", "format": "uri" },
        "api_docs": { "type": "string", "format": "uri" }
      }
    },
    "dependency": {
      "type": "object",
      "required": ["service"],
      "properties": {
        "service": { "type": "string" },
        "type": {
          "type": "string",
          "enum": ["hard", "soft"],
          "default": "hard"
        },
        "description": { "type": "string" }
      }
    },
    "slo": {
      "type": "object",
      "required": ["name", "target"],
      "properties": {
        "name": { "type": "string" },
        "target": { "type": "number", "minimum": 0, "maximum": 100 },
        "window": {
          "type": "string",
          "enum": ["7d", "28d", "30d"],
          "default": "30d"
        },
        "indicator": { "type": "string" }
      }
    },
    "deployment": {
      "type": "object",
      "required": ["environment"],
      "properties": {
        "environment": {
          "type": "string",
          "enum": ["development", "staging", "production"]
        },
        "cluster": { "type": "string" },
        "namespace": { "type": "string" },
        "replicas": { "type": "integer", "minimum": 1 }
      }
    }
  }
}
```

This schema ensures consistency while remaining flexible enough to accommodate different service types.

### Example Service Metadata Document

Here is a complete example that conforms to the schema:

```yaml
apiVersion: platform.example.com/v1
kind: ServiceMetadata
metadata:
  name: payment-gateway
  labels:
    domain: payments
    data-classification: pci
    cost-center: cc-1234
  annotations:
    platform.example.com/last-review: "2026-01-15"
spec:
  description: |
    Processes credit card transactions and manages payment state.
    Integrates with Stripe and PayPal for payment processing.

  owner:
    team: payments-team
    slack_channel: "#payments-oncall"
    escalation_policy: payments-critical
    email: payments@example.com

  tier: tier-1
  lifecycle: production

  links:
    repository: https://github.com/example/payment-gateway
    documentation: https://docs.example.com/payments
    runbook: https://runbooks.example.com/payment-gateway
    dashboard: https://grafana.example.com/d/payments
    api_docs: https://api.example.com/payments/docs

  dependencies:
    - service: postgres-payments
      type: hard
      description: Primary database for transaction records
    - service: redis-cache
      type: soft
      description: Session and rate limit caching
    - service: notification-service
      type: soft
      description: Sends payment confirmation emails

  slos:
    - name: availability
      target: 99.95
      window: 30d
      indicator: successful_requests / total_requests
    - name: latency-p99
      target: 99
      window: 30d
      indicator: requests_under_500ms / total_requests

  deployments:
    - environment: production
      cluster: prod-us-east-1
      namespace: payments
      replicas: 5
    - environment: staging
      cluster: staging-us-east-1
      namespace: payments
      replicas: 2
```

---

## Automating Metadata Collection

Manual metadata entry becomes stale quickly. Automate collection from multiple sources.

### Collection Architecture

```mermaid
flowchart LR
    subgraph Sources
        Git[Git Repositories]
        K8s[Kubernetes Clusters]
        Cloud[Cloud APIs]
        CMDB[Existing CMDB]
        CI[CI/CD Pipelines]
    end

    subgraph Collectors
        GitCollector[Git Metadata Collector]
        K8sCollector[K8s Metadata Collector]
        CloudCollector[Cloud Metadata Collector]
        CMDBCollector[CMDB Sync]
        CICollector[Pipeline Metadata]
    end

    subgraph Processing
        Aggregator[Metadata Aggregator]
        Validator[Schema Validator]
        Enricher[Data Enricher]
    end

    subgraph Storage
        DB[(Metadata Store)]
        Cache[(Redis Cache)]
        Search[(Search Index)]
    end

    Git --> GitCollector
    K8s --> K8sCollector
    Cloud --> CloudCollector
    CMDB --> CMDBCollector
    CI --> CICollector

    GitCollector --> Aggregator
    K8sCollector --> Aggregator
    CloudCollector --> Aggregator
    CMDBCollector --> Aggregator
    CICollector --> Aggregator

    Aggregator --> Validator
    Validator --> Enricher
    Enricher --> DB
    Enricher --> Cache
    Enricher --> Search
```

### Git-Based Metadata Collection

Store metadata files alongside service code. This Python collector scans repositories:

```python
import os
import yaml
import json
from pathlib import Path
from typing import Optional
from dataclasses import dataclass
from datetime import datetime
import subprocess


@dataclass
class CollectedMetadata:
    service_name: str
    metadata: dict
    source_repo: str
    file_path: str
    commit_sha: str
    collected_at: datetime


class GitMetadataCollector:
    """Collects service metadata from Git repositories."""

    METADATA_FILENAMES = [
        "service.yaml",
        "service.yml",
        ".service-metadata.yaml",
        "catalog-info.yaml",  # Backstage compatibility
    ]

    def __init__(self, repos_base_path: str):
        self.repos_base_path = Path(repos_base_path)

    def collect_all(self) -> list[CollectedMetadata]:
        """Scan all repositories for metadata files."""
        results = []

        for repo_path in self.repos_base_path.iterdir():
            if not repo_path.is_dir():
                continue
            if not (repo_path / ".git").exists():
                continue

            metadata = self.collect_from_repo(repo_path)
            if metadata:
                results.append(metadata)

        return results

    def collect_from_repo(self, repo_path: Path) -> Optional[CollectedMetadata]:
        """Extract metadata from a single repository."""
        for filename in self.METADATA_FILENAMES:
            metadata_file = repo_path / filename
            if metadata_file.exists():
                return self._parse_metadata_file(repo_path, metadata_file)

        # Check in .platform directory
        platform_dir = repo_path / ".platform"
        if platform_dir.exists():
            for filename in self.METADATA_FILENAMES:
                metadata_file = platform_dir / filename
                if metadata_file.exists():
                    return self._parse_metadata_file(repo_path, metadata_file)

        return None

    def _parse_metadata_file(
        self,
        repo_path: Path,
        metadata_file: Path
    ) -> CollectedMetadata:
        """Parse a metadata file and extract relevant information."""
        with open(metadata_file) as f:
            content = yaml.safe_load(f)

        # Get current commit SHA
        commit_sha = self._get_commit_sha(repo_path)

        # Extract service name from metadata or repo name
        service_name = (
            content.get("metadata", {}).get("name")
            or repo_path.name
        )

        return CollectedMetadata(
            service_name=service_name,
            metadata=content,
            source_repo=str(repo_path),
            file_path=str(metadata_file.relative_to(repo_path)),
            commit_sha=commit_sha,
            collected_at=datetime.utcnow()
        )

    def _get_commit_sha(self, repo_path: Path) -> str:
        """Get the current HEAD commit SHA."""
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_path,
            capture_output=True,
            text=True
        )
        return result.stdout.strip()


# Usage example
if __name__ == "__main__":
    collector = GitMetadataCollector("/path/to/repositories")
    all_metadata = collector.collect_all()

    for item in all_metadata:
        print(f"Found: {item.service_name} in {item.source_repo}")
        print(f"  Commit: {item.commit_sha}")
        print(f"  File: {item.file_path}")
```

### Kubernetes Metadata Collector

Extract runtime metadata from Kubernetes clusters:

```python
from kubernetes import client, config
from typing import Optional
from dataclasses import dataclass


@dataclass
class K8sServiceMetadata:
    name: str
    namespace: str
    labels: dict
    annotations: dict
    replicas: int
    image: str
    resources: dict
    environment: str


class KubernetesMetadataCollector:
    """Collects service metadata from Kubernetes clusters."""

    def __init__(self, kubeconfig_path: Optional[str] = None):
        if kubeconfig_path:
            config.load_kube_config(kubeconfig_path)
        else:
            # Try in-cluster config first, fall back to default kubeconfig
            try:
                config.load_incluster_config()
            except config.ConfigException:
                config.load_kube_config()

        self.apps_v1 = client.AppsV1Api()
        self.core_v1 = client.CoreV1Api()

    def collect_deployments(
        self,
        namespace: Optional[str] = None,
        label_selector: Optional[str] = None
    ) -> list[K8sServiceMetadata]:
        """Collect metadata from all deployments."""
        results = []

        if namespace:
            deployments = self.apps_v1.list_namespaced_deployment(
                namespace=namespace,
                label_selector=label_selector
            )
        else:
            deployments = self.apps_v1.list_deployment_for_all_namespaces(
                label_selector=label_selector
            )

        for dep in deployments.items:
            metadata = self._extract_deployment_metadata(dep)
            if metadata:
                results.append(metadata)

        return results

    def _extract_deployment_metadata(
        self,
        deployment
    ) -> Optional[K8sServiceMetadata]:
        """Extract metadata from a Kubernetes Deployment."""
        # Skip system namespaces
        if deployment.metadata.namespace in ["kube-system", "kube-public"]:
            return None

        # Get container spec (first container)
        containers = deployment.spec.template.spec.containers
        if not containers:
            return None

        container = containers[0]

        # Extract resource requests/limits
        resources = {}
        if container.resources:
            if container.resources.requests:
                resources["requests"] = dict(container.resources.requests)
            if container.resources.limits:
                resources["limits"] = dict(container.resources.limits)

        # Determine environment from namespace or labels
        environment = self._determine_environment(
            deployment.metadata.namespace,
            deployment.metadata.labels or {}
        )

        return K8sServiceMetadata(
            name=deployment.metadata.name,
            namespace=deployment.metadata.namespace,
            labels=dict(deployment.metadata.labels or {}),
            annotations=dict(deployment.metadata.annotations or {}),
            replicas=deployment.spec.replicas or 1,
            image=container.image,
            resources=resources,
            environment=environment
        )

    def _determine_environment(
        self,
        namespace: str,
        labels: dict
    ) -> str:
        """Infer environment from namespace or labels."""
        # Check labels first
        env_label = labels.get("environment") or labels.get("env")
        if env_label:
            return env_label

        # Infer from namespace naming conventions
        namespace_lower = namespace.lower()
        if "prod" in namespace_lower:
            return "production"
        elif "stag" in namespace_lower:
            return "staging"
        elif "dev" in namespace_lower:
            return "development"

        return "unknown"


# Usage example
if __name__ == "__main__":
    collector = KubernetesMetadataCollector()

    # Collect from specific namespace
    services = collector.collect_deployments(namespace="payments")

    for svc in services:
        print(f"Service: {svc.name}")
        print(f"  Namespace: {svc.namespace}")
        print(f"  Environment: {svc.environment}")
        print(f"  Replicas: {svc.replicas}")
        print(f"  Image: {svc.image}")
```

### CI/CD Pipeline Metadata Injection

Enrich metadata during builds. Here is a GitHub Actions workflow:

```yaml
name: Build and Publish Service Metadata

on:
  push:
    branches: [main]
    paths:
      - 'service.yaml'
      - 'src/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for git info

      - name: Extract Git Metadata
        id: git-info
        run: |
          echo "commit_sha=${{ github.sha }}" >> $GITHUB_OUTPUT
          echo "commit_message=$(git log -1 --pretty=%B)" >> $GITHUB_OUTPUT
          echo "author=$(git log -1 --pretty=%an)" >> $GITHUB_OUTPUT
          echo "branch=${{ github.ref_name }}" >> $GITHUB_OUTPUT

      - name: Enrich Service Metadata
        run: |
          # Read existing metadata
          SERVICE_NAME=$(yq '.metadata.name' service.yaml)

          # Create enriched metadata
          cat > enriched-metadata.json << EOF
          {
            "service_name": "${SERVICE_NAME}",
            "build": {
              "commit_sha": "${{ steps.git-info.outputs.commit_sha }}",
              "commit_message": "${{ steps.git-info.outputs.commit_message }}",
              "author": "${{ steps.git-info.outputs.author }}",
              "branch": "${{ steps.git-info.outputs.branch }}",
              "build_number": "${{ github.run_number }}",
              "build_url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}",
              "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
            },
            "artifacts": {
              "image": "ghcr.io/${{ github.repository }}:${{ github.sha }}"
            }
          }
          EOF

      - name: Publish to Metadata API
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.METADATA_API_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d @enriched-metadata.json \
            https://platform-api.example.com/v1/metadata/services
```

---

## Validating Service Metadata

Validation ensures metadata quality and prevents invalid data from entering the system.

### Validation Architecture

```mermaid
flowchart TB
    subgraph Validation Stages
        Schema[Schema Validation]
        Business[Business Rules]
        Cross[Cross-Reference Checks]
        Ownership[Ownership Verification]
    end

    Input[Metadata Input] --> Schema
    Schema -->|Pass| Business
    Schema -->|Fail| Reject1[Reject with Schema Errors]

    Business -->|Pass| Cross
    Business -->|Fail| Reject2[Reject with Rule Violations]

    Cross -->|Pass| Ownership
    Cross -->|Fail| Reject3[Reject with Reference Errors]

    Ownership -->|Pass| Accept[Accept Metadata]
    Ownership -->|Fail| Reject4[Reject - Invalid Owner]
```

### Python Validation Implementation

```python
import json
import jsonschema
from typing import Optional
from dataclasses import dataclass, field
from enum import Enum


class ValidationSeverity(Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


@dataclass
class ValidationIssue:
    path: str
    message: str
    severity: ValidationSeverity
    rule: str


@dataclass
class ValidationResult:
    valid: bool
    issues: list[ValidationIssue] = field(default_factory=list)

    def add_error(self, path: str, message: str, rule: str):
        self.issues.append(ValidationIssue(
            path=path,
            message=message,
            severity=ValidationSeverity.ERROR,
            rule=rule
        ))
        self.valid = False

    def add_warning(self, path: str, message: str, rule: str):
        self.issues.append(ValidationIssue(
            path=path,
            message=message,
            severity=ValidationSeverity.WARNING,
            rule=rule
        ))


class MetadataValidator:
    """Comprehensive metadata validation."""

    def __init__(
        self,
        schema_path: str,
        team_registry: Optional[dict] = None,
        service_registry: Optional[dict] = None
    ):
        with open(schema_path) as f:
            self.schema = json.load(f)

        self.team_registry = team_registry or {}
        self.service_registry = service_registry or {}

    def validate(self, metadata: dict) -> ValidationResult:
        """Run all validation stages."""
        result = ValidationResult(valid=True)

        # Stage 1: Schema validation
        self._validate_schema(metadata, result)
        if not result.valid:
            return result  # Stop early on schema errors

        # Stage 2: Business rules
        self._validate_business_rules(metadata, result)

        # Stage 3: Cross-reference checks
        self._validate_cross_references(metadata, result)

        # Stage 4: Ownership verification
        self._validate_ownership(metadata, result)

        return result

    def _validate_schema(self, metadata: dict, result: ValidationResult):
        """Validate against JSON Schema."""
        validator = jsonschema.Draft202012Validator(self.schema)

        for error in validator.iter_errors(metadata):
            result.add_error(
                path=".".join(str(p) for p in error.absolute_path),
                message=error.message,
                rule="schema_validation"
            )

    def _validate_business_rules(self, metadata: dict, result: ValidationResult):
        """Apply business-specific validation rules."""
        spec = metadata.get("spec", {})

        # Rule: Tier-1 services must have SLOs
        if spec.get("tier") == "tier-1":
            slos = spec.get("slos", [])
            if not slos:
                result.add_error(
                    path="spec.slos",
                    message="Tier-1 services must define at least one SLO",
                    rule="tier1_requires_slos"
                )
            else:
                # Must have availability SLO
                has_availability = any(
                    slo.get("name") == "availability" for slo in slos
                )
                if not has_availability:
                    result.add_warning(
                        path="spec.slos",
                        message="Tier-1 services should have an availability SLO",
                        rule="tier1_availability_slo"
                    )

        # Rule: Production services need runbook links
        if spec.get("lifecycle") == "production":
            links = spec.get("links", {})
            if not links.get("runbook"):
                result.add_warning(
                    path="spec.links.runbook",
                    message="Production services should have a runbook link",
                    rule="production_runbook"
                )

        # Rule: Dependencies must specify type
        for i, dep in enumerate(spec.get("dependencies", [])):
            if "type" not in dep:
                result.add_warning(
                    path=f"spec.dependencies[{i}].type",
                    message="Dependencies should specify type (hard/soft)",
                    rule="dependency_type_specified"
                )

    def _validate_cross_references(self, metadata: dict, result: ValidationResult):
        """Verify references to other entities exist."""
        spec = metadata.get("spec", {})

        # Validate dependency references
        for i, dep in enumerate(spec.get("dependencies", [])):
            service_name = dep.get("service")
            if service_name and service_name not in self.service_registry:
                result.add_warning(
                    path=f"spec.dependencies[{i}].service",
                    message=f"Referenced service '{service_name}' not found in registry",
                    rule="dependency_exists"
                )

    def _validate_ownership(self, metadata: dict, result: ValidationResult):
        """Verify team ownership is valid."""
        owner = metadata.get("spec", {}).get("owner", {})
        team = owner.get("team")

        if team and self.team_registry:
            if team not in self.team_registry:
                result.add_error(
                    path="spec.owner.team",
                    message=f"Team '{team}' not found in team registry",
                    rule="team_exists"
                )


# Usage example
if __name__ == "__main__":
    validator = MetadataValidator(
        schema_path="service-metadata-schema.json",
        team_registry={"payments-team": {}, "platform-team": {}},
        service_registry={"postgres-payments": {}, "redis-cache": {}}
    )

    # Example metadata to validate
    metadata = {
        "apiVersion": "platform.example.com/v1",
        "kind": "ServiceMetadata",
        "metadata": {"name": "payment-gateway"},
        "spec": {
            "description": "Processes payments",
            "owner": {"team": "payments-team"},
            "tier": "tier-1",
            "lifecycle": "production",
            "slos": [
                {"name": "availability", "target": 99.95}
            ]
        }
    }

    result = validator.validate(metadata)

    print(f"Valid: {result.valid}")
    for issue in result.issues:
        print(f"  [{issue.severity.value}] {issue.path}: {issue.message}")
```

### Pre-Commit Hook for Local Validation

Add a pre-commit hook to validate metadata before commits:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: validate-service-metadata
        name: Validate Service Metadata
        entry: python scripts/validate_metadata.py
        language: python
        files: service\.ya?ml$
        additional_dependencies:
          - jsonschema
          - pyyaml
```

The validation script:

```python
#!/usr/bin/env python3
# scripts/validate_metadata.py

import sys
import yaml
import json
from pathlib import Path


def load_schema():
    """Load the metadata schema from the platform repository."""
    schema_path = Path(__file__).parent / "service-metadata-schema.json"
    if schema_path.exists():
        with open(schema_path) as f:
            return json.load(f)

    # Fallback: fetch from central location
    import urllib.request
    url = "https://platform.example.com/schemas/service-metadata-v1.json"
    with urllib.request.urlopen(url) as response:
        return json.loads(response.read())


def validate_file(filepath: str) -> bool:
    """Validate a single metadata file."""
    import jsonschema

    schema = load_schema()

    with open(filepath) as f:
        metadata = yaml.safe_load(f)

    try:
        jsonschema.validate(metadata, schema)
        print(f"OK: {filepath}")
        return True
    except jsonschema.ValidationError as e:
        print(f"FAIL: {filepath}")
        print(f"  Error at {'.'.join(str(p) for p in e.absolute_path)}: {e.message}")
        return False


def main():
    files = sys.argv[1:]
    if not files:
        print("No files to validate")
        return 0

    all_valid = True
    for filepath in files:
        if not validate_file(filepath):
            all_valid = False

    return 0 if all_valid else 1


if __name__ == "__main__":
    sys.exit(main())
```

---

## Storing Service Metadata

Choose a storage solution based on query patterns and scale requirements.

### Storage Options Comparison

| Feature | PostgreSQL | MongoDB | Graph DB | Git-Based |
|---------|-----------|---------|----------|-----------|
| Schema enforcement | Strong | Flexible | Flexible | Manual |
| Dependency queries | Join-heavy | Manual | Native | Manual |
| Change history | Triggers/audit | Manual | Manual | Native |
| Query flexibility | High | High | Specialized | Limited |
| Operational complexity | Low | Medium | High | Low |

### PostgreSQL Schema

```sql
-- Core tables for service metadata storage

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table for ownership
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    slack_channel VARCHAR(100),
    email VARCHAR(255),
    escalation_policy VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services table
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    tier VARCHAR(20) NOT NULL CHECK (tier IN ('tier-1', 'tier-2', 'tier-3', 'tier-4')),
    lifecycle VARCHAR(20) NOT NULL DEFAULT 'development'
        CHECK (lifecycle IN ('experimental', 'development', 'production', 'deprecated', 'decommissioned')),
    owner_team_id UUID REFERENCES teams(id),
    metadata JSONB DEFAULT '{}',
    labels JSONB DEFAULT '{}',
    annotations JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Service links
CREATE TABLE service_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    UNIQUE(service_id, link_type)
);

-- Dependencies between services
CREATE TABLE service_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    depends_on_service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    dependency_type VARCHAR(20) DEFAULT 'hard' CHECK (dependency_type IN ('hard', 'soft')),
    description TEXT,
    UNIQUE(service_id, depends_on_service_id)
);

-- SLOs
CREATE TABLE service_slos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    target DECIMAL(5, 2) NOT NULL,
    window VARCHAR(10) DEFAULT '30d',
    indicator TEXT,
    UNIQUE(service_id, name)
);

-- Deployments
CREATE TABLE service_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE CASCADE,
    environment VARCHAR(50) NOT NULL,
    cluster VARCHAR(100),
    namespace VARCHAR(100),
    replicas INTEGER DEFAULT 1,
    last_deployed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(service_id, environment, cluster)
);

-- Audit log for changes
CREATE TABLE service_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL,
    changes JSONB NOT NULL,
    actor VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_services_tier ON services(tier);
CREATE INDEX idx_services_lifecycle ON services(lifecycle);
CREATE INDEX idx_services_labels ON services USING GIN(labels);
CREATE INDEX idx_dependencies_depends_on ON service_dependencies(depends_on_service_id);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER services_updated_at
    BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- View for full service details
CREATE VIEW service_details AS
SELECT
    s.id,
    s.name,
    s.description,
    s.tier,
    s.lifecycle,
    t.name as owner_team,
    t.slack_channel as owner_slack,
    s.labels,
    s.metadata,
    s.created_at,
    s.updated_at,
    (
        SELECT jsonb_object_agg(link_type, url)
        FROM service_links WHERE service_id = s.id
    ) as links,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'service', dep_svc.name,
            'type', sd.dependency_type,
            'description', sd.description
        ))
        FROM service_dependencies sd
        JOIN services dep_svc ON sd.depends_on_service_id = dep_svc.id
        WHERE sd.service_id = s.id
    ) as dependencies,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'name', name,
            'target', target,
            'window', window
        ))
        FROM service_slos WHERE service_id = s.id
    ) as slos
FROM services s
LEFT JOIN teams t ON s.owner_team_id = t.id;
```

### Useful Queries

```sql
-- Find all services depending on a specific service
SELECT DISTINCT s.name, s.tier, t.name as owner
FROM services s
JOIN service_dependencies sd ON s.id = sd.service_id
JOIN services target ON sd.depends_on_service_id = target.id
JOIN teams t ON s.owner_team_id = t.id
WHERE target.name = 'postgres-payments';

-- Find tier-1 services without SLOs
SELECT s.name, s.tier, t.name as owner
FROM services s
LEFT JOIN service_slos slo ON s.id = slo.service_id
LEFT JOIN teams t ON s.owner_team_id = t.id
WHERE s.tier = 'tier-1'
  AND slo.id IS NULL;

-- Get dependency graph (recursive)
WITH RECURSIVE dep_graph AS (
    -- Base case: start with the target service
    SELECT
        s.id,
        s.name,
        0 as depth,
        ARRAY[s.name] as path
    FROM services s
    WHERE s.name = 'payment-gateway'

    UNION ALL

    -- Recursive case: find dependencies
    SELECT
        dep.id,
        dep.name,
        dg.depth + 1,
        dg.path || dep.name
    FROM dep_graph dg
    JOIN service_dependencies sd ON dg.id = sd.service_id
    JOIN services dep ON sd.depends_on_service_id = dep.id
    WHERE dep.name != ALL(dg.path)  -- Prevent cycles
      AND dg.depth < 5  -- Limit depth
)
SELECT DISTINCT name, depth, path
FROM dep_graph
ORDER BY depth, name;

-- Services by label
SELECT name, tier, labels
FROM services
WHERE labels @> '{"domain": "payments"}';
```

---

## Building the Metadata API

Expose metadata through a REST API for integrations and tooling.

### API Design

```mermaid
flowchart LR
    subgraph Clients
        CLI[Platform CLI]
        UI[Service Catalog UI]
        CI[CI/CD Pipelines]
        Tools[Internal Tools]
    end

    subgraph API Gateway
        Auth[Authentication]
        Rate[Rate Limiting]
        Cache[Response Cache]
    end

    subgraph Metadata API
        CRUD[CRUD Endpoints]
        Search[Search Endpoint]
        Graph[Dependency Graph]
        Export[Export/Import]
    end

    subgraph Storage
        DB[(PostgreSQL)]
        ES[(Elasticsearch)]
        Redis[(Redis)]
    end

    CLI --> Auth
    UI --> Auth
    CI --> Auth
    Tools --> Auth

    Auth --> Rate
    Rate --> Cache
    Cache --> CRUD
    Cache --> Search
    Cache --> Graph
    Cache --> Export

    CRUD --> DB
    Search --> ES
    Graph --> DB
    Export --> DB
```

### FastAPI Implementation

```python
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID
import asyncpg


app = FastAPI(
    title="Service Metadata API",
    description="API for managing service metadata",
    version="1.0.0"
)

security = HTTPBearer()


# Pydantic models for request/response
class OwnershipModel(BaseModel):
    team: str
    slack_channel: Optional[str] = None
    email: Optional[str] = None
    escalation_policy: Optional[str] = None


class DependencyModel(BaseModel):
    service: str
    type: str = "hard"
    description: Optional[str] = None


class SLOModel(BaseModel):
    name: str
    target: float = Field(ge=0, le=100)
    window: str = "30d"
    indicator: Optional[str] = None


class LinksModel(BaseModel):
    repository: Optional[str] = None
    documentation: Optional[str] = None
    runbook: Optional[str] = None
    dashboard: Optional[str] = None
    api_docs: Optional[str] = None


class ServiceCreateRequest(BaseModel):
    name: str = Field(pattern="^[a-z][a-z0-9-]{2,62}$")
    description: str = Field(min_length=10, max_length=500)
    tier: str = Field(pattern="^tier-[1-4]$")
    lifecycle: str = "development"
    owner: OwnershipModel
    links: Optional[LinksModel] = None
    dependencies: list[DependencyModel] = []
    slos: list[SLOModel] = []
    labels: dict[str, str] = {}


class ServiceResponse(BaseModel):
    id: UUID
    name: str
    description: str
    tier: str
    lifecycle: str
    owner: OwnershipModel
    links: Optional[LinksModel]
    dependencies: list[DependencyModel]
    slos: list[SLOModel]
    labels: dict[str, str]
    created_at: datetime
    updated_at: datetime


# Database connection pool
async def get_db():
    pool = await asyncpg.create_pool(
        "postgresql://user:pass@localhost/metadata"
    )
    try:
        yield pool
    finally:
        await pool.close()


# Authentication dependency
async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    # In production, validate JWT token
    token = credentials.credentials
    # Return user info from token
    return {"user_id": "user123", "teams": ["platform-team"]}


# API Endpoints
@app.post("/v1/services", response_model=ServiceResponse, status_code=201)
async def create_service(
    service: ServiceCreateRequest,
    db=Depends(get_db),
    user: dict = Depends(verify_token)
):
    """Create a new service in the metadata registry."""
    async with db.acquire() as conn:
        # Check if service already exists
        existing = await conn.fetchrow(
            "SELECT id FROM services WHERE name = $1",
            service.name
        )
        if existing:
            raise HTTPException(
                status_code=409,
                detail=f"Service '{service.name}' already exists"
            )

        # Get or create team
        team = await conn.fetchrow(
            "SELECT id FROM teams WHERE name = $1",
            service.owner.team
        )
        if not team:
            raise HTTPException(
                status_code=400,
                detail=f"Team '{service.owner.team}' not found"
            )

        # Insert service
        row = await conn.fetchrow("""
            INSERT INTO services (name, description, tier, lifecycle, owner_team_id, labels)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, created_at, updated_at
        """, service.name, service.description, service.tier,
            service.lifecycle, team["id"], service.labels)

        service_id = row["id"]

        # Insert links
        if service.links:
            links_dict = service.links.dict(exclude_none=True)
            for link_type, url in links_dict.items():
                await conn.execute("""
                    INSERT INTO service_links (service_id, link_type, url)
                    VALUES ($1, $2, $3)
                """, service_id, link_type, url)

        # Insert SLOs
        for slo in service.slos:
            await conn.execute("""
                INSERT INTO service_slos (service_id, name, target, window, indicator)
                VALUES ($1, $2, $3, $4, $5)
            """, service_id, slo.name, slo.target, slo.window, slo.indicator)

        # Insert dependencies
        for dep in service.dependencies:
            dep_service = await conn.fetchrow(
                "SELECT id FROM services WHERE name = $1",
                dep.service
            )
            if dep_service:
                await conn.execute("""
                    INSERT INTO service_dependencies
                    (service_id, depends_on_service_id, dependency_type, description)
                    VALUES ($1, $2, $3, $4)
                """, service_id, dep_service["id"], dep.type, dep.description)

        # Log the creation
        await conn.execute("""
            INSERT INTO service_audit_log (service_id, action, changes, actor)
            VALUES ($1, 'create', $2, $3)
        """, service_id, service.dict(), user["user_id"])

        return await get_service_by_id(service_id, conn)


@app.get("/v1/services/{name}", response_model=ServiceResponse)
async def get_service(
    name: str,
    db=Depends(get_db)
):
    """Get service metadata by name."""
    async with db.acquire() as conn:
        service = await conn.fetchrow(
            "SELECT * FROM service_details WHERE name = $1",
            name
        )
        if not service:
            raise HTTPException(
                status_code=404,
                detail=f"Service '{name}' not found"
            )
        return dict(service)


@app.get("/v1/services")
async def list_services(
    tier: Optional[str] = Query(None, pattern="^tier-[1-4]$"),
    lifecycle: Optional[str] = None,
    owner_team: Optional[str] = None,
    label: Optional[str] = Query(None, description="Label filter as key=value"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db=Depends(get_db)
):
    """List services with optional filters."""
    async with db.acquire() as conn:
        query = "SELECT * FROM service_details WHERE 1=1"
        params = []
        param_count = 0

        if tier:
            param_count += 1
            query += f" AND tier = ${param_count}"
            params.append(tier)

        if lifecycle:
            param_count += 1
            query += f" AND lifecycle = ${param_count}"
            params.append(lifecycle)

        if owner_team:
            param_count += 1
            query += f" AND owner_team = ${param_count}"
            params.append(owner_team)

        if label:
            key, value = label.split("=", 1)
            param_count += 1
            query += f" AND labels @> ${param_count}::jsonb"
            params.append({key: value})

        query += f" ORDER BY name LIMIT ${param_count + 1} OFFSET ${param_count + 2}"
        params.extend([limit, offset])

        services = await conn.fetch(query, *params)
        return {"items": [dict(s) for s in services], "total": len(services)}


@app.get("/v1/services/{name}/dependencies")
async def get_dependencies(
    name: str,
    direction: str = Query("both", pattern="^(upstream|downstream|both)$"),
    depth: int = Query(3, ge=1, le=5),
    db=Depends(get_db)
):
    """Get service dependency graph."""
    async with db.acquire() as conn:
        service = await conn.fetchrow(
            "SELECT id FROM services WHERE name = $1",
            name
        )
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

        # Build dependency tree using recursive CTE
        if direction in ("upstream", "both"):
            upstream = await conn.fetch("""
                WITH RECURSIVE deps AS (
                    SELECT depends_on_service_id as id, 1 as depth
                    FROM service_dependencies
                    WHERE service_id = $1
                    UNION ALL
                    SELECT sd.depends_on_service_id, deps.depth + 1
                    FROM service_dependencies sd
                    JOIN deps ON sd.service_id = deps.id
                    WHERE deps.depth < $2
                )
                SELECT DISTINCT s.name, s.tier, deps.depth
                FROM deps
                JOIN services s ON deps.id = s.id
                ORDER BY deps.depth, s.name
            """, service["id"], depth)
        else:
            upstream = []

        if direction in ("downstream", "both"):
            downstream = await conn.fetch("""
                WITH RECURSIVE deps AS (
                    SELECT service_id as id, 1 as depth
                    FROM service_dependencies
                    WHERE depends_on_service_id = $1
                    UNION ALL
                    SELECT sd.service_id, deps.depth + 1
                    FROM service_dependencies sd
                    JOIN deps ON sd.depends_on_service_id = deps.id
                    WHERE deps.depth < $2
                )
                SELECT DISTINCT s.name, s.tier, deps.depth
                FROM deps
                JOIN services s ON deps.id = s.id
                ORDER BY deps.depth, s.name
            """, service["id"], depth)
        else:
            downstream = []

        return {
            "service": name,
            "upstream": [dict(u) for u in upstream],
            "downstream": [dict(d) for d in downstream]
        }


@app.get("/v1/search")
async def search_services(
    q: str = Query(min_length=2),
    db=Depends(get_db)
):
    """Full-text search across service metadata."""
    async with db.acquire() as conn:
        # Simple search - in production, use Elasticsearch
        services = await conn.fetch("""
            SELECT name, description, tier, owner_team
            FROM service_details
            WHERE name ILIKE $1
               OR description ILIKE $1
               OR owner_team ILIKE $1
            LIMIT 20
        """, f"%{q}%")

        return {"query": q, "results": [dict(s) for s in services]}


async def get_service_by_id(service_id: UUID, conn) -> dict:
    """Helper to fetch service with all related data."""
    return dict(await conn.fetchrow(
        "SELECT * FROM service_details WHERE id = $1",
        service_id
    ))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### OpenAPI Specification

The FastAPI app automatically generates OpenAPI documentation. Access it at `/docs` for Swagger UI or `/redoc` for ReDoc.

---

## Integrating with Existing Tools

Service metadata becomes powerful when integrated into your existing workflows.

### Integration Architecture

```mermaid
flowchart TB
    subgraph Metadata System
        API[Metadata API]
        Events[Event Stream]
    end

    subgraph Incident Management
        PD[PagerDuty]
        Slack[Slack]
        Incidents[Incident Tool]
    end

    subgraph Observability
        Grafana[Grafana]
        Alerts[Alert Manager]
        Traces[Tracing System]
    end

    subgraph Development
        IDE[IDE Extensions]
        Docs[Documentation]
        Portal[Developer Portal]
    end

    API --> PD
    API --> Grafana
    API --> Portal
    Events --> Slack
    Events --> Alerts
    Incidents --> API
    Traces --> API
```

### PagerDuty Integration

Automatically route incidents based on service metadata:

```python
import httpx
from typing import Optional


class PagerDutyIntegration:
    """Sync service metadata to PagerDuty."""

    def __init__(self, api_key: str, metadata_api_url: str):
        self.pd_client = httpx.Client(
            base_url="https://api.pagerduty.com",
            headers={
                "Authorization": f"Token token={api_key}",
                "Content-Type": "application/json"
            }
        )
        self.metadata_api = httpx.Client(base_url=metadata_api_url)

    def sync_service(self, service_name: str):
        """Sync a service's metadata to PagerDuty."""
        # Get metadata
        resp = self.metadata_api.get(f"/v1/services/{service_name}")
        if resp.status_code != 200:
            raise Exception(f"Service not found: {service_name}")

        metadata = resp.json()

        # Find or create PagerDuty service
        pd_service = self._find_pd_service(service_name)

        if pd_service:
            self._update_pd_service(pd_service["id"], metadata)
        else:
            self._create_pd_service(metadata)

    def _find_pd_service(self, name: str) -> Optional[dict]:
        """Find existing PagerDuty service by name."""
        resp = self.pd_client.get(
            "/services",
            params={"query": name}
        )
        services = resp.json().get("services", [])
        for svc in services:
            if svc["name"] == name:
                return svc
        return None

    def _create_pd_service(self, metadata: dict):
        """Create a new PagerDuty service."""
        # Map tier to urgency
        urgency_map = {
            "tier-1": "high",
            "tier-2": "high",
            "tier-3": "low",
            "tier-4": "low"
        }

        payload = {
            "service": {
                "name": metadata["name"],
                "description": metadata["description"],
                "escalation_policy": {
                    "id": self._get_escalation_policy_id(
                        metadata["owner"].get("escalation_policy")
                    ),
                    "type": "escalation_policy_reference"
                },
                "alert_creation": "create_alerts_and_incidents",
                "incident_urgency_rule": {
                    "type": "constant",
                    "urgency": urgency_map.get(metadata["tier"], "low")
                }
            }
        }

        self.pd_client.post("/services", json=payload)

    def _update_pd_service(self, service_id: str, metadata: dict):
        """Update existing PagerDuty service."""
        payload = {
            "service": {
                "description": metadata["description"],
                "escalation_policy": {
                    "id": self._get_escalation_policy_id(
                        metadata["owner"].get("escalation_policy")
                    ),
                    "type": "escalation_policy_reference"
                }
            }
        }

        self.pd_client.put(f"/services/{service_id}", json=payload)

    def _get_escalation_policy_id(self, policy_name: Optional[str]) -> str:
        """Look up escalation policy ID by name."""
        if not policy_name:
            return "DEFAULT_POLICY_ID"

        resp = self.pd_client.get(
            "/escalation_policies",
            params={"query": policy_name}
        )
        policies = resp.json().get("escalation_policies", [])
        for policy in policies:
            if policy["name"] == policy_name:
                return policy["id"]

        return "DEFAULT_POLICY_ID"
```

### Grafana Dashboard Variables

Use metadata to populate Grafana dashboard variables:

```json
{
  "templating": {
    "list": [
      {
        "name": "service",
        "type": "query",
        "datasource": "-- Grafana --",
        "query": {
          "queryType": "api",
          "url": "http://metadata-api:8000/v1/services?tier=tier-1",
          "method": "GET",
          "parser": "json",
          "path": "$.items[*].name"
        },
        "refresh": 2,
        "sort": 1
      },
      {
        "name": "owner_team",
        "type": "query",
        "datasource": "-- Grafana --",
        "query": {
          "queryType": "api",
          "url": "http://metadata-api:8000/v1/services/${service}",
          "method": "GET",
          "parser": "json",
          "path": "$.owner.team"
        },
        "refresh": 2
      }
    ]
  }
}
```

---

## Best Practices

### Schema Evolution

- Use versioned API paths (`/v1/`, `/v2/`)
- Add new fields as optional with defaults
- Never remove required fields in minor versions
- Maintain backwards compatibility for at least two versions
- Document all schema changes in a changelog

### Data Quality

- Implement automated staleness detection
- Send reminders when metadata has not been updated in 90 days
- Track metadata completeness scores per team
- Block deployments for services missing required metadata

### Governance

- Define clear ownership of the metadata schema
- Establish a review process for schema changes
- Create runbooks for common metadata operations
- Train teams on metadata best practices

### Performance

- Cache frequently accessed metadata (service lookups)
- Use read replicas for high-traffic queries
- Implement pagination for list endpoints
- Consider eventual consistency for non-critical reads

---

## Conclusion

Service metadata transforms chaotic microservice environments into manageable systems. Start with a minimal schema covering ownership and dependencies, automate collection from existing sources, validate rigorously, and expose through APIs that integrate with your toolchain.

The investment in metadata pays dividends during incidents (faster resolution), audits (instant compliance evidence), and developer onboarding (discoverable architecture). Build incrementally, measure adoption, and expand based on demonstrated value.

Platforms like OneUptime provide built-in service catalog capabilities that can accelerate your metadata journey - connecting services to monitors, incidents, and status pages out of the box.

Begin with five critical services. Define their owners and dependencies. The rest will follow.
