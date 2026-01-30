# How to Create Model Approval Workflows

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: MLOps, Model Registry, Approval Workflow, Governance

Description: Learn to create model approval workflows for controlled promotion of ML models to production.

---

## Introduction

In production ML systems, deploying a model without proper oversight can lead to significant issues: biased predictions, performance regressions, compliance violations, and more. Model approval workflows provide a structured process for reviewing, validating, and promoting models through different environments (development, staging, production).

This guide walks you through building robust model approval workflows using popular MLOps tools like MLflow and Amazon SageMaker. You will learn how to implement approval gates, gather stakeholder sign-offs, and maintain comprehensive audit trails.

## Why Model Approval Workflows Matter

Before diving into implementation, let us understand the key benefits:

- **Quality Assurance**: Catch issues before they reach production
- **Compliance**: Meet regulatory requirements (GDPR, SOX, HIPAA)
- **Accountability**: Clear ownership and responsibility at each stage
- **Reproducibility**: Document decisions and model lineage
- **Risk Mitigation**: Prevent unauthorized or untested models from being deployed

## Workflow Architecture Overview

Here is a high-level view of a typical model approval workflow:

```mermaid
flowchart TD
    A[Data Scientist Trains Model] --> B[Register Model in Registry]
    B --> C[Automated Validation Tests]
    C --> D{Tests Pass?}
    D -->|No| E[Return to Development]
    D -->|Yes| F[Technical Review]
    F --> G{Technical Approval?}
    G -->|No| E
    G -->|Yes| H[Business Stakeholder Review]
    H --> I{Business Approval?}
    I -->|No| E
    I -->|Yes| J[Compliance Review]
    J --> K{Compliance Approval?}
    K -->|No| E
    K -->|Yes| L[Deploy to Production]
    L --> M[Post-Deployment Monitoring]
```

## Setting Up the Model Registry with MLflow

The model registry serves as the central hub for managing model versions and their lifecycle stages. Here is how to set up MLflow for approval workflows.

### Installing Dependencies

```bash
# Install MLflow and related packages
pip install mlflow boto3 sqlalchemy psycopg2-binary

# Set up the tracking server (using PostgreSQL for production)
export MLFLOW_TRACKING_URI=postgresql://user:password@localhost:5432/mlflow
```

### Registering a Model with Metadata

```python
"""
Model Registration Script
This script demonstrates how to register a trained model
with comprehensive metadata for the approval workflow.
"""

import mlflow
from mlflow.tracking import MlflowClient
from datetime import datetime
import json

# Initialize the MLflow client
client = MlflowClient()

def register_model_for_approval(
    model_uri: str,
    model_name: str,
    training_metrics: dict,
    data_lineage: dict,
    author: str
) -> str:
    """
    Register a model in MLflow with metadata required for approval.

    Args:
        model_uri: Path to the trained model artifact
        model_name: Name for the registered model
        training_metrics: Dictionary of training performance metrics
        data_lineage: Information about training data sources
        author: Name or ID of the model developer

    Returns:
        The version number of the registered model
    """

    # Register the model in the registry
    # This creates a new version if the model already exists
    model_version = mlflow.register_model(
        model_uri=model_uri,
        name=model_name
    )

    # Add essential metadata as tags
    # These tags will be used during the approval process
    client.set_model_version_tag(
        name=model_name,
        version=model_version.version,
        key="author",
        value=author
    )

    client.set_model_version_tag(
        name=model_name,
        version=model_version.version,
        key="registration_timestamp",
        value=datetime.utcnow().isoformat()
    )

    client.set_model_version_tag(
        name=model_name,
        version=model_version.version,
        key="training_metrics",
        value=json.dumps(training_metrics)
    )

    client.set_model_version_tag(
        name=model_name,
        version=model_version.version,
        key="data_lineage",
        value=json.dumps(data_lineage)
    )

    # Set the initial stage to "None" (pending approval)
    client.set_model_version_tag(
        name=model_name,
        version=model_version.version,
        key="approval_status",
        value="pending_validation"
    )

    print(f"Model '{model_name}' version {model_version.version} registered successfully")
    return model_version.version


# Example usage
if __name__ == "__main__":
    # After training your model, register it
    version = register_model_for_approval(
        model_uri="runs:/abc123/model",
        model_name="fraud_detection_model",
        training_metrics={
            "accuracy": 0.94,
            "precision": 0.91,
            "recall": 0.89,
            "f1_score": 0.90,
            "auc_roc": 0.96
        },
        data_lineage={
            "training_dataset": "s3://data-lake/fraud/train_2025.parquet",
            "validation_dataset": "s3://data-lake/fraud/val_2025.parquet",
            "feature_store_version": "v2.3.1",
            "data_snapshot_date": "2025-12-15"
        },
        author="data_science_team"
    )
```

## Implementing Approval Gates

Approval gates are checkpoints where specific criteria must be met before a model can advance. Let us implement a comprehensive approval gate system.

### Approval Gate Architecture

```mermaid
flowchart LR
    subgraph Gate1[Validation Gate]
        V1[Unit Tests]
        V2[Performance Tests]
        V3[Bias Detection]
    end

    subgraph Gate2[Technical Gate]
        T1[Code Review]
        T2[Architecture Review]
        T3[Security Scan]
    end

    subgraph Gate3[Business Gate]
        B1[Impact Analysis]
        B2[Cost Review]
        B3[Stakeholder Approval]
    end

    subgraph Gate4[Compliance Gate]
        C1[Data Privacy Check]
        C2[Regulatory Review]
        C3[Documentation Audit]
    end

    Gate1 --> Gate2 --> Gate3 --> Gate4
```

### Automated Validation Gate Implementation

```python
"""
Automated Validation Gate
This module implements automated checks that run before human review.
"""

import mlflow
from mlflow.tracking import MlflowClient
from typing import Dict, List, Tuple
import numpy as np
from dataclasses import dataclass
from enum import Enum
import json

class ValidationStatus(Enum):
    """Possible outcomes of a validation check."""
    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"


@dataclass
class ValidationResult:
    """Container for validation check results."""
    check_name: str
    status: ValidationStatus
    message: str
    details: dict


class AutomatedValidationGate:
    """
    Automated validation gate for ML models.

    This gate runs a series of automated checks on a model
    before it can proceed to human review stages.
    """

    def __init__(self, model_name: str, model_version: str):
        """
        Initialize the validation gate.

        Args:
            model_name: Name of the model in the registry
            model_version: Version number to validate
        """
        self.client = MlflowClient()
        self.model_name = model_name
        self.model_version = model_version
        self.results: List[ValidationResult] = []

        # Load model metadata for validation
        self.model_info = self.client.get_model_version(
            name=model_name,
            version=model_version
        )

    def check_performance_thresholds(
        self,
        thresholds: Dict[str, float]
    ) -> ValidationResult:
        """
        Verify that model metrics meet minimum thresholds.

        Args:
            thresholds: Dictionary of metric names and minimum values

        Returns:
            ValidationResult with pass/fail status
        """
        # Retrieve training metrics from model tags
        metrics_tag = self.client.get_model_version_tag(
            name=self.model_name,
            version=self.model_version,
            key="training_metrics"
        )

        if not metrics_tag:
            return ValidationResult(
                check_name="performance_thresholds",
                status=ValidationStatus.FAILED,
                message="No training metrics found",
                details={}
            )

        metrics = json.loads(metrics_tag.value)
        failed_metrics = []

        # Compare each metric against its threshold
        for metric_name, min_value in thresholds.items():
            if metric_name in metrics:
                if metrics[metric_name] < min_value:
                    failed_metrics.append({
                        "metric": metric_name,
                        "actual": metrics[metric_name],
                        "required": min_value
                    })

        if failed_metrics:
            return ValidationResult(
                check_name="performance_thresholds",
                status=ValidationStatus.FAILED,
                message=f"{len(failed_metrics)} metrics below threshold",
                details={"failed_metrics": failed_metrics}
            )

        return ValidationResult(
            check_name="performance_thresholds",
            status=ValidationStatus.PASSED,
            message="All metrics meet thresholds",
            details={"metrics": metrics, "thresholds": thresholds}
        )

    def check_bias_metrics(
        self,
        sensitive_attributes: List[str],
        max_disparity: float = 0.1
    ) -> ValidationResult:
        """
        Check for bias across sensitive attributes.

        Args:
            sensitive_attributes: List of attributes to check for bias
            max_disparity: Maximum allowed disparity ratio

        Returns:
            ValidationResult with bias analysis
        """
        # In practice, you would load test predictions and compute
        # fairness metrics like demographic parity, equalized odds, etc.

        # This is a simplified example
        bias_results = {}
        has_bias_issues = False

        for attribute in sensitive_attributes:
            # Simulated bias check (replace with actual computation)
            # In production, compute metrics like:
            # - Demographic Parity Difference
            # - Equal Opportunity Difference
            # - Disparate Impact Ratio
            disparity = np.random.uniform(0, 0.15)  # Placeholder

            bias_results[attribute] = {
                "disparity_ratio": disparity,
                "passes_threshold": disparity <= max_disparity
            }

            if disparity > max_disparity:
                has_bias_issues = True

        if has_bias_issues:
            return ValidationResult(
                check_name="bias_detection",
                status=ValidationStatus.WARNING,
                message="Potential bias detected in some attributes",
                details=bias_results
            )

        return ValidationResult(
            check_name="bias_detection",
            status=ValidationStatus.PASSED,
            message="No significant bias detected",
            details=bias_results
        )

    def check_model_size(self, max_size_mb: float = 500) -> ValidationResult:
        """
        Verify model artifact size is within acceptable limits.

        Args:
            max_size_mb: Maximum allowed model size in megabytes

        Returns:
            ValidationResult with size information
        """
        # Get model artifact size from run info
        run_id = self.model_info.run_id
        run = self.client.get_run(run_id)

        # Retrieve artifact size (simplified; actual implementation
        # would download and measure or use artifact metadata)
        artifact_size_mb = 150  # Placeholder value

        if artifact_size_mb > max_size_mb:
            return ValidationResult(
                check_name="model_size",
                status=ValidationStatus.FAILED,
                message=f"Model size {artifact_size_mb}MB exceeds limit {max_size_mb}MB",
                details={"size_mb": artifact_size_mb, "limit_mb": max_size_mb}
            )

        return ValidationResult(
            check_name="model_size",
            status=ValidationStatus.PASSED,
            message=f"Model size {artifact_size_mb}MB within limit",
            details={"size_mb": artifact_size_mb, "limit_mb": max_size_mb}
        )

    def run_all_checks(self, config: dict) -> Tuple[bool, List[ValidationResult]]:
        """
        Execute all validation checks.

        Args:
            config: Configuration dictionary with thresholds and parameters

        Returns:
            Tuple of (all_passed, list_of_results)
        """
        results = []

        # Run performance threshold check
        results.append(self.check_performance_thresholds(
            thresholds=config.get("performance_thresholds", {
                "accuracy": 0.85,
                "precision": 0.80,
                "recall": 0.80
            })
        ))

        # Run bias detection check
        results.append(self.check_bias_metrics(
            sensitive_attributes=config.get("sensitive_attributes", [
                "gender", "age_group", "ethnicity"
            ]),
            max_disparity=config.get("max_bias_disparity", 0.1)
        ))

        # Run model size check
        results.append(self.check_model_size(
            max_size_mb=config.get("max_model_size_mb", 500)
        ))

        # Determine overall pass/fail
        all_passed = all(
            r.status != ValidationStatus.FAILED for r in results
        )

        # Update model tags with validation results
        self._record_validation_results(results, all_passed)

        return all_passed, results

    def _record_validation_results(
        self,
        results: List[ValidationResult],
        all_passed: bool
    ):
        """Record validation results as model tags for audit trail."""
        from datetime import datetime

        # Store summary of validation run
        validation_summary = {
            "timestamp": datetime.utcnow().isoformat(),
            "overall_status": "passed" if all_passed else "failed",
            "checks": [
                {
                    "name": r.check_name,
                    "status": r.status.value,
                    "message": r.message
                }
                for r in results
            ]
        }

        self.client.set_model_version_tag(
            name=self.model_name,
            version=self.model_version,
            key="validation_results",
            value=json.dumps(validation_summary)
        )

        # Update approval status
        new_status = "pending_technical_review" if all_passed else "validation_failed"
        self.client.set_model_version_tag(
            name=self.model_name,
            version=self.model_version,
            key="approval_status",
            value=new_status
        )


# Example usage
if __name__ == "__main__":
    gate = AutomatedValidationGate(
        model_name="fraud_detection_model",
        model_version="3"
    )

    config = {
        "performance_thresholds": {
            "accuracy": 0.90,
            "precision": 0.85,
            "recall": 0.85,
            "auc_roc": 0.92
        },
        "sensitive_attributes": ["gender", "age_group"],
        "max_bias_disparity": 0.1,
        "max_model_size_mb": 500
    }

    passed, results = gate.run_all_checks(config)

    print(f"\nValidation {'PASSED' if passed else 'FAILED'}")
    for result in results:
        print(f"  {result.check_name}: {result.status.value} - {result.message}")
```

## Stakeholder Sign-off System

Human approvals are essential for high-stakes decisions. Here is an implementation of a stakeholder sign-off system.

### Sign-off Workflow Diagram

```mermaid
sequenceDiagram
    participant DS as Data Scientist
    participant SYS as Approval System
    participant TR as Technical Reviewer
    participant BR as Business Reviewer
    participant CR as Compliance Reviewer
    participant REG as Model Registry

    DS->>SYS: Submit model for approval
    SYS->>SYS: Run automated validation
    SYS->>TR: Request technical review
    TR->>SYS: Submit technical approval
    SYS->>BR: Request business review
    BR->>SYS: Submit business approval
    SYS->>CR: Request compliance review
    CR->>SYS: Submit compliance approval
    SYS->>REG: Transition model to Production
    REG->>DS: Notify deployment complete
```

### Sign-off Implementation

```python
"""
Stakeholder Sign-off System
Manages human approvals for model promotion.
"""

import mlflow
from mlflow.tracking import MlflowClient
from datetime import datetime
from typing import Optional, List
from dataclasses import dataclass
from enum import Enum
import json
import hashlib


class ApprovalStage(Enum):
    """Stages in the approval workflow."""
    VALIDATION = "validation"
    TECHNICAL_REVIEW = "technical_review"
    BUSINESS_REVIEW = "business_review"
    COMPLIANCE_REVIEW = "compliance_review"
    APPROVED = "approved"
    REJECTED = "rejected"


class ApprovalDecision(Enum):
    """Possible decisions for an approval request."""
    APPROVE = "approve"
    REJECT = "reject"
    REQUEST_CHANGES = "request_changes"


@dataclass
class ApprovalRequest:
    """Represents a request for stakeholder approval."""
    request_id: str
    model_name: str
    model_version: str
    stage: ApprovalStage
    requested_by: str
    requested_at: datetime
    approvers: List[str]
    comments: Optional[str] = None


@dataclass
class ApprovalRecord:
    """Records a stakeholder's approval decision."""
    request_id: str
    approver_id: str
    approver_name: str
    decision: ApprovalDecision
    timestamp: datetime
    comments: str
    signature_hash: str


class StakeholderApprovalSystem:
    """
    Manages stakeholder sign-offs for model approvals.

    This system tracks approval requests, collects decisions,
    and maintains an audit trail of all actions.
    """

    def __init__(self, model_name: str, model_version: str):
        """
        Initialize the approval system for a specific model version.

        Args:
            model_name: Name of the model in the registry
            model_version: Version number being reviewed
        """
        self.client = MlflowClient()
        self.model_name = model_name
        self.model_version = model_version

        # Define required approvers for each stage
        # In production, this would come from a configuration system
        self.stage_approvers = {
            ApprovalStage.TECHNICAL_REVIEW: ["ml_engineer", "ml_architect"],
            ApprovalStage.BUSINESS_REVIEW: ["product_owner", "business_analyst"],
            ApprovalStage.COMPLIANCE_REVIEW: ["compliance_officer", "legal_reviewer"]
        }

    def create_approval_request(
        self,
        stage: ApprovalStage,
        requested_by: str,
        comments: Optional[str] = None
    ) -> ApprovalRequest:
        """
        Create a new approval request for the specified stage.

        Args:
            stage: The approval stage being requested
            requested_by: ID of the person requesting approval
            comments: Optional context for reviewers

        Returns:
            ApprovalRequest object with unique ID
        """
        # Generate unique request ID
        request_id = hashlib.sha256(
            f"{self.model_name}-{self.model_version}-{stage.value}-{datetime.utcnow().isoformat()}".encode()
        ).hexdigest()[:12]

        request = ApprovalRequest(
            request_id=request_id,
            model_name=self.model_name,
            model_version=self.model_version,
            stage=stage,
            requested_by=requested_by,
            requested_at=datetime.utcnow(),
            approvers=self.stage_approvers.get(stage, []),
            comments=comments
        )

        # Store request in model tags
        self._store_approval_request(request)

        # Send notifications to approvers (in production, integrate with
        # email, Slack, or your notification system)
        self._notify_approvers(request)

        return request

    def submit_approval(
        self,
        request_id: str,
        approver_id: str,
        approver_name: str,
        decision: ApprovalDecision,
        comments: str
    ) -> ApprovalRecord:
        """
        Submit an approval decision from a stakeholder.

        Args:
            request_id: ID of the approval request
            approver_id: Unique identifier of the approver
            approver_name: Display name of the approver
            decision: The approval decision
            comments: Required explanation for the decision

        Returns:
            ApprovalRecord documenting the decision
        """
        # Generate signature hash for audit integrity
        # In production, use proper digital signatures
        signature_data = f"{request_id}-{approver_id}-{decision.value}-{datetime.utcnow().isoformat()}"
        signature_hash = hashlib.sha256(signature_data.encode()).hexdigest()

        record = ApprovalRecord(
            request_id=request_id,
            approver_id=approver_id,
            approver_name=approver_name,
            decision=decision,
            timestamp=datetime.utcnow(),
            comments=comments,
            signature_hash=signature_hash
        )

        # Store the approval record
        self._store_approval_record(record)

        # Check if all required approvals are collected
        self._check_stage_completion(request_id)

        return record

    def _store_approval_request(self, request: ApprovalRequest):
        """Store approval request in model tags."""
        request_data = {
            "request_id": request.request_id,
            "stage": request.stage.value,
            "requested_by": request.requested_by,
            "requested_at": request.requested_at.isoformat(),
            "approvers": request.approvers,
            "comments": request.comments,
            "status": "pending"
        }

        # Retrieve existing requests or create new list
        existing_tag = self.client.get_model_version_tag(
            name=self.model_name,
            version=self.model_version,
            key="approval_requests"
        )

        if existing_tag:
            requests = json.loads(existing_tag.value)
        else:
            requests = []

        requests.append(request_data)

        self.client.set_model_version_tag(
            name=self.model_name,
            version=self.model_version,
            key="approval_requests",
            value=json.dumps(requests)
        )

    def _store_approval_record(self, record: ApprovalRecord):
        """Store approval record for audit trail."""
        record_data = {
            "request_id": record.request_id,
            "approver_id": record.approver_id,
            "approver_name": record.approver_name,
            "decision": record.decision.value,
            "timestamp": record.timestamp.isoformat(),
            "comments": record.comments,
            "signature_hash": record.signature_hash
        }

        # Retrieve existing records or create new list
        existing_tag = self.client.get_model_version_tag(
            name=self.model_name,
            version=self.model_version,
            key="approval_records"
        )

        if existing_tag:
            records = json.loads(existing_tag.value)
        else:
            records = []

        records.append(record_data)

        self.client.set_model_version_tag(
            name=self.model_name,
            version=self.model_version,
            key="approval_records",
            value=json.dumps(records)
        )

    def _check_stage_completion(self, request_id: str):
        """
        Check if all required approvals for a stage are collected.
        If complete, advance the model to the next stage.
        """
        # Get all approval records
        records_tag = self.client.get_model_version_tag(
            name=self.model_name,
            version=self.model_version,
            key="approval_records"
        )

        if not records_tag:
            return

        records = json.loads(records_tag.value)
        request_records = [r for r in records if r["request_id"] == request_id]

        # Check for any rejections
        rejections = [r for r in request_records if r["decision"] == "reject"]
        if rejections:
            self._update_model_status(ApprovalStage.REJECTED)
            return

        # Get request details
        requests_tag = self.client.get_model_version_tag(
            name=self.model_name,
            version=self.model_version,
            key="approval_requests"
        )

        if requests_tag:
            requests = json.loads(requests_tag.value)
            current_request = next(
                (r for r in requests if r["request_id"] == request_id),
                None
            )

            if current_request:
                required_approvers = set(current_request["approvers"])
                approved_by = set(
                    r["approver_id"] for r in request_records
                    if r["decision"] == "approve"
                )

                # All required approvals collected
                if required_approvers.issubset(approved_by):
                    current_stage = ApprovalStage(current_request["stage"])
                    self._advance_to_next_stage(current_stage)

    def _advance_to_next_stage(self, completed_stage: ApprovalStage):
        """Advance the model to the next approval stage."""
        stage_order = [
            ApprovalStage.TECHNICAL_REVIEW,
            ApprovalStage.BUSINESS_REVIEW,
            ApprovalStage.COMPLIANCE_REVIEW,
            ApprovalStage.APPROVED
        ]

        try:
            current_index = stage_order.index(completed_stage)
            next_stage = stage_order[current_index + 1]
            self._update_model_status(next_stage)

            # If fully approved, transition model to Production
            if next_stage == ApprovalStage.APPROVED:
                self._transition_to_production()

        except (ValueError, IndexError):
            pass

    def _update_model_status(self, stage: ApprovalStage):
        """Update the model's approval status."""
        self.client.set_model_version_tag(
            name=self.model_name,
            version=self.model_version,
            key="approval_status",
            value=stage.value
        )

    def _transition_to_production(self):
        """
        Transition the model to Production stage in MLflow.
        This is the final step after all approvals are collected.
        """
        self.client.transition_model_version_stage(
            name=self.model_name,
            version=self.model_version,
            stage="Production",
            archive_existing_versions=True
        )

        # Record the transition timestamp
        self.client.set_model_version_tag(
            name=self.model_name,
            version=self.model_version,
            key="production_deployment_timestamp",
            value=datetime.utcnow().isoformat()
        )

    def _notify_approvers(self, request: ApprovalRequest):
        """
        Send notifications to required approvers.
        In production, integrate with your notification system.
        """
        # Placeholder for notification logic
        # Integrate with Slack, email, PagerDuty, etc.
        print(f"Notification sent to: {request.approvers}")
        print(f"Model: {request.model_name} v{request.model_version}")
        print(f"Stage: {request.stage.value}")
        print(f"Requested by: {request.requested_by}")


# Example usage
if __name__ == "__main__":
    # Initialize the approval system
    approval_system = StakeholderApprovalSystem(
        model_name="fraud_detection_model",
        model_version="3"
    )

    # Create a technical review request
    request = approval_system.create_approval_request(
        stage=ApprovalStage.TECHNICAL_REVIEW,
        requested_by="data_scientist_alice",
        comments="Model shows 5% improvement over baseline. Ready for review."
    )

    print(f"Created approval request: {request.request_id}")

    # Simulate approvals from required reviewers
    approval_system.submit_approval(
        request_id=request.request_id,
        approver_id="ml_engineer",
        approver_name="Bob Smith",
        decision=ApprovalDecision.APPROVE,
        comments="Code quality looks good. Tests pass. Approved."
    )

    approval_system.submit_approval(
        request_id=request.request_id,
        approver_id="ml_architect",
        approver_name="Carol Johnson",
        decision=ApprovalDecision.APPROVE,
        comments="Architecture review complete. No concerns."
    )
```

## Implementing with Amazon SageMaker

SageMaker provides native support for model approval workflows through SageMaker Model Registry and Pipelines.

### SageMaker Model Package Group Setup

```python
"""
Amazon SageMaker Model Approval Workflow
Demonstrates approval workflows using SageMaker Model Registry.
"""

import boto3
from datetime import datetime
import json
from typing import Dict, List, Optional

# Initialize SageMaker client
sagemaker_client = boto3.client("sagemaker")


def create_model_package_group(
    group_name: str,
    description: str,
    tags: List[Dict[str, str]]
) -> str:
    """
    Create a Model Package Group to organize model versions.

    Args:
        group_name: Unique name for the model package group
        description: Description of the model group
        tags: List of tag dictionaries for organization

    Returns:
        ARN of the created model package group
    """
    response = sagemaker_client.create_model_package_group(
        ModelPackageGroupName=group_name,
        ModelPackageGroupDescription=description,
        Tags=tags
    )

    print(f"Created Model Package Group: {response['ModelPackageGroupArn']}")
    return response["ModelPackageGroupArn"]


def register_model_with_approval(
    model_package_group_name: str,
    model_url: str,
    image_uri: str,
    approval_status: str = "PendingManualApproval",
    model_metrics: Optional[Dict] = None,
    description: str = ""
) -> str:
    """
    Register a model version with approval workflow enabled.

    Args:
        model_package_group_name: Name of the model package group
        model_url: S3 path to the model artifacts
        image_uri: ECR URI for the inference container
        approval_status: Initial approval status
        model_metrics: Dictionary of model evaluation metrics
        description: Description of this model version

    Returns:
        ARN of the registered model package
    """
    # Prepare model metrics in SageMaker format
    model_metrics_spec = None
    if model_metrics:
        model_metrics_spec = {
            "ModelQuality": {
                "Statistics": {
                    "ContentType": "application/json",
                    "S3Uri": model_metrics.get("quality_report_s3_uri", "")
                }
            },
            "Bias": {
                "Report": {
                    "ContentType": "application/json",
                    "S3Uri": model_metrics.get("bias_report_s3_uri", "")
                }
            },
            "Explainability": {
                "Report": {
                    "ContentType": "application/json",
                    "S3Uri": model_metrics.get("explainability_report_s3_uri", "")
                }
            }
        }

    # Define inference specification
    inference_spec = {
        "Containers": [
            {
                "Image": image_uri,
                "ModelDataUrl": model_url
            }
        ],
        "SupportedContentTypes": ["application/json"],
        "SupportedResponseMIMETypes": ["application/json"]
    }

    # Create model package with pending approval status
    create_params = {
        "ModelPackageGroupName": model_package_group_name,
        "ModelPackageDescription": description,
        "InferenceSpecification": inference_spec,
        "ModelApprovalStatus": approval_status,
        "CustomerMetadataProperties": {
            "registered_at": datetime.utcnow().isoformat(),
            "approval_workflow_version": "1.0"
        }
    }

    if model_metrics_spec:
        create_params["ModelMetrics"] = model_metrics_spec

    response = sagemaker_client.create_model_package(**create_params)

    model_package_arn = response["ModelPackageArn"]
    print(f"Registered model package: {model_package_arn}")
    print(f"Approval status: {approval_status}")

    return model_package_arn


def approve_model_package(
    model_package_arn: str,
    approval_status: str,
    approver: str,
    approval_description: str
) -> None:
    """
    Update the approval status of a model package.

    Args:
        model_package_arn: ARN of the model package
        approval_status: New status (Approved/Rejected/PendingManualApproval)
        approver: Name or ID of the person approving
        approval_description: Reason for the approval decision
    """
    # Update the model package approval status
    sagemaker_client.update_model_package(
        ModelPackageArn=model_package_arn,
        ModelApprovalStatus=approval_status,
        ApprovalDescription=approval_description,
        CustomerMetadataProperties={
            "approved_by": approver,
            "approval_timestamp": datetime.utcnow().isoformat(),
            "approval_reason": approval_description
        }
    )

    print(f"Model package {model_package_arn}")
    print(f"  Status updated to: {approval_status}")
    print(f"  Approved by: {approver}")
    print(f"  Reason: {approval_description}")


def get_model_approval_history(
    model_package_group_name: str
) -> List[Dict]:
    """
    Retrieve approval history for all versions in a model package group.

    Args:
        model_package_group_name: Name of the model package group

    Returns:
        List of model packages with their approval information
    """
    # List all model packages in the group
    response = sagemaker_client.list_model_packages(
        ModelPackageGroupName=model_package_group_name,
        SortBy="CreationTime",
        SortOrder="Descending"
    )

    approval_history = []

    for package_summary in response["ModelPackageSummaryList"]:
        # Get detailed information for each package
        package_details = sagemaker_client.describe_model_package(
            ModelPackageName=package_summary["ModelPackageArn"]
        )

        approval_history.append({
            "model_package_arn": package_summary["ModelPackageArn"],
            "version": package_summary.get("ModelPackageVersion", "N/A"),
            "approval_status": package_details["ModelApprovalStatus"],
            "approval_description": package_details.get("ApprovalDescription", ""),
            "created_at": package_summary["CreationTime"].isoformat(),
            "metadata": package_details.get("CustomerMetadataProperties", {})
        })

    return approval_history


# Example usage
if __name__ == "__main__":
    # Create a model package group
    group_arn = create_model_package_group(
        group_name="fraud-detection-models",
        description="Production fraud detection models",
        tags=[
            {"Key": "team", "Value": "ml-platform"},
            {"Key": "domain", "Value": "fraud-detection"}
        ]
    )

    # Register a new model version pending approval
    model_arn = register_model_with_approval(
        model_package_group_name="fraud-detection-models",
        model_url="s3://my-bucket/models/fraud-v3/model.tar.gz",
        image_uri="123456789.dkr.ecr.us-east-1.amazonaws.com/fraud-inference:latest",
        approval_status="PendingManualApproval",
        model_metrics={
            "quality_report_s3_uri": "s3://my-bucket/metrics/quality.json",
            "bias_report_s3_uri": "s3://my-bucket/metrics/bias.json",
            "explainability_report_s3_uri": "s3://my-bucket/metrics/explainability.json"
        },
        description="Fraud detection model v3 with improved recall"
    )

    # Approve the model after review
    approve_model_package(
        model_package_arn=model_arn,
        approval_status="Approved",
        approver="ml_architect_carol",
        approval_description="Model meets all quality thresholds. Bias metrics acceptable. Approved for production deployment."
    )

    # View approval history
    history = get_model_approval_history("fraud-detection-models")
    for entry in history:
        print(f"\nVersion: {entry['version']}")
        print(f"  Status: {entry['approval_status']}")
        print(f"  Created: {entry['created_at']}")
```

## Comprehensive Audit Trail Implementation

Maintaining detailed audit trails is critical for compliance and debugging. Here is a robust audit logging system.

### Audit Trail Architecture

```mermaid
flowchart TD
    subgraph Events[Audit Events]
        E1[Model Registration]
        E2[Validation Results]
        E3[Approval Decisions]
        E4[Stage Transitions]
        E5[Deployments]
    end

    subgraph Storage[Audit Storage]
        S1[(Primary Database)]
        S2[(Backup Storage)]
        S3[(Compliance Archive)]
    end

    subgraph Access[Audit Access]
        A1[Dashboard]
        A2[API Queries]
        A3[Compliance Reports]
    end

    Events --> S1
    S1 --> S2
    S1 --> S3
    S1 --> Access
```

### Audit Logger Implementation

```python
"""
Model Approval Audit Trail System
Comprehensive logging for compliance and debugging.
"""

import json
import hashlib
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum
import boto3


class AuditEventType(Enum):
    """Types of events tracked in the audit trail."""
    MODEL_REGISTERED = "model_registered"
    VALIDATION_STARTED = "validation_started"
    VALIDATION_COMPLETED = "validation_completed"
    APPROVAL_REQUESTED = "approval_requested"
    APPROVAL_SUBMITTED = "approval_submitted"
    STAGE_TRANSITION = "stage_transition"
    DEPLOYMENT_STARTED = "deployment_started"
    DEPLOYMENT_COMPLETED = "deployment_completed"
    ROLLBACK_INITIATED = "rollback_initiated"
    ACCESS_GRANTED = "access_granted"
    ACCESS_REVOKED = "access_revoked"


@dataclass
class AuditEvent:
    """
    Immutable audit event record.

    Each event captures a single action in the model lifecycle
    with full context for compliance and debugging.
    """
    event_id: str
    event_type: str
    timestamp: str
    model_name: str
    model_version: str
    actor_id: str
    actor_name: str
    action_details: Dict[str, Any]
    previous_state: Optional[Dict[str, Any]]
    new_state: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    integrity_hash: str


class AuditLogger:
    """
    Centralized audit logging for model approval workflows.

    Provides tamper-evident logging with integrity verification,
    supporting compliance requirements for SOX, HIPAA, and GDPR.
    """

    def __init__(
        self,
        storage_table: str = "model_audit_trail",
        region: str = "us-east-1"
    ):
        """
        Initialize the audit logger.

        Args:
            storage_table: DynamoDB table name for audit storage
            region: AWS region for DynamoDB
        """
        self.dynamodb = boto3.resource("dynamodb", region_name=region)
        self.table = self.dynamodb.Table(storage_table)
        self.previous_hash = None

    def _generate_integrity_hash(
        self,
        event_data: Dict[str, Any],
        previous_hash: Optional[str]
    ) -> str:
        """
        Generate a hash that chains events for tamper detection.

        Args:
            event_data: The event data to hash
            previous_hash: Hash of the previous event (for chaining)

        Returns:
            SHA-256 hash of the event data
        """
        # Include previous hash in chain (blockchain-style)
        hash_input = json.dumps(event_data, sort_keys=True)
        if previous_hash:
            hash_input = previous_hash + hash_input

        return hashlib.sha256(hash_input.encode()).hexdigest()

    def log_event(
        self,
        event_type: AuditEventType,
        model_name: str,
        model_version: str,
        actor_id: str,
        actor_name: str,
        action_details: Dict[str, Any],
        previous_state: Optional[Dict[str, Any]] = None,
        new_state: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditEvent:
        """
        Log an audit event with full context.

        Args:
            event_type: Type of event being logged
            model_name: Name of the model
            model_version: Version of the model
            actor_id: Unique identifier of the person/system taking action
            actor_name: Display name of the actor
            action_details: Specific details about the action
            previous_state: State before the action (if applicable)
            new_state: State after the action (if applicable)
            ip_address: IP address of the actor (if available)
            user_agent: Browser/client information (if available)

        Returns:
            The created AuditEvent record
        """
        event_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat() + "Z"

        # Prepare event data for hashing
        event_data = {
            "event_id": event_id,
            "event_type": event_type.value,
            "timestamp": timestamp,
            "model_name": model_name,
            "model_version": model_version,
            "actor_id": actor_id,
            "action_details": action_details
        }

        # Generate integrity hash with chaining
        integrity_hash = self._generate_integrity_hash(
            event_data,
            self.previous_hash
        )

        # Create the audit event
        event = AuditEvent(
            event_id=event_id,
            event_type=event_type.value,
            timestamp=timestamp,
            model_name=model_name,
            model_version=model_version,
            actor_id=actor_id,
            actor_name=actor_name,
            action_details=action_details,
            previous_state=previous_state,
            new_state=new_state,
            ip_address=ip_address,
            user_agent=user_agent,
            integrity_hash=integrity_hash
        )

        # Store the event
        self._persist_event(event)

        # Update hash chain
        self.previous_hash = integrity_hash

        return event

    def _persist_event(self, event: AuditEvent):
        """
        Persist the audit event to DynamoDB.

        In production, you might also write to:
        - S3 for long-term archival
        - CloudWatch Logs for real-time monitoring
        - A separate compliance database
        """
        # Convert to dictionary for storage
        event_dict = asdict(event)

        # Convert nested dicts to JSON strings for DynamoDB
        event_dict["action_details"] = json.dumps(event_dict["action_details"])
        if event_dict["previous_state"]:
            event_dict["previous_state"] = json.dumps(event_dict["previous_state"])
        if event_dict["new_state"]:
            event_dict["new_state"] = json.dumps(event_dict["new_state"])

        # Store in DynamoDB
        self.table.put_item(Item=event_dict)

    def get_model_audit_trail(
        self,
        model_name: str,
        model_version: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> List[AuditEvent]:
        """
        Retrieve audit trail for a specific model.

        Args:
            model_name: Name of the model
            model_version: Specific version (optional)
            start_time: Filter events after this time
            end_time: Filter events before this time

        Returns:
            List of AuditEvent records
        """
        # Build query parameters
        key_condition = "model_name = :model_name"
        expression_values = {":model_name": model_name}

        if model_version:
            key_condition += " AND model_version = :version"
            expression_values[":version"] = model_version

        # Query DynamoDB
        response = self.table.query(
            KeyConditionExpression=key_condition,
            ExpressionAttributeValues=expression_values,
            ScanIndexForward=True  # Chronological order
        )

        events = []
        for item in response["Items"]:
            # Parse JSON fields back to dicts
            item["action_details"] = json.loads(item["action_details"])
            if item.get("previous_state"):
                item["previous_state"] = json.loads(item["previous_state"])
            if item.get("new_state"):
                item["new_state"] = json.loads(item["new_state"])

            events.append(AuditEvent(**item))

        # Apply time filters if specified
        if start_time:
            events = [e for e in events if e.timestamp >= start_time.isoformat()]
        if end_time:
            events = [e for e in events if e.timestamp <= end_time.isoformat()]

        return events

    def verify_audit_integrity(
        self,
        model_name: str,
        model_version: str
    ) -> bool:
        """
        Verify the integrity of the audit trail.

        Checks that no events have been tampered with by
        verifying the hash chain.

        Args:
            model_name: Name of the model
            model_version: Version to verify

        Returns:
            True if integrity is verified, False otherwise
        """
        events = self.get_model_audit_trail(model_name, model_version)

        if not events:
            return True

        previous_hash = None

        for event in events:
            # Reconstruct the hash
            event_data = {
                "event_id": event.event_id,
                "event_type": event.event_type,
                "timestamp": event.timestamp,
                "model_name": event.model_name,
                "model_version": event.model_version,
                "actor_id": event.actor_id,
                "action_details": event.action_details
            }

            expected_hash = self._generate_integrity_hash(event_data, previous_hash)

            if expected_hash != event.integrity_hash:
                print(f"Integrity violation detected at event {event.event_id}")
                return False

            previous_hash = event.integrity_hash

        return True

    def generate_compliance_report(
        self,
        model_name: str,
        model_version: str
    ) -> Dict[str, Any]:
        """
        Generate a compliance report for regulatory review.

        Args:
            model_name: Name of the model
            model_version: Version to report on

        Returns:
            Comprehensive report dictionary
        """
        events = self.get_model_audit_trail(model_name, model_version)

        report = {
            "report_generated_at": datetime.utcnow().isoformat(),
            "model_name": model_name,
            "model_version": model_version,
            "total_events": len(events),
            "integrity_verified": self.verify_audit_integrity(
                model_name, model_version
            ),
            "timeline": [],
            "approvals": [],
            "stakeholders_involved": set()
        }

        for event in events:
            # Build timeline
            report["timeline"].append({
                "timestamp": event.timestamp,
                "event_type": event.event_type,
                "actor": event.actor_name,
                "summary": self._summarize_event(event)
            })

            # Track approvals
            if "approval" in event.event_type.lower():
                report["approvals"].append({
                    "timestamp": event.timestamp,
                    "approver": event.actor_name,
                    "decision": event.action_details.get("decision", "N/A"),
                    "comments": event.action_details.get("comments", "")
                })

            # Track stakeholders
            report["stakeholders_involved"].add(event.actor_name)

        # Convert set to list for JSON serialization
        report["stakeholders_involved"] = list(report["stakeholders_involved"])

        return report

    def _summarize_event(self, event: AuditEvent) -> str:
        """Generate a human-readable summary of an event."""
        summaries = {
            "model_registered": f"Model registered by {event.actor_name}",
            "validation_completed": f"Validation completed: {event.action_details.get('status', 'N/A')}",
            "approval_submitted": f"Approval decision: {event.action_details.get('decision', 'N/A')}",
            "stage_transition": f"Transitioned to {event.new_state.get('stage', 'N/A') if event.new_state else 'N/A'}",
            "deployment_completed": f"Deployed to {event.action_details.get('environment', 'N/A')}"
        }

        return summaries.get(
            event.event_type,
            f"{event.event_type} by {event.actor_name}"
        )


# Example usage
if __name__ == "__main__":
    # Initialize audit logger
    audit_logger = AuditLogger(
        storage_table="model_audit_trail",
        region="us-east-1"
    )

    # Log model registration
    audit_logger.log_event(
        event_type=AuditEventType.MODEL_REGISTERED,
        model_name="fraud_detection_model",
        model_version="3",
        actor_id="alice_ds",
        actor_name="Alice Chen",
        action_details={
            "training_run_id": "run_abc123",
            "framework": "scikit-learn",
            "algorithm": "XGBoost"
        },
        new_state={
            "stage": "pending_validation"
        }
    )

    # Log validation completion
    audit_logger.log_event(
        event_type=AuditEventType.VALIDATION_COMPLETED,
        model_name="fraud_detection_model",
        model_version="3",
        actor_id="system",
        actor_name="Automated Validation System",
        action_details={
            "status": "passed",
            "checks_run": 5,
            "checks_passed": 5
        },
        previous_state={"stage": "pending_validation"},
        new_state={"stage": "pending_technical_review"}
    )

    # Log approval
    audit_logger.log_event(
        event_type=AuditEventType.APPROVAL_SUBMITTED,
        model_name="fraud_detection_model",
        model_version="3",
        actor_id="bob_ml_eng",
        actor_name="Bob Smith",
        action_details={
            "decision": "approved",
            "comments": "Model architecture is sound. Performance meets requirements.",
            "review_type": "technical"
        },
        previous_state={"stage": "pending_technical_review"},
        new_state={"stage": "pending_business_review"}
    )

    # Generate compliance report
    report = audit_logger.generate_compliance_report(
        model_name="fraud_detection_model",
        model_version="3"
    )

    print("\n=== Compliance Report ===")
    print(json.dumps(report, indent=2, default=str))
```

## Best Practices

### 1. Define Clear Approval Criteria

Document specific, measurable criteria for each approval stage:

| Stage | Criteria | Threshold |
|-------|----------|-----------|
| Validation | Accuracy | >= 90% |
| Validation | Latency (p99) | <= 100ms |
| Technical | Code coverage | >= 80% |
| Business | ROI projection | >= 1.2x |
| Compliance | PII handling | Verified |

### 2. Implement Timeout Policies

```python
"""
Timeout Policy Configuration
Prevents models from getting stuck in approval limbo.
"""

APPROVAL_TIMEOUT_DAYS = {
    "technical_review": 3,
    "business_review": 5,
    "compliance_review": 7
}

def check_approval_timeout(request_timestamp: datetime, stage: str) -> bool:
    """
    Check if an approval request has timed out.

    Args:
        request_timestamp: When the request was created
        stage: Current approval stage

    Returns:
        True if the request has timed out
    """
    from datetime import timedelta

    timeout_days = APPROVAL_TIMEOUT_DAYS.get(stage, 5)
    deadline = request_timestamp + timedelta(days=timeout_days)

    return datetime.utcnow() > deadline
```

### 3. Enable Emergency Bypass (with Controls)

For critical situations, provide a controlled bypass mechanism:

```python
def emergency_approval_bypass(
    model_name: str,
    model_version: str,
    emergency_approver: str,
    justification: str,
    ticket_reference: str
) -> None:
    """
    Emergency bypass for critical situations.

    This should only be used in genuine emergencies and
    requires post-hoc review within 24 hours.

    Args:
        model_name: Model to approve
        model_version: Version to approve
        emergency_approver: VP-level approver
        justification: Detailed reason for bypass
        ticket_reference: Incident ticket number
    """
    # Verify emergency approver has bypass authority
    # Log with high visibility
    # Schedule mandatory post-hoc review
    # Send alerts to compliance team
    pass
```

## Conclusion

Building robust model approval workflows is essential for production ML systems. By implementing automated validation gates, structured stakeholder sign-offs, and comprehensive audit trails, you can ensure that only thoroughly vetted models reach production while maintaining compliance with regulatory requirements.

Key takeaways:

1. **Automate where possible**: Use automated validation to catch obvious issues early
2. **Structure human reviews**: Define clear responsibilities and criteria for each approval stage
3. **Maintain audit trails**: Every action should be logged with full context for compliance and debugging
4. **Plan for exceptions**: Have controlled mechanisms for emergency situations
5. **Iterate on your process**: Regularly review and improve your approval workflow based on feedback

The code examples in this guide provide a starting point. Adapt them to your specific requirements, integrating with your existing infrastructure and compliance frameworks.

## Further Reading

- [MLflow Model Registry Documentation](https://mlflow.org/docs/latest/model-registry.html)
- [Amazon SageMaker Model Registry](https://docs.aws.amazon.com/sagemaker/latest/dg/model-registry.html)
- [ML Model Governance Best Practices](https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning)
- [Responsible AI Practices](https://ai.google/responsibilities/responsible-ai-practices/)
